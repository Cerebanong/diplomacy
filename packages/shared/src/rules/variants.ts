/**
 * Game variants configuration
 * MVP includes classic only, structure supports future variants
 */

import type { PowerId } from '../types/game.js';

export interface GameVariant {
  id: string;
  name: string;
  description: string;
  playerCount: number;
  powers: PowerId[];
  defaultVictoryCondition: number;
  availableVictoryConditions: VictoryCondition[];
  /** Is this variant available in the current version? */
  available: boolean;
}

export interface VictoryCondition {
  id: string;
  name: string;
  description: string;
  supplyCentersNeeded: number;
}

export const VICTORY_CONDITIONS: Record<string, VictoryCondition> = {
  standard: {
    id: 'standard',
    name: 'Standard Victory',
    description: 'Control 18 supply centers',
    supplyCentersNeeded: 18,
  },
  short: {
    id: 'short',
    name: 'Short Game',
    description: 'Control 15 supply centers',
    supplyCentersNeeded: 15,
  },
  long: {
    id: 'long',
    name: 'Long Game',
    description: 'Control 24 supply centers',
    supplyCentersNeeded: 24,
  },
  domination: {
    id: 'domination',
    name: 'Total Domination',
    description: 'Control all 34 supply centers',
    supplyCentersNeeded: 34,
  },
};

export const GAME_VARIANTS: Record<string, GameVariant> = {
  classic: {
    id: 'classic',
    name: 'Classic Diplomacy (1901)',
    description: 'The standard 7-player game set in Europe, 1901. The definitive Diplomacy experience.',
    playerCount: 7,
    powers: ['england', 'france', 'germany', 'italy', 'austria', 'russia', 'turkey'],
    defaultVictoryCondition: 18,
    availableVictoryConditions: [
      VICTORY_CONDITIONS.short,
      VICTORY_CONDITIONS.standard,
      VICTORY_CONDITIONS.long,
      VICTORY_CONDITIONS.domination,
    ],
    available: true,
  },
  // Future variants - not yet implemented
  colonial: {
    id: 'colonial',
    name: 'Colonial Diplomacy',
    description: 'Set in Asia during the colonial era. 7 players compete for control of the Far East.',
    playerCount: 7,
    powers: ['england', 'france', 'germany', 'italy', 'austria', 'russia', 'turkey'], // Would need different powers
    defaultVictoryCondition: 18,
    availableVictoryConditions: [VICTORY_CONDITIONS.standard],
    available: false,
  },
  ancient: {
    id: 'ancient',
    name: 'Ancient Mediterranean',
    description: 'Set in the ancient world with Rome, Carthage, Greece, Persia, and Egypt.',
    playerCount: 5,
    powers: ['england', 'france', 'germany', 'italy', 'austria'], // Would need different powers
    defaultVictoryCondition: 18,
    availableVictoryConditions: [VICTORY_CONDITIONS.standard],
    available: false,
  },
  youngstown: {
    id: 'youngstown',
    name: 'Youngstown',
    description: 'A 10-player variant with additional powers: Spain, Poland, and Egypt.',
    playerCount: 10,
    powers: ['england', 'france', 'germany', 'italy', 'austria', 'russia', 'turkey'], // Would need more
    defaultVictoryCondition: 24,
    availableVictoryConditions: [VICTORY_CONDITIONS.long],
    available: false,
  },
};

/**
 * Get all available variants
 */
export function getAvailableVariants(): GameVariant[] {
  return Object.values(GAME_VARIANTS).filter(v => v.available);
}

/**
 * Get variant by ID
 */
export function getVariant(id: string): GameVariant | undefined {
  return GAME_VARIANTS[id];
}
