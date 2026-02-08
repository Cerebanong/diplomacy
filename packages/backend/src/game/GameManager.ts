import { v4 as uuidv4 } from 'uuid';
import {
  type GameState,
  type GameConfig,
  type PowerId,
  type Order,
  type BuildOrder,
  type RetreatOrder,
  type TurnResult,
  type NegotiationState,
  type Message,
  type AiAgent,
  createClassicGameState,
  getAvailableVariants,
  getChannelId,
  generateRandomPersonality,
} from '@diplomacy/shared';
import { AiManager } from '../ai/AiManager.js';
import { resolveOrders, resolveBuilds, resolveRetreats, getAdjustment, getAvailableBuildLocations } from './adjudicator.js';

interface GameSession {
  state: GameState;
  config: GameConfig;
  negotiations: NegotiationState;
  aiAgents: Record<PowerId, AiAgent>;
  turnHistory: TurnResult[];
  allNegotiationHistory: Message[]; // For post-game reveal
}

export class GameManager {
  private games: Map<string, GameSession> = new Map();
  private aiManager: AiManager;

  constructor() {
    this.aiManager = new AiManager();
  }

  getAvailableVariants() {
    return getAvailableVariants();
  }

  async createGame(config: GameConfig): Promise<{ gameId: string; state: GameState }> {
    // For MVP, only classic variant is supported
    if (config.variant !== 'classic') {
      throw new Error('Only classic variant is currently supported');
    }

    const state = createClassicGameState(config.playerPower, config.victoryCondition);
    const gameId = state.id;

    // Initialize AI agents for all non-player powers
    const aiAgents: Record<PowerId, AiAgent> = {} as Record<PowerId, AiAgent>;
    const allPowers: PowerId[] = ['england', 'france', 'germany', 'italy', 'austria', 'russia', 'turkey'];

    for (const power of allPowers) {
      if (power !== config.playerPower) {
        aiAgents[power] = {
          power,
          personality: generateRandomPersonality(),
          trustScores: this.initializeTrustScores(power, allPowers),
          memory: [],
        };
      }
    }

    // Initialize negotiation state
    const negotiations: NegotiationState = {
      channels: {},
      proposals: [],
      aiNegotiationsInProgress: false,
      currentAiRound: 0,
    };

    // Create channels between all powers
    for (let i = 0; i < allPowers.length; i++) {
      for (let j = i + 1; j < allPowers.length; j++) {
        const channelId = getChannelId(allPowers[i], allPowers[j]);
        negotiations.channels[channelId] = {
          participants: [allPowers[i], allPowers[j]],
          messages: [],
        };
      }
    }

    const session: GameSession = {
      state,
      config,
      negotiations,
      aiAgents,
      turnHistory: [],
      allNegotiationHistory: [],
    };

    this.games.set(gameId, session);

    // Start AI negotiations for the first turn
    this.startAiNegotiations(gameId);

    return { gameId, state };
  }

  private initializeTrustScores(power: PowerId, allPowers: PowerId[]) {
    const scores: Record<PowerId, { power: PowerId; score: number; history: any[] }> = {} as any;
    for (const other of allPowers) {
      if (other !== power) {
        scores[other] = {
          power: other,
          score: 0, // Neutral starting trust
          history: [],
        };
      }
    }
    return scores;
  }

  getGame(gameId: string): GameState | null {
    const session = this.games.get(gameId);
    return session?.state || null;
  }

  getGameStatus(gameId: string) {
    const session = this.games.get(gameId);
    if (!session) return null;

    return {
      state: session.state,
      aiNegotiationsInProgress: session.negotiations.aiNegotiationsInProgress,
      currentAiRound: session.negotiations.currentAiRound,
      canResolveTurn: !session.negotiations.aiNegotiationsInProgress,
    };
  }

  getGameHistory(gameId: string) {
    const session = this.games.get(gameId);
    if (!session) return null;

    return {
      turnHistory: session.turnHistory,
      // Only reveal AI negotiations if game is complete
      aiNegotiations: session.state.isComplete ? session.allNegotiationHistory : null,
      aiAgents: session.state.isComplete ? session.aiAgents : null,
    };
  }

