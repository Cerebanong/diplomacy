/**
 * Core game types for Diplomacy
 */

export type PowerId = 'england' | 'france' | 'germany' | 'italy' | 'austria' | 'russia' | 'turkey';

export type UnitType = 'army' | 'fleet';

export type Phase = 'spring_orders' | 'spring_retreats' | 'fall_orders' | 'fall_retreats' | 'winter_builds';

export type TerritoryType = 'land' | 'sea' | 'coastal';

export interface Territory {
  id: string;
  name: string;
  type: TerritoryType;
  isSupplyCenter: boolean;
  homeSupplyCenter?: PowerId;
  adjacencies: string[];
  /** For coastal territories with multiple coasts (e.g., Spain, Bulgaria) */
  coasts?: {
    id: string;
    name: string;
    adjacencies: string[];
  }[];
  /** SVG path data for rendering */
  svgPath: string;
  /** Center point for unit placement */
  center: { x: number; y: number };
}

export interface Unit {
  type: UnitType;
  territory: string;
  /** For fleets on multi-coast territories */
  coast?: string;
  power: PowerId;
}

export interface Power {
  id: PowerId;
  name: string;
  color: string;
  supplyCenters: string[];
  units: Unit[];
  isEliminated: boolean;
}

export interface GameState {
  id: string;
  variant: string;
  year: number;
  phase: Phase;
  powers: Record<PowerId, Power>;
  territories: Record<string, Territory>;
  /** Which power the human player controls */
  playerPower: PowerId;
  /** Victory condition - number of supply centers needed */
  victoryCondition: number;
  /** Is the game over? */
  isComplete: boolean;
  /** Winner if game is complete */
  winner?: PowerId;
  /** Track API costs */
  totalApiCost: number;
}

export interface GameConfig {
  variant: string;
  mapStyle: string;
  playerPower: PowerId;
  victoryCondition: number;
  aiModel: 'haiku' | 'sonnet';
}

export interface TurnResult {
  year: number;
  phase: Phase;
  orders: Record<PowerId, import('./orders.js').Order[]>;
  resolutions: OrderResolution[];
  retreats?: Record<PowerId, import('./orders.js').RetreatOrder[]>;
  builds?: Record<PowerId, import('./orders.js').BuildOrder[]>;
  disbands?: Record<PowerId, string[]>;
  newState: GameState;
}

export interface OrderResolution {
  order: import('./orders.js').Order;
  success: boolean;
  reason?: string;
}
