/**
 * Pure helper functions that compute valid order options from GameState territory data.
 * Used by OrdersPanel to populate validated dropdowns.
 */

import type { Territory, Unit, UnitType, Power, PowerId } from '@diplomacy/shared';

/** Strip coast suffix: "stp_nc" → "stp", "mun" → "mun" */
export function baseTerritory(id: string): string {
  const idx = id.indexOf('_');
  return idx >= 0 ? id.slice(0, idx) : id;
}

interface DestOption {
  id: string;
  name: string;
}

/**
 * Get valid move destinations for a unit.
 * - Army: base adjacencies, filter out sea, collapse coast IDs to base
 * - Fleet: coast-specific adjacencies if on a coast, filter out land, collapse to base
 */
export function getValidMoveDestinations(
  unitType: UnitType,
  location: string,
  coast: string | undefined,
  territories: Record<string, Territory>,
): DestOption[] {
  const fromBase = baseTerritory(location);
  const fromTerritory = territories[fromBase];
  if (!fromTerritory) return [];

  let adjacencies: string[];
  if (unitType === 'fleet' && coast && fromTerritory.coasts) {
    const coastDef = fromTerritory.coasts.find(c => c.id === coast);
    adjacencies = coastDef ? coastDef.adjacencies : fromTerritory.adjacencies;
  } else {
    adjacencies = fromTerritory.adjacencies;
  }

  // Collapse to unique base territories, filtering by terrain
  const seen = new Set<string>();
  const results: DestOption[] = [];

  for (const adj of adjacencies) {
    const adjBase = baseTerritory(adj);
    if (adjBase === fromBase) continue; // no self-adjacency
    if (seen.has(adjBase)) continue;
    seen.add(adjBase);

    const dest = territories[adjBase];
    if (!dest) continue;

    if (unitType === 'army' && dest.type === 'sea') continue;
    if (unitType === 'fleet' && dest.type === 'land') continue;

    results.push({ id: adjBase, name: dest.name });
  }

  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

interface CoastOption {
  id: string;
  name: string;
}

/**
 * Check if a fleet moving to a destination needs a coast selection.
 * Returns the reachable coasts, or null if no coast is needed.
 */
export function getRequiredCoasts(
  unitType: UnitType,
  location: string,
  coast: string | undefined,
  destId: string,
  territories: Record<string, Territory>,
): CoastOption[] | null {
  if (unitType === 'army') return null;

  const destTerritory = territories[destId];
  if (!destTerritory || !destTerritory.coasts || destTerritory.coasts.length === 0) return null;

  // Get the fleet's adjacency list
  const fromBase = baseTerritory(location);
  const fromTerritory = territories[fromBase];
  if (!fromTerritory) return null;

  let adjacencies: string[];
  if (coast && fromTerritory.coasts) {
    const coastDef = fromTerritory.coasts.find(c => c.id === coast);
    adjacencies = coastDef ? coastDef.adjacencies : fromTerritory.adjacencies;
  } else {
    adjacencies = fromTerritory.adjacencies;
  }

  // Which destination coasts appear in the fleet's adjacency list?
  const reachable: CoastOption[] = [];
  for (const c of destTerritory.coasts) {
    if (adjacencies.includes(c.id)) {
      reachable.push({ id: c.id, name: c.name });
    }
  }

  return reachable.length > 0 ? reachable : null;
}

/** Flatten units from all powers */
export function getAllUnits(powers: Record<PowerId, Power>): Unit[] {
  const units: Unit[] = [];
  for (const power of Object.values(powers)) {
    for (const unit of power.units) {
      units.push(unit);
    }
  }
  return units;
}

interface SupportableUnit {
  unit: Unit;
  label: string;
}

/**
 * Get the set of base territory IDs a unit can reach (for support purposes).
 * This is the same logic as getValidMoveDestinations but returns a Set of IDs.
 */
function getReachableSet(
  unitType: UnitType,
  location: string,
  coast: string | undefined,
  territories: Record<string, Territory>,
): Set<string> {
  const fromBase = baseTerritory(location);
  const fromTerritory = territories[fromBase];
  if (!fromTerritory) return new Set();

  let adjacencies: string[];
  if (unitType === 'fleet' && coast && fromTerritory.coasts) {
    const coastDef = fromTerritory.coasts.find(c => c.id === coast);
    adjacencies = coastDef ? coastDef.adjacencies : fromTerritory.adjacencies;
  } else {
    adjacencies = fromTerritory.adjacencies;
  }

  const reachable = new Set<string>();
  for (const adj of adjacencies) {
    const adjBase = baseTerritory(adj);
    if (adjBase === fromBase) continue;
    const dest = territories[adjBase];
    if (!dest) continue;
    if (unitType === 'army' && dest.type === 'sea') continue;
    if (unitType === 'fleet' && dest.type === 'land') continue;
    reachable.add(adjBase);
  }
  return reachable;
}

/**
 * Get units that this supporter can support (hold or move).
 * A unit is supportable if:
 * 1. It's in a territory the supporter can reach (hold-support), OR
 * 2. It has at least one valid move destination that the supporter can also reach (move-support)
 * Excludes the supporter's own territory.
 */
export function getSupportableUnits(
  supporterType: UnitType,
  supporterLoc: string,
  supporterCoast: string | undefined,
  allUnits: Unit[],
  territories: Record<string, Territory>,
): SupportableUnit[] {
  const supporterBase = baseTerritory(supporterLoc);
  const supporterReach = getReachableSet(supporterType, supporterLoc, supporterCoast, territories);

  const results: SupportableUnit[] = [];

  for (const unit of allUnits) {
    const unitBase = baseTerritory(unit.territory);
    if (unitBase === supporterBase) continue; // can't support yourself

    // Can the supporter reach the unit's location? (hold-support)
    const canHoldSupport = supporterReach.has(unitBase);

    // Can the supporter reach any of the unit's move destinations? (move-support)
    const unitReach = getReachableSet(unit.type, unit.territory, unit.coast, territories);
    let canMoveSupport = false;
    for (const dest of unitReach) {
      if (supporterReach.has(dest)) {
        canMoveSupport = true;
        break;
      }
    }

    if (canHoldSupport || canMoveSupport) {
      const prefix = unit.type === 'army' ? 'A' : 'F';
      const terr = territories[unitBase];
      const name = terr ? terr.name : unitBase.toUpperCase();
      results.push({
        unit,
        label: `${prefix} ${name}`,
      });
    }
  }

  results.sort((a, b) => a.label.localeCompare(b.label));
  return results;
}

interface SupportDestOption {
  id: string;
  name: string;
  isHold: boolean;
}

/**
 * Get valid destinations for a support order (where the supported unit can go
 * that the supporter can also reach), plus a "Hold" option if applicable.
 */
export function getSupportDestinations(
  supporterType: UnitType,
  supporterLoc: string,
  supporterCoast: string | undefined,
  supportedUnit: Unit,
  territories: Record<string, Territory>,
  allUnits?: Unit[],
): SupportDestOption[] {
  const supporterReach = getReachableSet(supporterType, supporterLoc, supporterCoast, territories);
  const supportedBase = baseTerritory(supportedUnit.territory);
  const supportedReach = getReachableSet(supportedUnit.type, supportedUnit.territory, supportedUnit.coast, territories);

  // For armies, also include convoy-reachable destinations in their reach
  if (supportedUnit.type === 'army' && allUnits) {
    const convoyDests = getConvoyReachableDestinations(
      supportedUnit.territory,
      supportedUnit.power,
      allUnits,
      territories,
    );
    for (const dest of convoyDests) {
      supportedReach.add(dest.id);
    }
  }

  const results: SupportDestOption[] = [];

  // Hold option: supporter can reach the supported unit's territory
  if (supporterReach.has(supportedBase)) {
    const terr = territories[supportedBase];
    const name = terr ? terr.name : supportedBase.toUpperCase();
    results.push({ id: supportedBase, name: `Hold in ${name}`, isHold: true });
  }

  // Move destinations: intersection of supporter's and supported unit's reachable sets
  for (const dest of supportedReach) {
    if (supporterReach.has(dest)) {
      const terr = territories[dest];
      const name = terr ? terr.name : dest.toUpperCase();
      results.push({ id: dest, name, isHold: false });
    }
  }

  // Sort: Hold first, then alphabetical
  results.sort((a, b) => {
    if (a.isHold && !b.isHold) return -1;
    if (!a.isHold && b.isHold) return 1;
    return a.name.localeCompare(b.name);
  });

  return results;
}

/**
 * Get armies that a convoying fleet can convoy (armies adjacent to the fleet's sea zone).
 */
export function getConvoyableArmies(
  fleetLoc: string,
  _fleetCoast: string | undefined,
  allUnits: Unit[],
  territories: Record<string, Territory>,
): SupportableUnit[] {
  const fleetBase = baseTerritory(fleetLoc);
  const fleetTerritory = territories[fleetBase];
  if (!fleetTerritory || fleetTerritory.type !== 'sea') return [];

  const adjacentBases = new Set<string>();
  for (const adj of fleetTerritory.adjacencies) {
    adjacentBases.add(baseTerritory(adj));
  }

  const results: SupportableUnit[] = [];
  for (const unit of allUnits) {
    if (unit.type !== 'army') continue;
    const unitBase = baseTerritory(unit.territory);
    if (adjacentBases.has(unitBase)) {
      const terr = territories[unitBase];
      const name = terr ? terr.name : unitBase.toUpperCase();
      results.push({ unit, label: `A ${name}` });
    }
  }

  results.sort((a, b) => a.label.localeCompare(b.label));
  return results;
}

/**
 * Get coastal territories reachable by an army via convoy through friendly fleets.
 * BFS through sea zones occupied by friendly fleets, collecting coastal territories adjacent
 * to any reached sea zone.
 */
export function getConvoyReachableDestinations(
  armyLocation: string,
  playerPower: PowerId,
  allUnits: Unit[],
  territories: Record<string, Territory>,
): DestOption[] {
  const armyBase = baseTerritory(armyLocation);

  // Index friendly fleets by their base territory for quick lookup
  const friendlyFleetLocations = new Set<string>();
  for (const unit of allUnits) {
    if (unit.type === 'fleet' && unit.power === playerPower) {
      friendlyFleetLocations.add(baseTerritory(unit.territory));
    }
  }

  // BFS through sea zones that have friendly fleets
  const visited = new Set<string>();
  const queue: string[] = [];

  // Seed: sea zones adjacent to the army that have a friendly fleet
  const armyTerritory = territories[armyBase];
  if (!armyTerritory) return [];

  for (const adj of armyTerritory.adjacencies) {
    const adjBase = baseTerritory(adj);
    if (visited.has(adjBase)) continue;
    const adjTerr = territories[adjBase];
    if (!adjTerr || adjTerr.type !== 'sea') continue;
    if (!friendlyFleetLocations.has(adjBase)) continue;
    visited.add(adjBase);
    queue.push(adjBase);
  }

  // Expand: adjacent sea zones that also have friendly fleets
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentTerr = territories[current];
    if (!currentTerr) continue;

    for (const adj of currentTerr.adjacencies) {
      const adjBase = baseTerritory(adj);
      if (visited.has(adjBase)) continue;
      const adjTerr = territories[adjBase];
      if (!adjTerr || adjTerr.type !== 'sea') continue;
      if (!friendlyFleetLocations.has(adjBase)) continue;
      visited.add(adjBase);
      queue.push(adjBase);
    }
  }

  // Collect: coastal territories adjacent to any reached sea zone (excluding army's own territory)
  const seen = new Set<string>();
  const results: DestOption[] = [];

  for (const seaZone of visited) {
    const seaTerr = territories[seaZone];
    if (!seaTerr) continue;

    for (const adj of seaTerr.adjacencies) {
      const adjBase = baseTerritory(adj);
      if (adjBase === armyBase) continue;
      if (seen.has(adjBase)) continue;
      seen.add(adjBase);

      const dest = territories[adjBase];
      if (!dest) continue;
      if (dest.type === 'sea') continue; // armies can't land on sea

      results.push({ id: adjBase, name: dest.name });
    }
  }

  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

/**
 * Get valid convoy destinations for a convoy order.
 * Computes all coastal territories reachable by the army via chains of friendly fleets.
 * In a multi-fleet convoy, each fleet must specify the army's FINAL destination.
 */
export function getConvoyDestinations(
  armyLocation: string,
  playerPower: PowerId,
  allUnits: Unit[],
  territories: Record<string, Territory>,
): DestOption[] {
  return getConvoyReachableDestinations(armyLocation, playerPower, allUnits, territories);
}
