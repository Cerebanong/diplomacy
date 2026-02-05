/**
 * Negotiation and messaging types
 */

import type { PowerId } from './game.js';

export interface Message {
  id: string;
  timestamp: Date;
  from: PowerId;
  to: PowerId;
  content: string;
  /** Is this from the human player? */
  isHuman: boolean;
}

export interface NegotiationChannel {
  /** The two powers in this channel */
  participants: [PowerId, PowerId];
  messages: Message[];
}

export interface Proposal {
  id: string;
  from: PowerId;
  to: PowerId;
  type: ProposalType;
  details: ProposalDetails;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
  respondedAt?: Date;
}

export type ProposalType =
  | 'alliance'
  | 'non_aggression'
  | 'support_request'
  | 'coordinated_attack'
  | 'territory_deal'
  | 'peace';

export interface ProposalDetails {
  /** Free-form description of the proposal */
  description: string;
  /** Specific territories involved */
  territories?: string[];
  /** Specific targets of coordinated action */
  targets?: PowerId[];
  /** How many turns this agreement should last */
  duration?: number;
}

export interface NegotiationState {
  /** All channels between powers */
  channels: Record<string, NegotiationChannel>;
  /** Active proposals */
  proposals: Proposal[];
  /** Are AI negotiations currently in progress? */
  aiNegotiationsInProgress: boolean;
  /** Current AI negotiation round (1-3) */
  currentAiRound: number;
}

/**
 * Generate a unique channel ID for two powers
 */
export function getChannelId(power1: PowerId, power2: PowerId): string {
  const sorted = [power1, power2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}
