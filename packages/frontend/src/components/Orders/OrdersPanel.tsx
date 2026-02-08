import { useState, useEffect, useMemo } from 'react';
import type { GameState, Order, Unit } from '@diplomacy/shared';
import { Play, Trash2, Plus, Minus } from 'lucide-react';
import { apiUrl } from '../../config';
import {
  baseTerritory,
  getValidMoveDestinations,
  getRequiredCoasts,
  getAllUnits,
  getSupportableUnits,
  getSupportDestinations,
  getConvoyableArmies,
  getConvoyDestinations,
  getConvoyReachableDestinations,
} from './orderHelpers';

interface OrdersPanelProps {
  gameState: GameState;
  gameId: string;
  aiNegotiationsInProgress: boolean;
  onOrdersSubmitted: (newState: GameState) => void;
}

type OrderType = 'hold' | 'move' | 'support' | 'convoy';

interface DraftOrder {
  id: string;
  unitType: 'army' | 'fleet';
  location: string;
  coast?: string;
  type: OrderType;
  destination?: string;
  destinationCoast?: string;
  supportedUnit?: { type: 'army' | 'fleet'; location: string };
  supportDestination?: string;
  supportIsHold?: boolean;
  viaConvoy?: boolean;
  convoyedArmy?: { location: string };
  convoyDestination?: string;
}

interface DraftBuild {
  action: 'build' | 'disband';
  unitType?: 'army' | 'fleet';
  location: string;
  coast?: string;
}

