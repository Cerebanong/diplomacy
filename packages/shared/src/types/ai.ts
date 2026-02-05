/**
 * AI agent types
 */

import type { PowerId } from './game.js';

export type PersonalityTrait =
  | 'aggressive'
  | 'defensive'
  | 'diplomatic'
  | 'deceptive'
  | 'loyal'
  | 'opportunistic'
  | 'cautious'
  | 'bold';

export interface AiPersonality {
  /** Primary trait that guides behavior */
  primaryTrait: PersonalityTrait;
  /** Secondary trait for nuance */
  secondaryTrait: PersonalityTrait;
  /** How willing to make and honor deals (0-1) */
  trustworthiness: number;
  /** How willing to take risks (0-1) */
  riskTolerance: number;
  /** How likely to pursue long-term vs short-term gains (0-1) */
  longTermFocus: number;
}

export interface TrustScore {
  /** The power being rated */
  power: PowerId;
  /** Current trust level (-1 to 1, where -1 is complete distrust, 1 is complete trust) */
  score: number;
  /** History of trust changes */
  history: TrustEvent[];
}

export interface TrustEvent {
  year: number;
  phase: string;
  previousScore: number;
  newScore: number;
  reason: string;
}

export interface AiAgent {
  power: PowerId;
  personality: AiPersonality;
  /** Trust scores for all other powers */
  trustScores: Record<PowerId, TrustScore>;
  /** Memory of significant events and agreements */
  memory: AiMemoryEntry[];
}

export interface AiMemoryEntry {
  year: number;
  phase: string;
  type: 'agreement' | 'betrayal' | 'cooperation' | 'conflict' | 'observation';
  involvedPowers: PowerId[];
  description: string;
  /** How important is this memory? (1-10) */
  significance: number;
}

export interface AiNegotiationResult {
  /** Messages sent during this round */
  messages: {
    from: PowerId;
    to: PowerId;
    content: string;
  }[];
  /** Trust score updates */
  trustUpdates: {
    power: PowerId;
    target: PowerId;
    oldScore: number;
    newScore: number;
    reason: string;
  }[];
  /** API cost for this round */
  apiCost: number;
}

export interface AiDecisionContext {
  agent: AiAgent;
  gameState: import('./game.js').GameState;
  /** Recent messages received */
  recentMessages: import('./negotiations.js').Message[];
  /** Current agreements/proposals */
  activeProposals: import('./negotiations.js').Proposal[];
}

/**
 * Generate a random personality for an AI agent
 */
export function generateRandomPersonality(): AiPersonality {
  const traits: PersonalityTrait[] = [
    'aggressive', 'defensive', 'diplomatic', 'deceptive',
    'loyal', 'opportunistic', 'cautious', 'bold'
  ];

  const shuffled = [...traits].sort(() => Math.random() - 0.5);

  return {
    primaryTrait: shuffled[0],
    secondaryTrait: shuffled[1],
    trustworthiness: 0.3 + Math.random() * 0.5, // 0.3-0.8
    riskTolerance: 0.2 + Math.random() * 0.6,   // 0.2-0.8
    longTermFocus: 0.3 + Math.random() * 0.5,   // 0.3-0.8
  };
}

/**
 * Generate a description of the personality for prompts
 */
export function describePersonality(personality: AiPersonality): string {
  const traitDescriptions: Record<PersonalityTrait, string> = {
    aggressive: 'tends to expand rapidly and take military risks',
    defensive: 'prioritizes protecting existing territories',
    diplomatic: 'prefers negotiation and building alliances',
    deceptive: 'often misleads others about intentions',
    loyal: 'honors agreements and values long-term partnerships',
    opportunistic: 'exploits weaknesses regardless of agreements',
    cautious: 'carefully evaluates risks before acting',
    bold: 'takes decisive action and makes surprising moves',
  };

  return `This power ${traitDescriptions[personality.primaryTrait]} and ${traitDescriptions[personality.secondaryTrait]}. ` +
    `They have ${personality.trustworthiness > 0.6 ? 'high' : personality.trustworthiness > 0.4 ? 'moderate' : 'low'} trustworthiness, ` +
    `${personality.riskTolerance > 0.6 ? 'high' : personality.riskTolerance > 0.4 ? 'moderate' : 'low'} risk tolerance, and ` +
    `focus on ${personality.longTermFocus > 0.6 ? 'long-term' : personality.longTermFocus > 0.4 ? 'balanced' : 'short-term'} gains.`;
}
