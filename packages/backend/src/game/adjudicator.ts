/**
 * Diplomacy order adjudicator
 *
 * Resolves hold, move, and support orders with standard conflict rules:
 * - Moves validated against adjacency lists and terrain types
 * - Supports increment strength of matching moves/holds
 * - Supports are cut when the supporting unit is attacked from a non-destination territory
 * - Conflicting moves to the same destination: highest strength wins, ties bounce
 * - Defenders (holding units) get strength 1 + supports
 * - Dislodged units are removed (simplified: no retreat phase)
 * - Supply centers update after fall resolution
 *
 * Convoys are not yet implemented.
 */

import type {
  GameState,
  PowerId,
  TurnResult,
  OrderResolution,
  Territory,
  Unit,
} from '@diplomacy/shared';
import type {
  Order,
  MoveOrder,
  SupportOrder,
  HoldOrder,
} from '@diplomacy/shared';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Get the base territory id from a coast id (e.g. "stp_nc" → "stp", "mun" → "mun") */
function baseTerritory(id: string): string {
  // Coast ids follow the pattern "<territory>_<coast_suffix>"
  // Territory ids themselves never contain underscores in this map
  // Multi-coast territories: stp, spa, bul
  const idx = id.indexOf('_');
  return idx >= 0 ? id.slice(0, idx) : id;
}

/** Check if a unit at `from` can move to `to` based on adjacency and terrain. */
function isValidMove(
  unit: Unit,
  from: string,
  to: string,
  toCoast: string | undefined,
  territories: Record<string, Territory>,
): boolean {
  const destBase = baseTerritory(to);
  const destTerritory = territories[destBase];
  if (!destTerritory) return false;

  // Terrain checks
  if (unit.type === 'army' && destTerritory.type === 'sea') return false;
  if (unit.type === 'fleet' && destTerritory.type === 'land') return false;

  // Adjacency check — fleets must use coast-specific adjacencies when applicable
  if (unit.type === 'fleet') {
    // If the unit is on a coast, use that coast's adjacency list
    const fromBase = baseTerritory(from);
    const fromTerritory = territories[fromBase];
    if (!fromTerritory) return false;

    const fromCoast = unit.coast;
    let fromAdjacencies: string[];
    if (fromCoast && fromTerritory.coasts) {
      const coastDef = fromTerritory.coasts.find(c => c.id === fromCoast);
      fromAdjacencies = coastDef ? coastDef.adjacencies : fromTerritory.adjacencies;
    } else {
      fromAdjacencies = fromTerritory.adjacencies;
    }

    // Destination: if fleet is moving to a multi-coast territory, it must specify a coast
    // and that coast must be adjacent
    if (toCoast) {
      return fromAdjacencies.includes(toCoast);
    }
    // Check if the destination (or its base) is in adjacencies
    return fromAdjacencies.includes(to) || fromAdjacencies.includes(destBase);
  }

  // Army — use the base territory's adjacency list
  const fromBase = baseTerritory(from);
  const fromTerritory = territories[fromBase];
  if (!fromTerritory) return false;

  // Armies use the base territory adjacency list.
  // For multi-coast destinations, armies move to the base territory id.
  return fromTerritory.adjacencies.includes(destBase) || fromTerritory.adjacencies.includes(to);
}

/** Find the unit at a given territory in the given powers map. */
function findUnit(
  powers: Record<PowerId, { units: Unit[] }>,
  territory: string,
): Unit | undefined {
  for (const power of Object.values(powers)) {
    const u = power.units.find(
      u => u.territory === territory || (baseTerritory(u.territory) === baseTerritory(territory)),
    );
    if (u) return u;
  }
  return undefined;
}

// ── Resolution types (internal) ──────────────────────────────────────────────

interface MoveIntent {
  order: MoveOrder;
  from: string;
  to: string; // base territory
  strength: number;
  valid: boolean;
  invalidReason?: string;
}

interface HoldStrength {
  territory: string;
  power: PowerId;
  strength: number;
}

