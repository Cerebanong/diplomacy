import { v4 as uuidv4 } from 'uuid';
import {
  type GameState,
  type GameConfig,
  type PowerId,
  type Order,
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

    for (const [channelId, channel] of Object.entries(session.negotiations.channels)) {
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

    if (session.negotiations.aiNegotiationsInProgress) {
      throw new Error('Cannot resolve turn while AI negotiations are in progress');
    }

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

    // If game continues, start next round of AI negotiations
    if (!session.state.isComplete) {
      this.startAiNegotiations(gameId);
    }

    return result;
  }

  private async adjudicateOrders(
    state: GameState,
    orders: Record<PowerId, Order[]>
  ): Promise<TurnResult> {
    // TODO: Integrate with DATC-compliant adjudicator
    // For now, return a placeholder result
    const newState = { ...state };

    // Advance phase
    switch (state.phase) {
      case 'spring_orders':
        newState.phase = 'spring_retreats';
        break;
      case 'spring_retreats':
        newState.phase = 'fall_orders';
        break;
      case 'fall_orders':
        newState.phase = 'fall_retreats';
        break;
      case 'fall_retreats':
        newState.phase = 'winter_builds';
        break;
      case 'winter_builds':
        newState.phase = 'spring_orders';
        newState.year += 1;
        break;
    }

    return {
      year: state.year,
      phase: state.phase,
      orders,
      resolutions: [], // TODO: Fill in actual resolutions
      newState,
    };
  }

  private updateTrustScores(session: GameSession, result: TurnResult) {
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
      const message: Message = {
        id: uuidv4(),
        timestamp: new Date(),
        from: msg.from,
        to: msg.to,
        content: msg.content,
        isHuman: false,
      };
      session.negotiations.channels[channelId].messages.push(message);
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