  getPlayerChannels(gameId: string) {
    const session = this.games.get(gameId);
    if (!session) return null;

    const playerPower = session.state.playerPower;
    const channels: Record<string, { power: PowerId; messages: Message[] }> = {};

    for (const [_channelId, channel] of Object.entries(session.negotiations.channels)) {
      if (channel.participants.includes(playerPower)) {
        const otherPower = channel.participants.find(p => p !== playerPower)!;
        channels[otherPower] = {
          power: otherPower,
          messages: channel.messages,
        };
      }
    }

    return channels;
  }

  getChannelMessages(gameId: string, otherPower: PowerId) {
    const session = this.games.get(gameId);
    if (!session) return null;

    const channelId = getChannelId(session.state.playerPower, otherPower);
    return session.negotiations.channels[channelId]?.messages || null;
  }

  async sendMessage(gameId: string, to: PowerId, content: string) {
    const session = this.games.get(gameId);
    if (!session) throw new Error('Game not found');

    const from = session.state.playerPower;
    const channelId = getChannelId(from, to);

    const message: Message = {
      id: uuidv4(),
      timestamp: new Date(),
      from,
      to,
      content,
      isHuman: true,
    };

    session.negotiations.channels[channelId].messages.push(message);
    session.allNegotiationHistory.push(message);

    // Get AI response
    const response = await this.aiManager.generateResponse(
      session.aiAgents[to],
      session.state,
      message,
      session.negotiations.channels[channelId].messages,
      session.config.aiModel
    );

    const aiMessage: Message = {
      id: uuidv4(),
      timestamp: new Date(),
      from: to,
      to: from,
      content: response.content,
      isHuman: false,
    };

    session.negotiations.channels[channelId].messages.push(aiMessage);
    session.allNegotiationHistory.push(aiMessage);

    // Update API cost
    session.state.totalApiCost += response.cost;

    return {
      playerMessage: message,
      aiResponse: aiMessage,
      totalApiCost: session.state.totalApiCost,
    };
  }

  getAiNegotiationStatus(gameId: string) {
    const session = this.games.get(gameId);
    if (!session) return null;

    return {
      inProgress: session.negotiations.aiNegotiationsInProgress,
      currentRound: session.negotiations.currentAiRound,
      maxRounds: 3,
    };
  }

  async submitOrders(gameId: string, orders: Order[]): Promise<TurnResult> {
    const session = this.games.get(gameId);
    if (!session) throw new Error('Game not found');

    // Stop any in-progress AI negotiations — player is ready to resolve
    session.negotiations.aiNegotiationsInProgress = false;

    // Get AI orders for all other powers
    const allOrders: Record<PowerId, Order[]> = {} as Record<PowerId, Order[]>;
    allOrders[session.state.playerPower] = orders.map(o => ({
      ...o,
      power: session.state.playerPower,
    })) as Order[];

    for (const [power, agent] of Object.entries(session.aiAgents)) {
      const aiOrders = await this.aiManager.generateOrders(
        agent,
        session.state,
        session.config.aiModel
      );
      allOrders[power as PowerId] = aiOrders.orders;
      session.state.totalApiCost += aiOrders.cost;
    }

    // Adjudicate orders
    const result = await this.adjudicateOrders(session.state, allOrders);

    // Update game state
    session.state = result.newState;
    session.turnHistory.push(result);

    // Update AI trust scores based on what happened
    this.updateTrustScores(session, result);

    // Check for victory
    this.checkVictory(session);

    // Auto-advance past non-interactive phases (retreats with no dislodged units,
    // winter builds with no adjustments needed — always true with placeholder adjudicator)
    if (!session.state.isComplete) {
      await this.autoAdvancePhases(session);
    }

    // If game continues, start next round of AI negotiations for the new orders phase
    if (!session.state.isComplete) {
      this.startAiNegotiations(gameId);
    }

    // Return the final state (after auto-advancing) so the frontend shows the correct phase
    result.newState = session.state;

    return result;
  }