// ── Main entry point ─────────────────────────────────────────────────────────

export function resolveOrders(
  state: GameState,
  allOrders: Record<PowerId, Order[]>,
): TurnResult {
  // Deep copy so we don't mutate the original state
  const newState: GameState = structuredClone(state);
  const resolutions: OrderResolution[] = [];

  // Flatten all orders
  const flatOrders: Order[] = [];
  for (const orders of Object.values(allOrders)) {
    flatOrders.push(...orders);
  }

  // Assign default hold orders for units that have no order
  const orderedLocations = new Set(flatOrders.map(o => baseTerritory(o.location)));
  for (const power of Object.values(newState.powers)) {
    for (const unit of power.units) {
      if (!orderedLocations.has(baseTerritory(unit.territory))) {
        const holdOrder: HoldOrder = {
          type: 'hold',
          power: unit.power,
          unitType: unit.type,
          location: unit.territory,
        };
        flatOrders.push(holdOrder);
      }
    }
  }

  // ── Step 1: Build move intents ──
  const moveIntents: MoveIntent[] = [];
  const holdStrengths = new Map<string, HoldStrength>(); // territory base → strength

  for (const order of flatOrders) {
    if (order.type === 'move') {
      const destBase = baseTerritory(order.destination);
      const unit = findUnit(newState.powers, order.location);
      const valid = unit
        ? isValidMove(unit, order.location, order.destination, order.destinationCoast, newState.territories)
        : false;

      moveIntents.push({
        order,
        from: baseTerritory(order.location),
        to: destBase,
        strength: 1,
        valid,
        invalidReason: !unit
          ? 'No unit at location'
          : !valid
            ? 'Invalid move (not adjacent or terrain mismatch)'
            : undefined,
      });
    } else if (order.type === 'hold') {
      const base = baseTerritory(order.location);
      holdStrengths.set(base, {
        territory: base,
        power: order.power,
        strength: 1,
      });
    }
    // convoy orders are ignored for now
  }

  // Build a quick lookup: who is being attacked from where
  // Key: territory being attacked (base), Value: array of source territories
  const attacksOn = new Map<string, string[]>();
  for (const mi of moveIntents) {
    if (!mi.valid) continue;
    const list = attacksOn.get(mi.to) || [];
    list.push(mi.from);
    attacksOn.set(mi.to, list);
  }

  // ── Step 2: Process supports ──
  for (const order of flatOrders) {
    if (order.type !== 'support') continue;
    const supportOrder = order as SupportOrder;
    const supportingFrom = baseTerritory(supportOrder.location);

    // Check if the supporting unit is cut — attacked by a unit NOT from the support destination
    const supportDest = supportOrder.supportDestination
      ? baseTerritory(supportOrder.supportDestination)
      : baseTerritory(supportOrder.supportedUnit.location); // supporting a hold: destination is the hold location
    const attackers = moveIntents.filter(
      mi => mi.valid && mi.to === supportingFrom && mi.from !== supportDest,
    );
    const isCut = attackers.length > 0;

    if (isCut) {
      resolutions.push({
        order: supportOrder,
        success: false,
        reason: `Support cut by attack from ${attackers[0].from}`,
      });
      continue;
    }

    // Validate the supporting unit can reach the destination
    const supportingUnit = findUnit(newState.powers, supportOrder.location);
    if (!supportingUnit) {
      resolutions.push({ order: supportOrder, success: false, reason: 'No unit at location' });
      continue;
    }

    // A support is valid if the supporting unit could itself move to the destination
    const canReach = supportOrder.supportDestination
      ? isValidMove(supportingUnit, supportOrder.location, supportOrder.supportDestination, undefined, newState.territories)
      : true; // supporting a hold in place doesn't require adjacency to anything special

    if (!canReach) {
      resolutions.push({
        order: supportOrder,
        success: false,
        reason: 'Supporting unit cannot reach supported destination',
      });
      continue;
    }

    // Apply the support
    if (supportOrder.supportDestination) {
      // Support a move: find matching move intent
      const targetFrom = baseTerritory(supportOrder.supportedUnit.location);
      const targetTo = baseTerritory(supportOrder.supportDestination);
      const matchingMove = moveIntents.find(
        mi => mi.from === targetFrom && mi.to === targetTo,
      );
      if (matchingMove) {
        matchingMove.strength += 1;
        resolutions.push({ order: supportOrder, success: true });
      } else {
        resolutions.push({
          order: supportOrder,
          success: false,
          reason: 'No matching move to support',
        });
      }
    } else {
      // Support a hold
      const holdBase = baseTerritory(supportOrder.supportedUnit.location);
      const existing = holdStrengths.get(holdBase);
      if (existing) {
        existing.strength += 1;
        resolutions.push({ order: supportOrder, success: true });
      } else {
        // Unit may be holding implicitly — create entry
        holdStrengths.set(holdBase, {
          territory: holdBase,
          power: supportOrder.supportedUnit.type === 'army' ? supportOrder.power : supportOrder.power, // best guess
          strength: 2, // base 1 + this support
        });
        resolutions.push({ order: supportOrder, success: true });
      }
    }
  }

  // ── Step 3: Resolve conflicts ──
  // Group move intents by destination
  const movesByDest = new Map<string, MoveIntent[]>();
  for (const mi of moveIntents) {
    if (!mi.valid) {
      resolutions.push({ order: mi.order, success: false, reason: mi.invalidReason });
      continue;
    }
    const list = movesByDest.get(mi.to) || [];
    list.push(mi);
    movesByDest.set(mi.to, list);
  }

  // Track successful moves and dislodged units
  const successfulMoves = new Set<MoveIntent>();
  const dislodgedTerritories = new Set<string>(); // base territories whose occupant is dislodged

  for (const [dest, moves] of movesByDest) {
    // Defender strength (unit currently at destination that is NOT moving away)
    const defender = holdStrengths.get(dest);
    // Check if the occupant at dest is moving away (then no defense)
    const occupantMovingAway = moveIntents.some(mi => mi.valid && mi.from === dest && mi.to !== dest);

    const effectiveDefenderStrength = (defender && !occupantMovingAway) ? defender.strength : 0;

    if (moves.length === 1) {
      const move = moves[0];
      // Single move — beats defender if strictly greater strength
      if (move.strength > effectiveDefenderStrength) {
        successfulMoves.add(move);
        if (effectiveDefenderStrength > 0) {
          dislodgedTerritories.add(dest);
        }
      } else {
        resolutions.push({
          order: move.order,
          success: false,
          reason: effectiveDefenderStrength > 0
            ? `Bounced: defender holds with strength ${effectiveDefenderStrength}`
            : `Bounced: failed to dislodge defender`,
        });
      }
    } else {
      // Multiple moves to same destination — find highest strength
      const maxStrength = Math.max(...moves.map(m => m.strength));

      // Also compare against defender
      if (effectiveDefenderStrength >= maxStrength) {
        // Defender holds — all attackers bounce
        for (const move of moves) {
          resolutions.push({
            order: move.order,
            success: false,
            reason: `Bounced: defender holds with strength ${effectiveDefenderStrength} vs attack strength ${move.strength}`,
          });
        }
        continue;
      }

      const winners = moves.filter(m => m.strength === maxStrength);
      if (winners.length > 1) {
        // Tie — all bounce (standoff)
        for (const move of moves) {
          resolutions.push({
            order: move.order,
            success: false,
            reason: `Standoff: tied with strength ${maxStrength}`,
          });
        }
      } else {
        // Clear winner
        successfulMoves.add(winners[0]);
        if (effectiveDefenderStrength > 0) {
          dislodgedTerritories.add(dest);
        }
        // Losers bounce
        for (const move of moves) {
          if (move !== winners[0]) {
            resolutions.push({
              order: move.order,
              success: false,
              reason: `Bounced: strength ${move.strength} vs winner strength ${maxStrength}`,
            });
          }
        }
      }
    }
  }

  // ── Step 3b: Handle "swap" moves (A→B and B→A both succeed — not allowed without convoy) ──
  const successList = [...successfulMoves];
  for (const move of successList) {
    const reverseMove = successList.find(
      m => m !== move && m.from === move.to && m.to === move.from,
    );
    if (reverseMove && !move.order.viaConvoy && !reverseMove.order.viaConvoy) {
      // Both units trying to swap without convoy — both fail
      successfulMoves.delete(move);
      successfulMoves.delete(reverseMove);
      resolutions.push({
        order: move.order,
        success: false,
        reason: 'Bounced: cannot swap positions without convoy',
      });
      resolutions.push({
        order: reverseMove.order,
        success: false,
        reason: 'Bounced: cannot swap positions without convoy',
      });
    }
  }

  // ── Step 4: Apply results to state ──

  // Record resolutions for successful moves and holds
  for (const move of successfulMoves) {
    resolutions.push({ order: move.order, success: true });
  }
  for (const order of flatOrders) {
    if (order.type === 'hold') {
      const base = baseTerritory(order.location);
      if (dislodgedTerritories.has(base)) {
        resolutions.push({ order, success: false, reason: 'Dislodged' });
      } else {
        resolutions.push({ order, success: true });
      }
    }
  }

  // Apply successful moves: update unit territories
  for (const move of successfulMoves) {
    const fromBase = baseTerritory(move.order.location);
    for (const power of Object.values(newState.powers)) {
      const unit = power.units.find(u => baseTerritory(u.territory) === fromBase);
      if (unit && unit.power === move.order.power) {
        const destBase = baseTerritory(move.order.destination);
        unit.territory = destBase;
        // Update coast for fleet on multi-coast territory
        if (move.order.destinationCoast) {
          unit.coast = move.order.destinationCoast;
        } else {
          unit.coast = undefined;
        }
        break;
      }
    }
  }

  // Remove dislodged units (simplified: no retreat phase)
  for (const dislodgedBase of dislodgedTerritories) {
    for (const power of Object.values(newState.powers)) {
      const idx = power.units.findIndex(u => baseTerritory(u.territory) === dislodgedBase);
      if (idx >= 0) {
        // Only remove if it wasn't the unit that successfully moved there
        const unit = power.units[idx];
        const wasAttacker = [...successfulMoves].some(
          m => m.order.power === unit.power && m.to === dislodgedBase,
        );
        if (!wasAttacker) {
          power.units.splice(idx, 1);
        }
      }
    }
  }

  // ── Step 5: Update supply centers (after fall moves only) ──
  if (state.phase === 'fall_orders') {
    for (const territory of Object.values(newState.territories)) {
      if (!territory.isSupplyCenter) continue;

      const tBase = baseTerritory(territory.id);
      // Find if any unit is on this territory
      let occupyingPower: PowerId | undefined;
      for (const [powerId, power] of Object.entries(newState.powers)) {
        if (power.units.some(u => baseTerritory(u.territory) === tBase)) {
          occupyingPower = powerId as PowerId;
          break;
        }
      }

      if (occupyingPower) {
        // Transfer ownership
        for (const power of Object.values(newState.powers)) {
          const idx = power.supplyCenters.indexOf(territory.id);
          if (idx >= 0 && power.id !== occupyingPower) {
            power.supplyCenters.splice(idx, 1);
          }
        }
        const ownerPower = newState.powers[occupyingPower];
        if (!ownerPower.supplyCenters.includes(territory.id)) {
          ownerPower.supplyCenters.push(territory.id);
        }
      }
      // If no unit is present, ownership doesn't change
    }

    // Mark eliminated powers (no supply centers AND no units)
    for (const power of Object.values(newState.powers)) {
      if (power.supplyCenters.length === 0 && power.units.length === 0) {
        power.isEliminated = true;
      }
    }
  }

  // ── Step 6: Advance phase ──
  const result: TurnResult = {
    year: state.year,
    phase: state.phase,
    orders: allOrders,
    resolutions,
    newState,
  };

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

  return result;
}
