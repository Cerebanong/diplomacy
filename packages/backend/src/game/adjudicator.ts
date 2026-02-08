/**
 * Diplomacy order adjudicator
 *
 * Resolves hold, move, support, and convoy orders with standard conflict rules:
 * - Moves validated against adjacency lists and terrain types
 * - Convoy chains allow armies to move across sea zones via fleets
 * - Supports increment strength of matching moves/holds
 * - Supports are cut when the supporting unit is attacked from a non-destination territory
 * - Conflicting moves to the same destination: highest strength wins, ties bounce
 * - Defenders (holding units) get strength 1 + supports
 * - Dislodged units are preserved with metadata for the retreat phase
 * - Supply centers update after fall resolution
 */

import type {
  GameState,
  PowerId,
  TurnResult,
  OrderResolution,
  Territory,
  Unit,
  DislodgedUnit,
} from '@diplomacy/shared';
import type {
  Order,
  MoveOrder,
  SupportOrder,
  HoldOrder,
  ConvoyOrder,
  BuildOrder,
  RetreatOrder,
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

/**
 * Check if a valid convoy path exists from `armyFrom` to `armyTo` through
 * a chain of convoying fleets on sea zones.
 */
function isValidConvoyPath(
  armyFrom: string,
  armyTo: string,
  convoyOrders: ConvoyOrder[],
  territories: Record<string, Territory>,
): boolean {
  const armyBase = baseTerritory(armyFrom);
  const destBase = baseTerritory(armyTo);

  // Collect sea-zone locations of fleets whose convoy orders match this army move
  const convoyingFleetZones = new Set<string>();
  for (const c of convoyOrders) {
    if (
      baseTerritory(c.convoyedArmy.location) === armyBase &&
      baseTerritory(c.convoyDestination) === destBase
    ) {
      const fleetBase = baseTerritory(c.location);
      const fleetTerritory = territories[fleetBase];
      if (fleetTerritory && fleetTerritory.type === 'sea') {
        convoyingFleetZones.add(fleetBase);
      }
    }
  }

  if (convoyingFleetZones.size === 0) return false;

  // BFS from army's origin through convoying fleet sea zones
  const armyTerritory = territories[armyBase];
  if (!armyTerritory) return false;

  const visited = new Set<string>();
  const queue: string[] = [];

  // Seed: sea zones adjacent to the army that have a convoying fleet
  for (const adj of armyTerritory.adjacencies) {
    const adjBase = baseTerritory(adj);
    if (convoyingFleetZones.has(adjBase) && !visited.has(adjBase)) {
      visited.add(adjBase);
      queue.push(adjBase);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentTerritory = territories[current];
    if (!currentTerritory) continue;

    // Check if this sea zone is adjacent to the destination
    const destTerritory = territories[destBase];
    if (destTerritory) {
      if (
        currentTerritory.adjacencies.includes(destBase) ||
        destTerritory.adjacencies.includes(current)
      ) {
        return true;
      }
    }

    // Expand to adjacent sea zones with convoying fleets
    for (const adj of currentTerritory.adjacencies) {
      const adjBase = baseTerritory(adj);
      if (convoyingFleetZones.has(adjBase) && !visited.has(adjBase)) {
        visited.add(adjBase);
        queue.push(adjBase);
      }
    }
  }

  return false;
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

  // Flatten all orders, filtering out any malformed entries (e.g. from AI parsing)
  const flatOrders: Order[] = [];
  for (const orders of Object.values(allOrders)) {
    for (const o of orders) {
      if (o && o.location) {
        flatOrders.push(o);
      }
    }
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

  // First pass: collect and validate all convoy orders
  const convoyOrders: ConvoyOrder[] = [];
  for (const order of flatOrders) {
    if (order.type !== 'convoy') continue;
    const convoy = order as ConvoyOrder;
    const fleetUnit = findUnit(newState.powers, convoy.location);

    // Correct unitType if it doesn't match the actual unit
    if (fleetUnit && convoy.unitType !== fleetUnit.type) {
      convoy.unitType = fleetUnit.type;
    }

    if (!fleetUnit) {
      resolutions.push({ order: convoy, success: false, reason: 'No unit at location' });
      continue;
    }
    if (fleetUnit.type !== 'fleet') {
      resolutions.push({ order: convoy, success: false, reason: 'Only fleets can convoy' });
      continue;
    }
    const fleetBase = baseTerritory(convoy.location);
    const fleetTerritory = newState.territories[fleetBase];
    if (!fleetTerritory || fleetTerritory.type !== 'sea') {
      resolutions.push({ order: convoy, success: false, reason: 'Fleet must be in a sea zone to convoy' });
      continue;
    }
    const convoyedArmy = findUnit(newState.powers, convoy.convoyedArmy.location);
    if (!convoyedArmy || convoyedArmy.type !== 'army') {
      resolutions.push({ order: convoy, success: false, reason: 'No army at convoyed location' });
      continue;
    }
    convoyOrders.push(convoy);
  }

  // Second pass: process move and hold orders
  for (const order of flatOrders) {
    if (order.type === 'move') {
      if (!order.destination) {
        resolutions.push({ order, success: false, reason: 'Missing destination' });
        continue;
      }
      const destBase = baseTerritory(order.destination);
      const unit = findUnit(newState.powers, order.location);

      // Correct unitType if it doesn't match the actual unit (e.g. AI says "fleet" but it's an army)
      if (unit && order.unitType !== unit.type) {
        order.unitType = unit.type;
      }

      let valid: boolean;
      let invalidReason: string | undefined;

      if (order.viaConvoy && unit?.type === 'army') {
        // Army moving via convoy — validate convoy chain instead of direct adjacency
        valid = unit
          ? isValidConvoyPath(order.location, order.destination, convoyOrders, newState.territories)
          : false;
        invalidReason = !unit
          ? 'No unit at location'
          : !valid
            ? 'No valid convoy path'
            : undefined;
      } else {
        valid = unit
          ? isValidMove(unit, order.location, order.destination, order.destinationCoast, newState.territories)
          : false;
        invalidReason = !unit
          ? 'No unit at location'
          : !valid
            ? 'Invalid move (not adjacent or terrain mismatch)'
            : undefined;
      }

      moveIntents.push({
        order,
        from: baseTerritory(order.location),
        to: destBase,
        strength: 1,
        valid,
        invalidReason,
      });
    } else if (order.type === 'hold') {
      // Correct unitType if it doesn't match the actual unit
      const holdUnit = findUnit(newState.powers, order.location);
      if (holdUnit && order.unitType !== holdUnit.type) {
        order.unitType = holdUnit.type;
      }

      const base = baseTerritory(order.location);
      holdStrengths.set(base, {
        territory: base,
        power: order.power,
        strength: 1,
      });
    }
  }

  // Ensure ALL occupied territories have base defensive strength 1.
  // This covers units with support/convoy orders (not just hold orders).
  // In standard Diplomacy, any stationary unit defends with strength 1.
  for (const power of Object.values(newState.powers)) {
    for (const unit of power.units) {
      const base = baseTerritory(unit.territory);
      if (!holdStrengths.has(base)) {
        holdStrengths.set(base, {
          territory: base,
          power: unit.power,
          strength: 1,
        });
      }
    }
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

    // Correct unitType if it doesn't match the actual unit
    if (supportingUnit && supportOrder.unitType !== supportingUnit.type) {
      supportOrder.unitType = supportingUnit.type;
    }
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
  const dislodgedTerritories = new Map<string, string>(); // dislodgedBase → attackerOrigin
  const standoffTerritories = new Set<string>(); // territories left vacant due to standoff

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
          dislodgedTerritories.set(dest, move.from);
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
        // Track standoff vacancy: territory is left vacant if no static occupant
        const hasStaticOccupant = !occupantMovingAway && findUnit(newState.powers, dest);
        if (!hasStaticOccupant) {
          standoffTerritories.add(dest);
        }
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
          dislodgedTerritories.set(dest, winners[0].from);
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

  // ── Step 3c: Verify moves that relied on occupants departing ──
  // If a unit at territory X tried to move away but failed (bounced),
  // any move into X that assumed X was being vacated must be re-evaluated.
  // The staying unit defends with strength 1 (no support for a failed move).
  let verifyChanged = true;
  while (verifyChanged) {
    verifyChanged = false;
    for (const move of [...successfulMoves]) {
      // Was there a unit at the destination that tried to move but failed?
      const stayingUnit = moveIntents.find(
        mi => mi.valid && mi.from === move.to && mi.to !== mi.from && !successfulMoves.has(mi),
      );
      if (!stayingUnit) continue;

      // The occupant is still there — check if we can dislodge
      // A bounced unit defends with base strength 1
      const defenderStr = holdStrengths.get(move.to)?.strength ?? 1;
      if (move.strength > defenderStr) {
        // Strong enough to dislodge the staying unit
        dislodgedTerritories.set(move.to, move.from);
      } else {
        // Cannot dislodge — this move fails too
        successfulMoves.delete(move);
        resolutions.push({
          order: move.order,
          success: false,
          reason: `Bounced: unit in ${move.to} failed to leave`,
        });
        verifyChanged = true;
      }
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

  // Record convoy order resolutions (for convoys not already resolved as invalid)
  for (const convoy of convoyOrders) {
    const fleetBase = baseTerritory(convoy.location);
    if (dislodgedTerritories.has(fleetBase)) {
      resolutions.push({ order: convoy, success: false, reason: 'Convoying fleet dislodged' });
    } else {
      // Check if the corresponding army move succeeded
      const armyBase = baseTerritory(convoy.convoyedArmy.location);
      const destBase = baseTerritory(convoy.convoyDestination);
      const armyMoveSucceeded = [...successfulMoves].some(
        m => m.from === armyBase && m.to === destBase && m.order.viaConvoy,
      );
      if (armyMoveSucceeded) {
        resolutions.push({ order: convoy, success: true });
      } else {
        resolutions.push({ order: convoy, success: false, reason: 'Convoyed army move failed' });
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

  // Preserve dislodged units for retreat phase (instead of removing them immediately)
  const dislodgedUnits: DislodgedUnit[] = [];
  for (const [dislodgedBase, attackerOrigin] of dislodgedTerritories) {
    for (const power of Object.values(newState.powers)) {
      const idx = power.units.findIndex(u => baseTerritory(u.territory) === dislodgedBase);
      if (idx >= 0) {
        const unit = power.units[idx];
        // Only dislodge if it wasn't the unit that successfully moved there
        const wasAttacker = [...successfulMoves].some(
          m => m.order.power === unit.power && m.to === dislodgedBase,
        );
        if (!wasAttacker) {
          const validRetreats = getValidRetreats(unit, dislodgedBase, attackerOrigin, standoffTerritories, newState);
          dislodgedUnits.push({ unit: { ...unit }, dislodgedFrom: dislodgedBase, attackerOrigin, validRetreats });
          power.units.splice(idx, 1); // Remove from active units
        }
      }
    }
  }
  newState.dislodgedUnits = dislodgedUnits.length > 0 ? dislodgedUnits : undefined;

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

// ── Winter builds resolution ────────────────────────────────────────────────

/**
 * Calculate the build/disband adjustment for a power.
 * Positive = can build, negative = must disband.
 */
export function getAdjustment(power: { supplyCenters: string[]; units: Unit[] }): number {
  return power.supplyCenters.length - power.units.length;
}

/**
 * Get the available home supply centers where a power can build.
 * A power can only build at its own home SCs that it currently owns and are unoccupied.
 */
export function getAvailableBuildLocations(
  powerId: PowerId,
  state: GameState,
): string[] {
  const power = state.powers[powerId];
  const allUnits: Unit[] = [];
  for (const p of Object.values(state.powers)) {
    allUnits.push(...p.units);
  }
  const occupiedTerritories = new Set(allUnits.map(u => baseTerritory(u.territory)));

  return power.supplyCenters.filter(sc => {
    const territory = state.territories[sc];
    if (!territory) return false;
    // Must be a home supply center for this power
    if (territory.homeSupplyCenter !== powerId) return false;
    // Must not be occupied
    return !occupiedTerritories.has(sc);
  });
}

/**
 * Resolve winter build/disband orders for all powers.
 */
export function resolveBuilds(
  state: GameState,
  allBuilds: Record<PowerId, BuildOrder[]>,
): TurnResult {
  const newState: GameState = structuredClone(state);

  for (const [powerId, builds] of Object.entries(allBuilds)) {
    const power = newState.powers[powerId as PowerId];
    if (!power) continue;

    for (const build of builds) {
      if (build.action === 'build' && build.unitType && build.location) {
        power.units.push({
          type: build.unitType,
          territory: build.location,
          coast: build.coast,
          power: powerId as PowerId,
        });
      } else if (build.action === 'disband' && build.location) {
        const idx = power.units.findIndex(
          u => baseTerritory(u.territory) === baseTerritory(build.location!),
        );
        if (idx >= 0) {
          power.units.splice(idx, 1);
        }
      }
    }

    // Mark eliminated powers
    if (power.supplyCenters.length === 0 && power.units.length === 0) {
      power.isEliminated = true;
    }
  }

  // Advance to spring orders of next year
  newState.phase = 'spring_orders';
  newState.year += 1;

  return {
    year: state.year,
    phase: state.phase,
    orders: {} as Record<PowerId, Order[]>,
    resolutions: [],
    builds: allBuilds,
    newState,
  };
}

// ── Retreat helpers ─────────────────────────────────────────────────────────

function getValidRetreats(
  unit: Unit,
  dislodgedFrom: string,
  attackerOrigin: string,
  standoffTerritories: Set<string>,
  state: GameState,
): string[] {
  const fromTerritory = state.territories[dislodgedFrom];
  if (!fromTerritory) return [];

  // All occupied territories after resolution
  const occupied = new Set<string>();
  for (const power of Object.values(state.powers)) {
    for (const u of power.units) {
      occupied.add(baseTerritory(u.territory));
    }
  }

  return fromTerritory.adjacencies
    .map(adj => baseTerritory(adj))
    .filter(adj => {
      if (adj === attackerOrigin) return false;        // can't retreat to attacker's origin
      if (occupied.has(adj)) return false;              // can't retreat to occupied territory
      if (standoffTerritories.has(adj)) return false;   // can't retreat to standoff vacancy
      const territory = state.territories[adj];
      if (!territory) return false;
      if (unit.type === 'army' && territory.type === 'sea') return false;
      if (unit.type === 'fleet' && territory.type === 'land') return false;
      return true;
    })
    .filter((v, i, a) => a.indexOf(v) === i); // dedupe
}

// ── Retreat resolution ──────────────────────────────────────────────────────

export function resolveRetreats(
  state: GameState,
  allRetreats: Record<PowerId, RetreatOrder[]>,
): TurnResult {
  const newState: GameState = structuredClone(state);
  const resolutions: OrderResolution[] = [];

  // Collect all retreat destinations to detect clashes
  const retreatTargets = new Map<string, RetreatOrder[]>();

  for (const retreats of Object.values(allRetreats)) {
    for (const retreat of retreats) {
      if (retreat.destination) {
        const dest = baseTerritory(retreat.destination);
        const list = retreatTargets.get(dest) || [];
        list.push(retreat);
        retreatTargets.set(dest, list);
      }
    }
  }

  // Find clashing destinations (2+ retreats to same place → both disband)
  const clashedDestinations = new Set<string>();
  for (const [dest, orders] of retreatTargets) {
    if (orders.length > 1) clashedDestinations.add(dest);
  }

  // Process each retreat
  for (const retreats of Object.values(allRetreats)) {
    for (const retreat of retreats) {
      if (!retreat.destination) {
        resolutions.push({ order: retreat as any, success: true, reason: 'Disbanded' });
        continue;
      }
      const dest = baseTerritory(retreat.destination);
      if (clashedDestinations.has(dest)) {
        resolutions.push({ order: retreat as any, success: false, reason: 'Retreat clash — both units disbanded' });
        continue;
      }
      // Successful retreat — add unit back to the power's units at new location
      const power = newState.powers[retreat.power];
      if (power) {
        power.units.push({
          type: retreat.unitType,
          territory: dest,
          power: retreat.power,
          coast: undefined,
        });
        resolutions.push({ order: retreat as any, success: true });
      }
    }
  }

  // Clear dislodged units
  newState.dislodgedUnits = undefined;

  // Advance phase
  switch (state.phase) {
    case 'spring_retreats': newState.phase = 'fall_orders'; break;
    case 'fall_retreats': newState.phase = 'winter_builds'; break;
    default: break;
  }

  return {
    year: state.year,
    phase: state.phase,
    orders: {} as any,
    resolutions,
    retreats: allRetreats,
    newState,
  };
}