  async submitBuilds(gameId: string, playerBuilds: BuildOrder[]): Promise<TurnResult> {
    const session = this.games.get(gameId);
    if (!session) throw new Error('Game not found');
    if (session.state.phase !== 'winter_builds') throw new Error('Not in winter builds phase');

    const allBuilds: Record<PowerId, BuildOrder[]> = {} as Record<PowerId, BuildOrder[]>;
    allBuilds[session.state.playerPower] = playerBuilds;

    // Auto-generate AI builds/disbands
    for (const powerId of Object.keys(session.aiAgents) as PowerId[]) {
      allBuilds[powerId] = this.generateAiBuilds(session.state, powerId);
    }

    const result = resolveBuilds(session.state, allBuilds);
    session.state = result.newState;
    session.turnHistory.push(result);

    this.checkVictory(session);

    // Start negotiations for next turn
    if (!session.state.isComplete) {
      this.startAiNegotiations(gameId);
    }

    return result;
  }

  async submitRetreats(gameId: string, playerRetreats: RetreatOrder[]): Promise<TurnResult> {
    const session = this.games.get(gameId);
    if (!session) throw new Error('Game not found');
    const phase = session.state.phase;
    if (phase !== 'spring_retreats' && phase !== 'fall_retreats') {
      throw new Error('Not in a retreat phase');
    }

    const allRetreats: Record<PowerId, RetreatOrder[]> = {} as any;
    allRetreats[session.state.playerPower] = playerRetreats.map(r => ({
      ...r,
      power: session.state.playerPower,
    }));

    // Generate AI retreats via heuristic
    for (const powerId of Object.keys(session.aiAgents) as PowerId[]) {
      allRetreats[powerId] = this.generateAiRetreats(session.state, powerId);
    }

    const result = resolveRetreats(session.state, allRetreats);
    session.state = result.newState;
    session.turnHistory.push(result);

    this.checkVictory(session);

    if (!session.state.isComplete) {
      await this.autoAdvancePhases(session);
    }
    if (!session.state.isComplete) {
      this.startAiNegotiations(gameId);
    }

    result.newState = session.state;
    return result;
  }

  private generateAiRetreats(state: GameState, powerId: PowerId): RetreatOrder[] {
    if (!state.dislodgedUnits) return [];
    const retreats: RetreatOrder[] = [];

    for (const du of state.dislodgedUnits) {
      if (du.unit.power !== powerId) continue;

      let destination: string | undefined;
      if (du.validRetreats.length > 0) {
        // Prefer: own supply center > any supply center > any valid territory
        const ownSC = du.validRetreats.find(t =>
          state.powers[powerId].supplyCenters.includes(t)
        );
        const anySC = du.validRetreats.find(t =>
          state.territories[t]?.isSupplyCenter
        );
        destination = ownSC ?? anySC ?? du.validRetreats[0];
      }

      retreats.push({
        power: powerId,
        unitType: du.unit.type,
        location: du.dislodgedFrom,
        destination,
      });
    }
    return retreats;
  }

