import Anthropic from '@anthropic-ai/sdk';
import {
  type GameState,
  type PowerId,
  type Order,
  type Message,
  type AiAgent,
  type AiNegotiationResult,
  type NegotiationState,
  describePersonality,
  CLASSIC_POWERS,
} from '@diplomacy/shared';

interface AiResponse {
  content: string;
  cost: number;
}

interface AiOrdersResult {
  orders: Order[];
  cost: number;
}

export class AiManager {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required');
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  private getModelId(model: 'haiku' | 'sonnet'): string {
    return model === 'haiku'
      ? 'claude-3-5-haiku-20241022'
      : 'claude-sonnet-4-20250514';
  }

  private estimateCost(model: 'haiku' | 'sonnet', inputTokens: number, outputTokens: number): number {
    // Approximate costs per million tokens
    const costs = {
      haiku: { input: 1.0, output: 5.0 },
      sonnet: { input: 3.0, output: 15.0 },
    };
    const modelCosts = costs[model];
    return (inputTokens * modelCosts.input + outputTokens * modelCosts.output) / 1_000_000;
  }

  async generateResponse(
    agent: AiAgent,
    gameState: GameState,
    _incomingMessage: Message,
    conversationHistory: Message[],
    model: 'haiku' | 'sonnet'
  ): Promise<AiResponse> {
    const client = this.getClient();
    const powerName = CLASSIC_POWERS[agent.power].name;

    const systemPrompt = this.buildAgentSystemPrompt(agent, gameState);

    const messages = conversationHistory.slice(-10).map(msg => ({
      role: msg.from === agent.power ? 'assistant' as const : 'user' as const,
      content: msg.from === agent.power
        ? msg.content
        : `[Message from ${CLASSIC_POWERS[msg.from].name}]: ${msg.content}`,
    }));

    try {
      const response = await client.messages.create({
        model: this.getModelId(model),
        max_tokens: 500,
        system: systemPrompt,
        messages,
      });

      const content = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      const cost = this.estimateCost(
        model,
        response.usage.input_tokens,
        response.usage.output_tokens
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
    model: 'haiku' | 'sonnet'
  ): Promise<AiOrdersResult> {
    const client = this.getClient();
    const power = gameState.powers[agent.power];

    const systemPrompt = this.buildAgentSystemPrompt(agent, gameState);

    const orderPrompt = `Based on your strategic situation and recent negotiations, determine your orders for this phase.

Your units:
${power.units.map(u => `- ${u.type === 'army' ? 'Army' : 'Fleet'} in ${u.territory}${u.coast ? ` (${u.coast})` : ''}`).join('\n')}

Provide your orders in JSON format:
{
  "orders": [
    { "type": "move", "unitType": "army", "location": "par", "destination": "bur" },
    { "type": "hold", "unitType": "fleet", "location": "bre" },
    { "type": "support", "unitType": "army", "location": "mar", "supportedUnit": { "type": "army", "location": "par" }, "supportDestination": "bur" }
  ],
  "reasoning": "Brief explanation of strategy"
}`;

    try {
      const response = await client.messages.create({
        model: this.getModelId(model),
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: orderPrompt }],
      });

      const content = response.content[0].type === 'text'
        ? response.content[0].text
        : '{"orders":[]}';

      const cost = this.estimateCost(
        model,
        response.usage.input_tokens,
        response.usage.output_tokens
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

  async runNegotiationRound(
    agents: Record<PowerId, AiAgent>,
    gameState: GameState,
    negotiations: NegotiationState,
    model: 'haiku' | 'sonnet'
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
        model
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
    _negotiations: NegotiationState,
    model: 'haiku' | 'sonnet'
  ): Promise<{
    messages: { to: PowerId; content: string }[];
    trustUpdates: { target: PowerId; newScore: number; reason: string }[];
    cost: number;
  }> {
    const client = this.getClient();
    const systemPrompt = this.buildAgentSystemPrompt(agent, gameState);

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
      const response = await client.messages.create({
        model: this.getModelId(model),
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: 'user', content: negotiationPrompt }],
      });

      const content = response.content[0].type === 'text'
        ? response.content[0].text
        : '{"messages":[],"trustUpdates":[]}';

      const cost = this.estimateCost(
        model,
        response.usage.input_tokens,
        response.usage.output_tokens
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

  private buildAgentSystemPrompt(agent: AiAgent, gameState: GameState): string {
    const power = gameState.powers[agent.power];
    const powerName = CLASSIC_POWERS[agent.power].name;

    return `You are playing as ${powerName} in a game of Diplomacy, set in ${gameState.year}.

PERSONALITY:
${describePersonality(agent.personality)}

CURRENT SITUATION:
- Phase: ${gameState.phase}
- Supply Centers: ${power.supplyCenters.length} (${power.supplyCenters.join(', ')})
- Units: ${power.units.length}
- Victory requires: ${gameState.victoryCondition} supply centers

YOUR TRUST LEVELS:
${Object.entries(agent.trustScores)
  .map(([p, t]) => `- ${CLASSIC_POWERS[p as PowerId].name}: ${t.score.toFixed(2)}`)
  .join('\n')}

MEMORIES:
${agent.memory.slice(-5).map(m => `- ${m.year} ${m.phase}: ${m.description}`).join('\n') || 'No significant memories yet.'}

RULES:
- You want to WIN the game by controlling ${gameState.victoryCondition} supply centers
- You may negotiate, form alliances, and make deals
- You may also deceive, betray, and manipulate if it serves your interests
- Your personality guides your preferred approach, but winning is the ultimate goal
- Keep messages concise and in-character for a diplomatic exchange`;
  }
}