export function OrdersPanel({
  gameState,
  gameId,
  aiNegotiationsInProgress,
  onOrdersSubmitted,
}: OrdersPanelProps) {
  const [orders, setOrders] = useState<DraftOrder[]>([]);
  const [draftBuilds, setDraftBuilds] = useState<DraftBuild[]>([]);
  const [draftRetreats, setDraftRetreats] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnResult, setTurnResult] = useState<string | null>(null);

  const isBuildPhase = gameState.phase === 'winter_builds';
  const isRetreatPhase = gameState.phase === 'spring_retreats' || gameState.phase === 'fall_retreats';

  useEffect(() => {
    if (turnResult) {
      const timer = setTimeout(() => setTurnResult(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [turnResult]);

  // Clear draft builds and retreats when phase changes
  useEffect(() => {
    setDraftBuilds([]);
    setDraftRetreats({});
  }, [gameState.phase, gameState.year]);

  const playerPower = gameState.powers[gameState.playerPower];
  const units = playerPower.units;
  const territories = gameState.territories;

  const allUnits = useMemo(() => getAllUnits(gameState.powers), [gameState.powers]);

  // Winter builds calculations
  const adjustment = playerPower.supplyCenters.length - playerPower.units.length;

  const availableBuildLocations = useMemo(() => {
    if (!isBuildPhase || adjustment <= 0) return [];
    const occupied = new Set(allUnits.map(u => baseTerritory(u.territory)));
    // Also exclude locations already chosen for a build
    const alreadyBuilding = new Set(draftBuilds.filter(b => b.action === 'build').map(b => b.location));
    return playerPower.supplyCenters.filter(sc => {
      const territory = territories[sc];
      return territory?.homeSupplyCenter === gameState.playerPower
        && !occupied.has(sc)
        && !alreadyBuilding.has(sc);
    });
  }, [isBuildPhase, adjustment, allUnits, playerPower, territories, gameState.playerPower, draftBuilds]);

  const disbandCount = adjustment < 0 ? -adjustment : 0;
  const buildCount = adjustment > 0 ? adjustment : 0;
  const currentDisbands = draftBuilds.filter(b => b.action === 'disband');
  const currentBuilds = draftBuilds.filter(b => b.action === 'build');

  const addBuild = (location: string, unitType: 'army' | 'fleet') => {
    if (currentBuilds.length >= buildCount) return;
    setDraftBuilds(prev => [...prev, { action: 'build', unitType, location }]);
  };

  const addDisband = (unit: Unit) => {
    if (currentDisbands.length >= disbandCount) return;
    if (draftBuilds.some(b => b.action === 'disband' && b.location === unit.territory)) return;
    setDraftBuilds(prev => [...prev, { action: 'disband', unitType: unit.type, location: unit.territory }]);
  };

  const removeDraftBuild = (location: string) => {
    setDraftBuilds(prev => prev.filter(b => b.location !== location));
  };

  const handleSubmitBuilds = async () => {
    setIsSubmitting(true);
    try {
      const previousPhase = formatPhase(gameState.phase, gameState.year);
      const response = await fetch(apiUrl(`/api/game/${gameId}/builds`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ builds: draftBuilds }),
      });

      if (response.ok) {
        const result = await response.json();
        const newPhase = formatPhase(result.newState.phase, result.newState.year);
        setTurnResult(`${previousPhase} resolved — advancing to ${newPhase}`);
        setDraftBuilds([]);
        onOrdersSubmitted(result.newState);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit builds');
      }
    } catch (err) {
      console.error('Failed to submit builds:', err);
      alert('Failed to submit builds');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addOrder = (unit: typeof units[0]) => {
    const existingOrder = orders.find(o => o.location === unit.territory);
    if (existingOrder) return;

    setOrders(prev => [
      ...prev,
      {
        id: `${unit.territory}-${Date.now()}`,
        unitType: unit.type,
        location: unit.territory,
        coast: unit.coast,
        type: 'hold',
      },
    ]);
  };

  const updateOrder = (id: string, updates: Partial<DraftOrder>) => {
    setOrders(prev =>
      prev.map(o => (o.id === id ? { ...o, ...updates } : o))
    );
  };

  const removeOrder = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const formatPhase = (phase: string, year: number) => {
    const name = phase.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `${name} ${year}`;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const finalOrders: Order[] = units.map(unit => {
        const existingOrder = orders.find(o => o.location === unit.territory);
        if (existingOrder) {
          const base: Record<string, unknown> = {
            power: gameState.playerPower,
            type: existingOrder.type,
            unitType: existingOrder.unitType,
            location: existingOrder.location,
            coast: existingOrder.coast,
          };

          if (existingOrder.type === 'move') {
            base.destination = existingOrder.destination;
            base.destinationCoast = existingOrder.destinationCoast;
            base.viaConvoy = existingOrder.viaConvoy || undefined;
          } else if (existingOrder.type === 'support') {
            base.supportedUnit = existingOrder.supportedUnit;
            base.supportDestination = existingOrder.supportIsHold ? undefined : existingOrder.supportDestination;
          } else if (existingOrder.type === 'convoy') {
            base.convoyedArmy = existingOrder.convoyedArmy;
            base.convoyDestination = existingOrder.convoyDestination;
          }

          return base as unknown as Order;
        }
        return {
          power: gameState.playerPower,
          type: 'hold' as const,
          unitType: unit.type,
          location: unit.territory,
        };
      });

      const previousPhase = formatPhase(gameState.phase, gameState.year);

      const response = await fetch(apiUrl(`/api/game/${gameId}/orders`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: finalOrders }),
      });

      if (response.ok) {
        const result = await response.json();
        const newPhase = formatPhase(result.newState.phase, result.newState.year);
        setTurnResult(`${previousPhase} resolved — advancing to ${newPhase}`);
        setOrders([]);
        onOrdersSubmitted(result.newState);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit orders');
      }
    } catch (err) {
      console.error('Failed to submit orders:', err);
      alert('Failed to submit orders');
    } finally {
      setIsSubmitting(false);
    }
  };

  const unorderedUnits = units.filter(
    u => !orders.some(o => o.location === u.territory)
  );

  const handleTypeChange = (orderId: string, newType: OrderType) => {
    updateOrder(orderId, {
      type: newType,
      destination: undefined,
      destinationCoast: undefined,
      viaConvoy: undefined,
      supportedUnit: undefined,
      supportDestination: undefined,
      supportIsHold: undefined,
      convoyedArmy: undefined,
      convoyDestination: undefined,
    });
  };

  const renderMoveFields = (order: DraftOrder) => {
    const directDestinations = getValidMoveDestinations(order.unitType, order.location, order.coast, territories);
    const convoyDestinations = order.unitType === 'army'
      ? getConvoyReachableDestinations(order.location, gameState.playerPower, allUnits, territories)
      : [];
    const showConvoyToggle = order.unitType === 'army' && convoyDestinations.length > 0;
    const destinations = order.viaConvoy ? convoyDestinations : directDestinations;

    const coasts = order.destination
      ? getRequiredCoasts(order.unitType, order.location, order.coast, order.destination, territories)
      : null;

    return (
      <>
        {showConvoyToggle && (
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={!!order.viaConvoy}
              onChange={e => {
                updateOrder(order.id, {
                  viaConvoy: e.target.checked || undefined,
                  destination: undefined,
                  destinationCoast: undefined,
                });
              }}
              className="rounded border-gray-300"
            />
            Via Convoy
          </label>
        )}

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Destination</label>
          <select
            value={order.destination || ''}
            onChange={e => {
              const dest = e.target.value || undefined;
              const newCoasts = dest
                ? getRequiredCoasts(order.unitType, order.location, order.coast, dest, territories)
                : null;
              // Auto-select if only 1 coast
              const autoCoast = newCoasts && newCoasts.length === 1 ? newCoasts[0].id : undefined;
              updateOrder(order.id, {
                destination: dest,
                destinationCoast: autoCoast,
              });
            }}
            className="w-full p-2 border border-gray-300 rounded text-sm"
          >
            <option value="">— Select destination —</option>
            {destinations.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {coasts && coasts.length > 1 && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Coast</label>
            <select
              value={order.destinationCoast || ''}
              onChange={e => updateOrder(order.id, { destinationCoast: e.target.value || undefined })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            >
              <option value="">— Select coast —</option>
              {coasts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </>
    );
  };

  const renderSupportFields = (order: DraftOrder) => {
    const supportable = getSupportableUnits(order.unitType, order.location, order.coast, allUnits, territories);

    // Find the selected supported unit
    let selectedUnit: Unit | undefined;
    if (order.supportedUnit) {
      selectedUnit = allUnits.find(
        u => u.type === order.supportedUnit!.type && baseTerritory(u.territory) === baseTerritory(order.supportedUnit!.location)
      );
    }

    const supportDests = selectedUnit
      ? getSupportDestinations(order.unitType, order.location, order.coast, selectedUnit, territories)
      : [];

    return (
      <>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Support unit</label>
          <select
            value={order.supportedUnit ? `${order.supportedUnit.type}|${order.supportedUnit.location}` : ''}
            onChange={e => {
              if (!e.target.value) {
                updateOrder(order.id, {
                  supportedUnit: undefined,
                  supportDestination: undefined,
                  supportIsHold: undefined,
                });
                return;
              }
              const [type, loc] = e.target.value.split('|');
              updateOrder(order.id, {
                supportedUnit: { type: type as 'army' | 'fleet', location: loc },
                supportDestination: undefined,
                supportIsHold: undefined,
              });
            }}
            className="w-full p-2 border border-gray-300 rounded text-sm"
          >
            <option value="">— Select unit to support —</option>
            {supportable.map(s => (
              <option key={`${s.unit.type}|${s.unit.territory}`} value={`${s.unit.type}|${s.unit.territory}`}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {order.supportedUnit && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">To</label>
            <select
              value={
                order.supportIsHold
                  ? `hold|${baseTerritory(order.supportedUnit.location)}`
                  : order.supportDestination
                    ? `move|${order.supportDestination}`
                    : ''
              }
              onChange={e => {
                if (!e.target.value) {
                  updateOrder(order.id, { supportDestination: undefined, supportIsHold: undefined });
                  return;
                }
                const [action, dest] = e.target.value.split('|');
                if (action === 'hold') {
                  updateOrder(order.id, { supportDestination: dest, supportIsHold: true });
                } else {
                  updateOrder(order.id, { supportDestination: dest, supportIsHold: false });
                }
              }}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            >
              <option value="">— Select destination —</option>
              {supportDests.map(d => (
                <option
                  key={`${d.isHold ? 'hold' : 'move'}|${d.id}`}
                  value={`${d.isHold ? 'hold' : 'move'}|${d.id}`}
                >
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </>
    );
  };

  const renderConvoyFields = (order: DraftOrder) => {
    const convoyableArmies = getConvoyableArmies(order.location, order.coast, allUnits, territories);
    const convoyDests = getConvoyDestinations(order.location, territories);

    if (convoyableArmies.length === 0) {
      return (
        <p className="text-xs text-gray-400 italic">No armies adjacent to convoy</p>
      );
    }

    return (
      <>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Convoy army</label>
          <select
            value={order.convoyedArmy?.location || ''}
            onChange={e => {
              updateOrder(order.id, {
                convoyedArmy: e.target.value ? { location: e.target.value } : undefined,
                convoyDestination: undefined,
              });
            }}
            className="w-full p-2 border border-gray-300 rounded text-sm"
          >
            <option value="">— Select army —</option>
            {convoyableArmies.map(a => (
              <option key={a.unit.territory} value={a.unit.territory}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {order.convoyedArmy && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">To</label>
            <select
              value={order.convoyDestination || ''}
              onChange={e => updateOrder(order.id, { convoyDestination: e.target.value || undefined })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            >
              <option value="">— Select destination —</option>
              {convoyDests.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}
      </>
    );
  };

  // ── Winter builds UI ──────────────────────────────────────────────────────
  if (isBuildPhase) {
    const canSubmitBuilds = adjustment === 0
      || (adjustment > 0 && currentBuilds.length <= buildCount)
      || (adjustment < 0 && currentDisbands.length === disbandCount);

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">WINTER BUILDS</h3>
          <div className="mt-1 text-sm text-gray-500">
            <span>Supply Centers: {playerPower.supplyCenters.length}</span>
            <span className="mx-2">|</span>
            <span>Units: {playerPower.units.length}</span>
          </div>
          {adjustment > 0 && (
            <p className="mt-1 text-sm text-green-600 font-medium">
              You may build up to {buildCount} unit{buildCount > 1 ? 's' : ''}
            </p>
          )}
          {adjustment < 0 && (
            <p className="mt-1 text-sm text-red-600 font-medium">
              You must disband {disbandCount} unit{disbandCount > 1 ? 's' : ''}
            </p>
          )}
          {adjustment === 0 && (
            <p className="mt-1 text-sm text-gray-500">No adjustments needed</p>
          )}
        </div>

        {/* Build/Disband content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Pending builds/disbands */}
          {draftBuilds.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium uppercase">Pending adjustments</p>
              {draftBuilds.map(b => (
                <div
                  key={b.location}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    b.action === 'build'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <span className="text-sm font-medium">
                    {b.action === 'build' ? 'Build' : 'Disband'}{' '}
                    {b.unitType === 'army' ? 'A' : 'F'} {b.location.toUpperCase()}
                  </span>
                  <button
                    onClick={() => removeDraftBuild(b.location)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Available build locations */}
          {adjustment > 0 && currentBuilds.length < buildCount && (
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase mb-2">
                Build locations ({currentBuilds.length}/{buildCount})
              </p>
              {availableBuildLocations.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No available home supply centers</p>
              ) : (
                <div className="space-y-2">
                  {availableBuildLocations.map(loc => {
                    const territory = territories[loc];
                    const canFleet = territory?.type === 'coastal' || territory?.type === 'sea';
                    const canArmy = territory?.type !== 'sea';
                    return (
                      <div
                        key={loc}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                      >
                        <span className="text-sm font-medium">{territory?.name ?? loc.toUpperCase()}</span>
                        <div className="flex gap-2">
                          {canArmy && (
                            <button
                              onClick={() => addBuild(loc, 'army')}
                              className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                            >
                              Army
                            </button>
                          )}
                          {canFleet && (
                            <button
                              onClick={() => addBuild(loc, 'fleet')}
                              className="px-3 py-1 text-xs font-medium bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                            >
                              Fleet
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Units available to disband */}
          {adjustment < 0 && currentDisbands.length < disbandCount && (
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase mb-2">
                Select units to disband ({currentDisbands.length}/{disbandCount})
              </p>
              <div className="space-y-2">
                {units
                  .filter(u => !draftBuilds.some(b => b.action === 'disband' && b.location === u.territory))
                  .map(unit => (
                    <button
                      key={unit.territory}
                      onClick={() => addDisband(unit)}
                      className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-red-50"
                    >
                      <span className="text-sm">
                        {unit.type === 'army' ? 'A' : 'F'} {unit.territory.toUpperCase()}
                      </span>
                      <Minus size={16} className="text-red-400" />
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Submit button */}
          <div className="pt-4">
            {turnResult && (
              <div className="mb-3 text-center py-2 px-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
                {turnResult}
              </div>
            )}
            <button
              onClick={handleSubmitBuilds}
              disabled={isSubmitting || !canSubmitBuilds}
              className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                isSubmitting || !canSubmitBuilds
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              <Play size={20} />
              {isSubmitting ? 'Submitting...' : adjustment === 0 ? 'Continue' : 'Submit Adjustments'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Retreat phase UI ────────────────────────────────────────────────────
  if (isRetreatPhase && gameState.dislodgedUnits?.length) {
    const playerDislodged = gameState.dislodgedUnits.filter(
      du => du.unit.power === gameState.playerPower
    );
    const aiDislodged = gameState.dislodgedUnits.filter(
      du => du.unit.power !== gameState.playerPower
    );

    const handleSubmitRetreats = async () => {
      setIsSubmitting(true);
      try {
        const previousPhase = formatPhase(gameState.phase, gameState.year);
        const retreats = (gameState.dislodgedUnits ?? [])
          .filter(du => du.unit.power === gameState.playerPower)
          .map(du => ({
            unitType: du.unit.type,
            location: du.dislodgedFrom,
            destination: du.validRetreats.length === 0
              ? undefined  // must disband
              : (draftRetreats[du.dislodgedFrom] === 'disband' ? undefined : draftRetreats[du.dislodgedFrom]),
          }));

        const response = await fetch(apiUrl(`/api/game/${gameId}/retreats`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ retreats }),
        });

        if (response.ok) {
          const result = await response.json();
          const newPhase = formatPhase(result.newState.phase, result.newState.year);
          setTurnResult(`${previousPhase} resolved — advancing to ${newPhase}`);
          setDraftRetreats({});
          onOrdersSubmitted(result.newState);
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to submit retreats');
        }
      } catch (err) {
        console.error('Failed to submit retreats:', err);
        alert('Failed to submit retreats');
      } finally {
        setIsSubmitting(false);
      }
    };

    // All player units must have a choice (or be auto-disband)
    const allPlayerRetreatsReady = playerDislodged.every(du =>
      du.validRetreats.length === 0 || draftRetreats[du.dislodgedFrom] !== undefined
    );

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">RETREATS</h3>
          <p className="mt-1 text-sm text-gray-500">
            {gameState.dislodgedUnits.length} unit{gameState.dislodgedUnits.length > 1 ? 's' : ''} dislodged
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Player dislodged units */}
          {playerDislodged.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-medium uppercase">Your dislodged units</p>
              {playerDislodged.map(du => (
                <div
                  key={du.dislodgedFrom}
                  className={`p-3 rounded-lg border ${
                    du.validRetreats.length === 0
                      ? 'bg-gray-100 border-gray-300'
                      : 'bg-orange-50 border-orange-200'
                  }`}
                >
                  <div className="font-semibold text-sm mb-2">
                    {du.unit.type === 'army' ? 'A' : 'F'} {du.dislodgedFrom.toUpperCase()}
                  </div>
                  {du.validRetreats.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Must disband — no valid retreats</p>
                  ) : (
                    <select
                      value={draftRetreats[du.dislodgedFrom] ?? ''}
                      onChange={e => setDraftRetreats(prev => ({
                        ...prev,
                        [du.dislodgedFrom]: e.target.value || undefined,
                      }))}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="">— Select retreat —</option>
                      {du.validRetreats.map(t => (
                        <option key={t} value={t}>
                          Retreat to {(territories[t]?.name ?? t).toUpperCase()}
                        </option>
                      ))}
                      <option value="disband">Disband</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* AI dislodged units (read-only) */}
          {aiDislodged.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium uppercase">Other dislodged units</p>
              {aiDislodged.map(du => (
                <div
                  key={du.dislodgedFrom}
                  className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600"
                >
                  {du.unit.type === 'army' ? 'A' : 'F'} {du.dislodgedFrom.toUpperCase()}
                  {du.validRetreats.length === 0
                    ? ' — will disband'
                    : ' — will retreat'}
                </div>
              ))}
            </div>
          )}

          {/* Submit */}
          <div className="pt-4">
            {turnResult && (
              <div className="mb-3 text-center py-2 px-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
                {turnResult}
              </div>
            )}
            <button
              onClick={handleSubmitRetreats}
              disabled={isSubmitting || (playerDislodged.length > 0 && !allPlayerRetreatsReady)}
              className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                isSubmitting || (playerDislodged.length > 0 && !allPlayerRetreatsReady)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              <Play size={20} />
              {isSubmitting ? 'Submitting...' : 'Submit Retreats'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Orders UI (spring/fall) ──────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800">
          {gameState.phase.replace('_', ' ').toUpperCase()}
        </h3>
        <p className="text-sm text-gray-500">
          {orders.length} of {units.length} units have orders
        </p>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Existing Orders */}
        {orders.map(order => (
          <div
            key={order.id}
            className="bg-gray-50 rounded-lg p-3 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">
                {order.unitType === 'army' ? 'A' : 'F'} {order.location.toUpperCase()}
                {order.coast && ` (${order.coast.split('_')[1]?.toUpperCase()})`}
              </span>
              <button
                onClick={() => removeOrder(order.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <select
                value={order.type}
                onChange={e => handleTypeChange(order.id, e.target.value as OrderType)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              >
                <option value="hold">Hold</option>
                <option value="move">Move</option>
                <option value="support">Support</option>
                {order.unitType === 'fleet' && <option value="convoy">Convoy</option>}
              </select>

              {order.type === 'move' && renderMoveFields(order)}
              {order.type === 'support' && renderSupportFields(order)}
              {order.type === 'convoy' && renderConvoyFields(order)}
            </div>
          </div>
        ))}

        {/* Unordered Units */}
        {unorderedUnits.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500 mb-2">Units without orders:</p>
            <div className="space-y-2">
              {unorderedUnits.map(unit => (
                <button
                  key={unit.territory}
                  onClick={() => addOrder(unit)}
                  className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <span>
                    {unit.type === 'army' ? 'A' : 'F'} {unit.territory.toUpperCase()}
                  </span>
                  <Plus size={16} className="text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4">
          {turnResult && (
            <div className="mb-3 text-center py-2 px-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
              {turnResult}
            </div>
          )}
          {aiNegotiationsInProgress && (
            <div className="mb-3 text-center text-yellow-600 animate-pulse text-sm">
              AI diplomats are negotiating...
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
              isSubmitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            <Play size={20} />
            {isSubmitting ? 'Resolving...' : aiNegotiationsInProgress ? 'Submit Orders' : 'Resolve Turn'}
          </button>
        </div>
      </div>
    </div>
  );
}