  private generateAiBuilds(state: GameState, powerId: PowerId): BuildOrder[] {
    const power = state.powers[powerId];
    if (!power || power.isEliminated) return [];

    const adj = getAdjustment(power);
    const builds: BuildOrder[] = [];

    if (adj > 0) {
      // Can build — place armies at available home SCs
      const locations = getAvailableBuildLocations(powerId, state);
      for (let i = 0; i < Math.min(adj, locations.length); i++) {
        const territory = state.territories[locations[i]];
        // Build fleets at coastal home SCs, armies at inland ones
        const unitType = territory && territory.type === 'coastal' ? 'fleet' : 'army';
        builds.push({
          power: powerId,
          action: 'build',
          unitType,
          location: locations[i],
        });
      }
    } else if (adj < 0) {
      // Must disband — remove units (last ones in list as simple heuristic)
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

  private async adjudicateOrders(
    state: GameState,
    orders: Record<PowerId, Order[]>
  ): Promise<TurnResult> {
    return resolveOrders(state, orders);
  }

  private isInteractivePhase(phase: GameState['phase'], state: GameState): boolean {
    if (phase === 'spring_orders' || phase === 'fall_orders' || phase === 'winter_builds') {
      return true;
    }
    if ((phase === 'spring_retreats' || phase === 'fall_retreats') && state.dislodgedUnits?.length) {
      return true;
    }
    return false;
  }

  private async autoAdvancePhases(session: GameSession) {
    while (!session.state.isComplete && !this.isInteractivePhase(session.state.phase, session.state)) {
      if (session.state.phase === 'spring_retreats' || session.state.phase === 'fall_retreats') {
        // Empty retreat phase (no dislodged units) — advance with resolveRetreats
        const emptyRetreats: Record<PowerId, RetreatOrder[]> = {} as any;
        const skipResult = resolveRetreats(session.state, emptyRetreats);
        session.state = skipResult.newState;
        session.turnHistory.push(skipResult);
      } else {
        const emptyOrders: Record<PowerId, Order[]> = {} as Record<PowerId, Order[]>;
        const skipResult = await this.adjudicateOrders(session.state, emptyOrders);
        session.state = skipResult.newState;
        session.turnHistory.push(skipResult);
      }
      this.checkVictory(session);
    }
  }

  private updateTrustScores(_session: GameSession, _result: TurnResult) {
    // TODO: Analyze orders and update trust scores based on
    // whether AI agents followed through on agreements
  }

  private checkVictory(session: GameSession) {
    for (const [powerId, power] of Object.entries(session.state.powers)) {
      if (power.supplyCenters.length >= session.state.victoryCondition) {
        session.state.isComplete = true;
        session.state.winner = powerId as PowerId;
        return;
      }
    }
  }

  private async startAiNegotiations(gameId: string) {
    const session = this.games.get(gameId);
    if (!session) return;

    session.negotiations.aiNegotiationsInProgress = true;
    session.negotiations.currentAiRound = 0;

    // Run up to 3 rounds of AI negotiations
    this.runAiNegotiationRound(gameId);
  }

  private async runAiNegotiationRound(gameId: string) {
    const session = this.games.get(gameId);
    if (!session) return;

    // Stop if negotiations were cancelled (e.g. player submitted orders early)
    if (!session.negotiations.aiNegotiationsInProgress) return;

    session.negotiations.currentAiRound += 1;

    // Generate AI-to-AI messages for this round
    const result = await this.aiManager.runNegotiationRound(
      session.aiAgents,
      session.state,
      session.negotiations,
      session.config.aiModel
    );

    // Record messages (but don't show to player)
    for (const msg of result.messages) {
      const channelId = getChannelId(msg.from, msg.to);
      const channel = session.negotiations.channels[channelId];
      if (!channel) continue; // Skip messages with invalid power IDs from AI
      const message: Message = {
        id: uuidv4(),
        timestamp: new Date(),
        from: msg.from,
        to: msg.to,
        content: msg.content,
        isHuman: false,
      };
      channel.messages.push(message);
      session.allNegotiationHistory.push(message);
    }

    // Update trust scores
    for (const update of result.trustUpdates) {
      const agent = session.aiAgents[update.power];
      if (agent && agent.trustScores[update.target]) {
        agent.trustScores[update.target].score = update.newScore;
        agent.trustScores[update.target].history.push({
          year: session.state.year,
          phase: session.state.phase,
          previousScore: update.oldScore,
          newScore: update.newScore,
          reason: update.reason,
        });
      }
    }

    // Update API cost
    session.state.totalApiCost += result.apiCost;

    // Continue to next round or finish
    if (session.negotiations.currentAiRound < 3) {
      // Small delay then next round
      setTimeout(() => this.runAiNegotiationRound(gameId), 100);
    } else {
      session.negotiations.aiNegotiationsInProgress = false;
    }
  }

  revealAllNegotiations(gameId: string) {
    const session = this.games.get(gameId);
    if (!session) return null;

    if (!session.state.isComplete) {
      return { error: 'Game must be complete to reveal all negotiations' };
    }

    return {
      allMessages: session.allNegotiationHistory,
      aiAgents: session.aiAgents,
    };
  }
}
