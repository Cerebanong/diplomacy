import OpenAI from 'openai';
import {
  type GameState,
  type PowerId,
  type Order,
  type Message,
  type AiAgent,
  type AiNegotiationResult,
  type NegotiationState,
  type TurnResult,
  type BuildOrder,
  type Unit,
  describePersonality,
  CLASSIC_POWERS,
  orderToNotation,
} from '@diplomacy/shared';
import { getAdjustment, getAvailableBuildLocations } from '../game/adjudicator.js';

interface AiResponse {
  content: string;
  cost: number;
}

interface AiOrdersResult {
  orders: Order[];
  cost: number;
}

export class AiManager {
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        throw new Error('DEEPSEEK_API_KEY environment variable is required');
      }
      this.client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' });
    }
    return this.client;
  }

  private getModelId(model: 'chat' | 'reasoner'): string {
    return model === 'chat'
      ? 'deepseek-chat'
      : 'deepseek-reasoner';
  }

  private estimateCost(model: 'chat' | 'reasoner', inputTokens: number, outputTokens: number): number {
    // Approximate costs per million tokens
    const costs = {
      chat: { input: 0.27, output: 1.10 },
      reasoner: { input: 0.55, output: 2.19 },
    };
    const modelCosts = costs[model];
    return (inputTokens * modelCosts.input + outputTokens * modelCosts.output) / 1_000_000;
  }

  // ── Board State Helpers ──────────────────────────────────────────────

  private getAllUnits(gameState: GameState): Unit[] {
    const units: Unit[] = [];
    for (const power of Object.values(gameState.powers)) {
      units.push(...power.units);
    }
    return units;
  }

  /** List every power's units and supply center count */
  private buildBoardStateSection(gameState: GameState): string {
    const lines: string[] = ['BOARD STATE:'];
    for (const [_powerId, power] of Object.entries(gameState.powers)) {
      if (power.isEliminated) {
        lines.push(`${power.name} — ELIMINATED`);
        continue;
      }
      const unitList = power.units
        .map(u => `${u.type === 'army' ? 'A' : 'F'} ${u.territory}${u.coast ? ` (${u.coast})` : ''}`)
        .join(', ');
      lines.push(`${power.name} (${power.supplyCenters.length} SCs, ${power.units.length} units): ${unitList || 'no units'}`);
    }
    return lines.join('\n');
  }

  /** For each of the AI's units, compute valid destinations */
  private buildAvailableMovesSection(gameState: GameState, power: PowerId): string {
    const powerData = gameState.powers[power];
    const allUnits = this.getAllUnits(gameState);
    const occupiedBy = new Map<string, PowerId>();
    for (const unit of allUnits) {
      occupiedBy.set(unit.territory, unit.power);
    }

    const lines: string[] = ['YOUR UNITS AND AVAILABLE MOVES:'];

    for (const unit of powerData.units) {
      const territory = gameState.territories[unit.territory];
      if (!territory) continue;

      // Determine adjacencies based on unit type and coast
      let adjacencies: string[];
      if (unit.type === 'fleet' && unit.coast && territory.coasts) {
        const coast = territory.coasts.find(c => c.id === unit.coast);
        adjacencies = coast ? coast.adjacencies : territory.adjacencies;
      } else {
        adjacencies = territory.adjacencies;
      }

      // Filter by terrain type
      const validDestinations = adjacencies.filter(adj => {
        const adjTerritory = gameState.territories[adj];
        if (!adjTerritory) return false;
        if (unit.type === 'army') {
          return adjTerritory.type === 'land' || adjTerritory.type === 'coastal';
        } else {
          return adjTerritory.type === 'sea' || adjTerritory.type === 'coastal';
        }
      });

      // Format destinations with annotations
      const destStrings = validDestinations.map(dest => {
        const destTerritory = gameState.territories[dest];
        let label = dest;
        if (destTerritory?.isSupplyCenter) label += '*';
        const occ = occupiedBy.get(dest);
        if (occ && occ !== power) {
          label += `[${CLASSIC_POWERS[occ].name}]`;
        } else if (occ === power) {
          label += '[own]';
        }
        // Note multi-coast destinations for fleets
        if (unit.type === 'fleet' && destTerritory?.coasts && destTerritory.coasts.length > 0) {
          const coastIds = destTerritory.coasts.map(c => c.id).join('/');
          label += `{coast:${coastIds}}`;
        }
        return label;
      });

      const unitLabel = `${unit.type === 'army' ? 'A' : 'F'} ${unit.territory}${unit.coast ? ` (${unit.coast})` : ''}`;
      lines.push(`${unitLabel} → ${destStrings.join(', ')} (or hold)`);
    }

    return lines.join('\n');
  }

  /** Supply center ownership summary */
  private buildSupplyCenterMapSection(gameState: GameState): string {
    const lines: string[] = ['SUPPLY CENTER OWNERSHIP:'];
    const ownedSCs = new Set<string>();

    for (const [_powerId, power] of Object.entries(gameState.powers)) {
      if (power.isEliminated) continue;
      if (power.supplyCenters.length > 0) {
        lines.push(`${power.name} (${power.supplyCenters.length}): ${power.supplyCenters.join(', ')}`);
        for (const sc of power.supplyCenters) ownedSCs.add(sc);
      }
    }

    // Find neutral SCs
    const neutralSCs: string[] = [];
    for (const [tid, territory] of Object.entries(gameState.territories)) {
      if (territory.isSupplyCenter && !ownedSCs.has(tid)) {
        neutralSCs.push(tid);
      }
    }
    if (neutralSCs.length > 0) {
      lines.push(`Neutral (${neutralSCs.length}): ${neutralSCs.join(', ')}`);
    }

    lines.push(`Victory: ${gameState.victoryCondition} supply centers needed`);
    return lines.join('\n');
  }

  /** Format recent turn results */
  private buildPreviousTurnSection(turnHistory: TurnResult[], limit: number): string {
    if (!turnHistory || turnHistory.length === 0) return '';

    const recentTurns = turnHistory.slice(-limit);
    const sections: string[] = [];

    for (const turn of recentTurns) {
      const phaseLabel = turn.phase.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      // Group resolutions by power
      const byPower = new Map<PowerId, string[]>();
      for (const resolution of turn.resolutions) {
        const pow = resolution.order.power;
        if (!byPower.has(pow)) byPower.set(pow, []);
        const notation = orderToNotation(resolution.order);
        const status = resolution.success ? 'SUCCESS' : `FAILED${resolution.reason ? ` (${resolution.reason})` : ''}`;
        byPower.get(pow)!.push(`${notation} ${status}`);
      }

      const lines: string[] = [`${phaseLabel} ${turn.year}:`];
      for (const [powerId, orderStrs] of byPower) {
        lines.push(`${CLASSIC_POWERS[powerId].name}: ${orderStrs.join(', ')}`);
      }
      sections.push(lines.join('\n'));
    }

    return `PREVIOUS TURNS:\n${sections.join('\n\n')}`;
  }

  /** Full territory adjacency map (reasoner only) */
  private buildAdjacencySection(gameState: GameState): string {
    const lines: string[] = ['TERRITORY MAP:'];

    for (const [tid, territory] of Object.entries(gameState.territories)) {
      const typeLabel = territory.type === 'sea' ? 'sea' : territory.type === 'land' ? 'land' : 'coast';
      const scLabel = territory.isSupplyCenter ? ', SC' : '';
      lines.push(`${tid} (${typeLabel}${scLabel}): ${territory.adjacencies.join(', ')}`);
      if (territory.coasts) {
        for (const coast of territory.coasts) {
          lines.push(`  ${coast.id} (coast): ${coast.adjacencies.join(', ')}`);
        }
      }
    }

    return lines.join('\n');
  }

  /** Static strategic guidance, tiered by model */
  private buildStrategicPrimer(model: 'chat' | 'reasoner'): string {
    const base = `STRATEGIC GUIDE:
- Supports are critical — a lone attack on a defended territory BOUNCES (fails)
- To capture a defended territory: one unit moves in + another unit supports that move = strength 2 vs 1
- To defend: one unit holds + another supports the hold from an adjacent territory
- Cut enemy supports by attacking the supporting unit directly
- Convoys: a fleet in a sea zone can convoy an army across water (fleet convoys, army moves)
- Coordinate your units — don't move them all independently. Combine moves + supports for effectiveness
- An unsupported move into an empty territory always succeeds
- Two unsupported units moving to the same empty territory BOTH bounce`;

    if (model === 'chat') return base;

    return `${base}

ADVANCED TACTICS:
- Bounce tactics: move into a territory you can't hold just to prevent the enemy from taking it
- Cutting support: attack the supporting unit to break its support order (the attack doesn't need to succeed)
- The attack that cuts support must NOT come from the territory the support is targeting
- Self-standoff: order two of your own units to the same territory to ensure neither moves (defensive positioning)
- Opening principles: secure nearby neutral SCs in year 1, build a defensible position before expanding
- Mid-game: form 2-power alliances against a leader, coordinate attacks from multiple directions
- Support can be given to units of any power — even enemies (to manipulate standoffs)
- A dislodged unit cannot retreat to: the territory the attack came from, any occupied territory, or a territory where a standoff occurred that turn`;
  }

  /** Summarize recent negotiation messages involving this power */
  private buildNegotiationContext(
    negotiations: NegotiationState,
    agentPower: PowerId,
    trustScores: Record<PowerId, { score: number }>,
  ): string {
    const lines: string[] = ['RECENT DIPLOMACY:'];
    let hasContent = false;

    for (const [_channelId, channel] of Object.entries(negotiations.channels)) {
      if (!channel.participants.includes(agentPower)) continue;
      const otherPower = channel.participants.find(p => p !== agentPower)!;
      const trust = trustScores[otherPower]?.score ?? 0;

      // Get last 3 messages in this channel
      const recentMsgs = channel.messages.slice(-3);
      if (recentMsgs.length === 0) continue;

      hasContent = true;
      const msgSummary = recentMsgs.map(m => {
        const sender = m.from === agentPower ? 'You' : CLASSIC_POWERS[m.from].name;
        const content = m.content.length > 100 ? m.content.substring(0, 100) + '...' : m.content;
        return `  ${sender}: ${content}`;
      }).join('\n');

      lines.push(`With ${CLASSIC_POWERS[otherPower].name} (trust: ${trust.toFixed(2)}):\n${msgSummary}`);
    }

    return hasContent ? lines.join('\n') : '';
  }

  // ── System Prompt ────────────────────────────────────────────────────

  private buildAgentSystemPrompt(
    agent: AiAgent,
    gameState: GameState,
    model: 'chat' | 'reasoner',
    turnHistory?: TurnResult[],
    negotiations?: NegotiationState,
  ): string {
    const powerName = CLASSIC_POWERS[agent.power].name;

    const sections: string[] = [];

    // 1. Identity + year + phase
    sections.push(`You are playing as ${powerName} in a game of Diplomacy. It is ${gameState.phase.replace(/_/g, ' ')} of ${gameState.year}.`);

    // 2. Personality
    sections.push(`PERSONALITY:\n${describePersonality(agent.personality)}`);

    // 3. Board state
    sections.push(this.buildBoardStateSection(gameState));

    // 4. Supply center map
    sections.push(this.buildSupplyCenterMapSection(gameState));

    // 5. Previous turn results
    if (turnHistory && turnHistory.length > 0) {
      const limit = model === 'reasoner' ? 3 : 1;
      const prevSection = this.buildPreviousTurnSection(turnHistory, limit);
      if (prevSection) sections.push(prevSection);
    }

    // 6. Territory adjacencies (reasoner only)
    if (model === 'reasoner') {
      sections.push(this.buildAdjacencySection(gameState));
    }

    // 7. Strategic primer
    sections.push(this.buildStrategicPrimer(model));

    // 8. Negotiation context
    if (negotiations) {
      const negContext = this.buildNegotiationContext(negotiations, agent.power, agent.trustScores);
      if (negContext) sections.push(negContext);
    }

    // 9. Trust levels
    sections.push(`YOUR TRUST LEVELS:\n${Object.entries(agent.trustScores)
      .map(([p, t]) => `- ${CLASSIC_POWERS[p as PowerId].name}: ${t.score.toFixed(2)}`)
      .join('\n')}`);

    // 10. Memories
    const memoriesText = agent.memory.slice(-5).map(m => `- ${m.year} ${m.phase}: ${m.description}`).join('\n');
    sections.push(`MEMORIES:\n${memoriesText || 'No significant memories yet.'}`);

    // 11. Rules
    sections.push(`RULES:
- You want to WIN the game by controlling ${gameState.victoryCondition} supply centers
- You may negotiate, form alliances, and make deals
- You may also deceive, betray, and manipulate if it serves your interests
- Your personality guides your preferred approach, but winning is the ultimate goal
- Keep messages concise and in-character for a diplomatic exchange
- Study the board state carefully — every power's position matters for your strategy`);

    return sections.join('\n\n');
  }

  // ── Public API ───────────────────────────────────────────────────────

  async generateResponse(
    agent: AiAgent,
    gameState: GameState,
    _incomingMessage: Message,
    conversationHistory: Message[],
    model: 'chat' | 'reasoner',
    turnHistory?: TurnResult[],
    negotiations?: NegotiationState,
  ): Promise<AiResponse> {
    const client = this.getClient();
    const powerName = CLASSIC_POWERS[agent.power].name;

    const systemPrompt = this.buildAgentSystemPrompt(agent, gameState, model, turnHistory, negotiations);

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10).map(msg => ({
        role: (msg.from === agent.power ? 'assistant' : 'user') as 'assistant' | 'user',
        content: msg.from === agent.power
          ? msg.content
          : `[Message from ${CLASSIC_POWERS[msg.from].name}]: ${msg.content}`,
      })),
    ];

    try {
      const response = await client.chat.completions.create({
        model: this.getModelId(model),
        max_tokens: 500,
        messages,
      });

      const content = response.choices[0].message.content || '';

      const cost = this.estimateCost(
        model,
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0
      );

      return { content, cost };
    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        content: `[${powerName} is considering their response...]`,
        cost: 0,
      };
    }
  }

  async generateOrders(
    agent: AiAgent,
    gameState: GameState,
    model: 'chat' | 'reasoner',
    turnHistory?: TurnResult[],
    negotiations?: NegotiationState,
  ): Promise<AiOrdersResult> {
    const client = this.getClient();
    const power = gameState.powers[agent.power];

    const systemPrompt = this.buildAgentSystemPrompt(agent, gameState, model, turnHistory, negotiations);

    const orderPrompt = `Based on your strategic situation, determine your orders for this phase.

${this.buildAvailableMovesSection(gameState, agent.power)}

RESPOND WITH JSON:
{
  "orders": [
    { "type": "move", "unitType": "army", "location": "par", "destination": "bur" },
    { "type": "hold", "unitType": "fleet", "location": "bre" },
    { "type": "support", "unitType": "army", "location": "mar", "supportedUnit": { "type": "army", "location": "par" }, "supportDestination": "bur" },
    { "type": "convoy", "unitType": "fleet", "location": "nth", "convoyedArmy": { "location": "lon" }, "convoyDestination": "bel" }
  ],
  "reasoning": "Brief explanation"
}

IMPORTANT:
- Issue exactly one order per unit. Do not skip any units.
- Only move to destinations listed in AVAILABLE MOVES above.
- Use territory IDs (e.g., "par"), not full names.
- For multi-coast territories include "destinationCoast" (e.g., "stp_nc").
- Coordinate units! Use support orders to make attacks succeed.
- A supported attack (strength 2) beats an unsupported defender (strength 1).`;

    const maxTokens = model === 'reasoner' ? 2000 : 1000;

    try {
      const response = await client.chat.completions.create({
        model: this.getModelId(model),
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: orderPrompt },
        ],
      });

      const content = response.choices[0].message.content || '{"orders":[]}';

      const cost = this.estimateCost(
        model,
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0
      );

      // Parse orders from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const orders = (parsed.orders || []).map((o: any) => ({
          ...o,
          power: agent.power,
        }));
        return { orders, cost };
      }

      // Fallback: hold all units
      return {
        orders: power.units.map(u => ({
          type: 'hold' as const,
          power: agent.power,
          unitType: u.type,
          location: u.territory,
          coast: u.coast,
        })),
        cost,
      };
    } catch (error) {
      console.error('Error generating AI orders:', error);
      // Fallback: hold all units
      return {
        orders: power.units.map(u => ({
          type: 'hold' as const,
          power: agent.power,
          unitType: u.type,
          location: u.territory,
          coast: u.coast,
        })),
        cost: 0,
      };
    }
  }

  async generateBuilds(
    agent: AiAgent,
    gameState: GameState,
    model: 'chat' | 'reasoner',
    turnHistory?: TurnResult[],
  ): Promise<{ builds: BuildOrder[]; cost: number }> {
    const client = this.getClient();
    const power = gameState.powers[agent.power];
    if (!power || power.isEliminated) return { builds: [], cost: 0 };

    const adj = getAdjustment(power);
    if (adj === 0) return { builds: [], cost: 0 };

    const systemPrompt = this.buildAgentSystemPrompt(agent, gameState, model, turnHistory);

    let buildPrompt: string;

    if (adj > 0) {
      const locations = getAvailableBuildLocations(agent.power, gameState);
      if (locations.length === 0) return { builds: [], cost: 0 };

      const locationDetails = locations.map(loc => {
        const territory = gameState.territories[loc];
        const type = territory?.type || 'land';
        const coastInfo = territory?.coasts
          ? ` (coasts: ${territory.coasts.map(c => c.id).join(', ')})`
          : '';
        return `${loc} (${type}${coastInfo})`;
      });

      buildPrompt = `It is the winter builds phase. You may BUILD ${Math.min(adj, locations.length)} unit(s).

Available build locations:
${locationDetails.join('\n')}

Consider what you need strategically:
- Armies for land campaigns and holding inland territories
- Fleets for naval dominance and coastal expansion
- Where are your threats? Where do you want to expand?

RESPOND WITH JSON:
{
  "builds": [
    { "action": "build", "unitType": "army", "location": "par" },
    { "action": "build", "unitType": "fleet", "location": "bre" }
  ],
  "reasoning": "Brief explanation"
}

IMPORTANT:
- You can build at most ${Math.min(adj, locations.length)} units.
- Only use locations from the list above.
- unitType must be "army" or "fleet".
- Armies cannot be built at sea territories; fleets cannot be built at land-only territories.
- For multi-coast territories, include "coast" (e.g., "stp_nc").`;
    } else {
      // Must disband
      const unitList = power.units.map(u => {
        const territory = gameState.territories[u.territory];
        const scInfo = territory?.isSupplyCenter ? ' (SC)' : '';
        return `${u.type === 'army' ? 'A' : 'F'} ${u.territory}${u.coast ? ` (${u.coast})` : ''}${scInfo}`;
      });

      buildPrompt = `It is the winter builds phase. You must DISBAND ${-adj} unit(s).

Your current units:
${unitList.join('\n')}

Consider which units are least useful:
- Units far from the front lines or supply centers
- Units that are redundant or trapped
- Preserve units near threatened supply centers

RESPOND WITH JSON:
{
  "builds": [
    { "action": "disband", "unitType": "army", "location": "par" }
  ],
  "reasoning": "Brief explanation"
}

IMPORTANT:
- You must disband exactly ${-adj} unit(s).
- Only disband units you actually have.`;
    }

    try {
      const response = await client.chat.completions.create({
        model: this.getModelId(model),
        max_tokens: 500,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: buildPrompt },
        ],
      });

      const content = response.choices[0].message.content || '{"builds":[]}';
      const cost = this.estimateCost(
        model,
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0
      );

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const builds: BuildOrder[] = (parsed.builds || []).map((b: any) => ({
          ...b,
          power: agent.power,
        }));
        return { builds, cost };
      }

      // Fallback to heuristic
      return { builds: this.generateFallbackBuilds(gameState, agent.power), cost };
    } catch (error) {
      console.error('Error generating AI builds:', error);
      return { builds: this.generateFallbackBuilds(gameState, agent.power), cost: 0 };
    }
  }

  /** Fallback heuristic builds when LLM parsing fails */
  private generateFallbackBuilds(state: GameState, powerId: PowerId): BuildOrder[] {
    const power = state.powers[powerId];
    if (!power || power.isEliminated) return [];

    const adj = getAdjustment(power);
    const builds: BuildOrder[] = [];

    if (adj > 0) {
      const locations = getAvailableBuildLocations(powerId, state);
      for (let i = 0; i < Math.min(adj, locations.length); i++) {
        const territory = state.territories[locations[i]];
        const unitType = territory && territory.type === 'coastal' ? 'fleet' : 'army';
        builds.push({
          power: powerId,
          action: 'build',
          unitType,
          location: locations[i],
        });
      }
    } else if (adj < 0) {
      const toDisband = Math.min(-adj, power.units.length);
      for (let i = 0; i < toDisband; i++) {
        const unit = power.units[power.units.length - 1 - i];
        builds.push({
          power: powerId,
          action: 'disband',
          unitType: unit.type,
          location: unit.territory,
        });
      }
    }

    return builds;
  }

  async runNegotiationRound(
    agents: Record<PowerId, AiAgent>,
    gameState: GameState,
    negotiations: NegotiationState,
    model: 'chat' | 'reasoner',
    turnHistory?: TurnResult[],
  ): Promise<AiNegotiationResult> {
    const messages: { from: PowerId; to: PowerId; content: string }[] = [];
    const trustUpdates: AiNegotiationResult['trustUpdates'] = [];
    let totalCost = 0;

    const aiPowers = Object.keys(agents) as PowerId[];

    // Each AI decides who to message this round
    for (const power of aiPowers) {
      const agent = agents[power];
      const result = await this.generateNegotiationMessages(
        agent,
        aiPowers.filter(p => p !== power),
        gameState,
        negotiations,
        model,
        turnHistory,
      );

      messages.push(...result.messages.map(m => ({ ...m, from: power })));
      totalCost += result.cost;

      // Update trust based on analysis
      for (const update of result.trustUpdates) {
        trustUpdates.push({
          power,
          target: update.target,
          oldScore: agent.trustScores[update.target]?.score || 0,
          newScore: update.newScore,
          reason: update.reason,
        });
      }
    }

    return { messages, trustUpdates, apiCost: totalCost };
  }

  private async generateNegotiationMessages(
    agent: AiAgent,
    otherPowers: PowerId[],
    gameState: GameState,
    negotiations: NegotiationState,
    model: 'chat' | 'reasoner',
    turnHistory?: TurnResult[],
  ): Promise<{
    messages: { to: PowerId; content: string }[];
    trustUpdates: { target: PowerId; newScore: number; reason: string }[];
    cost: number;
  }> {
    const client = this.getClient();
    const systemPrompt = this.buildAgentSystemPrompt(agent, gameState, model, turnHistory, negotiations);

    const negotiationPrompt = `You are in a negotiation round. Decide which powers to contact and what to say.

Other powers you can message: ${otherPowers.map(p => CLASSIC_POWERS[p].name).join(', ')}

Your trust levels:
${otherPowers.map(p => `- ${CLASSIC_POWERS[p].name}: ${agent.trustScores[p]?.score.toFixed(2) || 0}`).join('\n')}

Respond with JSON:
{
  "messages": [
    { "to": "france", "content": "Your diplomatic message here" }
  ],
  "trustUpdates": [
    { "target": "germany", "newScore": 0.3, "reason": "They supported our move last turn" }
  ]
}

You may send 0-3 messages. Be strategic about who you contact.`;

    try {
      const response = await client.chat.completions.create({
        model: this.getModelId(model),
        max_tokens: 800,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: negotiationPrompt },
        ],
      });

      const content = response.choices[0].message.content || '{"messages":[],"trustUpdates":[]}';

      const cost = this.estimateCost(
        model,
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0
      );

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          messages: parsed.messages || [],
          trustUpdates: parsed.trustUpdates || [],
          cost,
        };
      }

      return { messages: [], trustUpdates: [], cost };
    } catch (error) {
      console.error('Error generating negotiation messages:', error);
      return { messages: [], trustUpdates: [], cost: 0 };
    }
  }
}
