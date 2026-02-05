/**
 * Order types for Diplomacy
 */

import type { PowerId, UnitType } from './game.js';

export type OrderType = 'hold' | 'move' | 'support' | 'convoy';

export interface BaseOrder {
  power: PowerId;
  unitType: UnitType;
  location: string;
  /** For units on multi-coast territories */
  coast?: string;
}

export interface HoldOrder extends BaseOrder {
  type: 'hold';
}

export interface MoveOrder extends BaseOrder {
  type: 'move';
  destination: string;
  /** For fleets moving to multi-coast territories */
  destinationCoast?: string;
  /** Is this move via convoy? */
  viaConvoy?: boolean;
}

export interface SupportOrder extends BaseOrder {
  type: 'support';
  /** The unit being supported */
  supportedUnit: {
    type: UnitType;
    location: string;
  };
  /** If supporting a move, the destination. If supporting a hold, undefined */
  supportDestination?: string;
}

export interface ConvoyOrder extends BaseOrder {
  type: 'convoy';
  /** The army being convoyed */
  convoyedArmy: {
    location: string;
  };
  /** Where the army is going */
  convoyDestination: string;
}

export type Order = HoldOrder | MoveOrder | SupportOrder | ConvoyOrder;

export interface RetreatOrder {
  power: PowerId;
  unitType: UnitType;
  location: string;
  /** Where to retreat to, or undefined to disband */
  destination?: string;
}

export interface BuildOrder {
  power: PowerId;
  /** 'build' to create a unit, 'waive' to skip */
  action: 'build' | 'waive';
  unitType?: UnitType;
  location?: string;
  coast?: string;
}

/**
 * Convert an order to standard Diplomacy notation
 */
export function orderToNotation(order: Order): string {
  const unitPrefix = order.unitType === 'army' ? 'A' : 'F';
  const location = order.coast ? `${order.location} (${order.coast})` : order.location;

  switch (order.type) {
    case 'hold':
      return `${unitPrefix} ${location} H`;
    case 'move': {
      const dest = order.destinationCoast
        ? `${order.destination} (${order.destinationCoast})`
        : order.destination;
      const convoy = order.viaConvoy ? ' VIA' : '';
      return `${unitPrefix} ${location} - ${dest}${convoy}`;
    }
    case 'support': {
      const supportedPrefix = order.supportedUnit.type === 'army' ? 'A' : 'F';
      if (order.supportDestination) {
        return `${unitPrefix} ${location} S ${supportedPrefix} ${order.supportedUnit.location} - ${order.supportDestination}`;
      }
      return `${unitPrefix} ${location} S ${supportedPrefix} ${order.supportedUnit.location}`;
    }
    case 'convoy':
      return `${unitPrefix} ${location} C A ${order.convoyedArmy.location} - ${order.convoyDestination}`;
  }
}
