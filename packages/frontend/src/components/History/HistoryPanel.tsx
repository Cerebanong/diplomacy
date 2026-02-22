import { useEffect, useState } from 'react';
import type { GameState, TurnResult, OrderResolution, PowerId, Phase, Order, BuildOrder } from '@diplomacy/shared';
import { apiUrl } from '../../config';

interface HistoryPanelProps {
  gameState: GameState;
  gameId: string;
}

const PHASE_NAMES: Record<string, string> = {
  spring_orders: 'Spring Orders',
  spring_retreats: 'Spring Retreats',
  fall_orders: 'Fall Orders',
  fall_retreats: 'Fall Retreats',
  winter_builds: 'Winter Adjustments',
};

const POWER_COLORS: Record<string, string> = {
  england: 'bg-england',
  france: 'bg-france',
  germany: 'bg-germany',
  italy: 'bg-italy',
  austria: 'bg-austria',
  russia: 'bg-russia',
  turkey: 'bg-turkey',
};

const POWER_NAMES: Record<string, string> = {
  england: 'England',
  france: 'France',
  germany: 'Germany',
  italy: 'Italy',
  austria: 'Austria-Hungary',
  russia: 'Russia',
  turkey: 'Turkey',
};

const ALL_POWERS: PowerId[] = ['england', 'france', 'germany', 'italy', 'austria', 'russia', 'turkey'];

function territoryName(id: string, territories: Record<string, { name: string }>): string {
  return territories[id]?.name ?? id;
}

function formatOrder(order: Order | any, territories: Record<string, { name: string }>): string {
  const prefix = order.unitType === 'army' ? 'A' : 'F';
  const loc = territoryName(order.location, territories);

  // Retreat orders have no `type` field — detect them by checking for `destination` without `type`
  if (!order.type) {
    if (order.destination) {
      const dest = territoryName(order.destination, territories);
      return `${prefix} ${loc} retreats to ${dest}`;
    }
    return `${prefix} ${loc} disbanded`;
  }

  switch (order.type) {
    case 'hold':
      return `${prefix} ${loc} Hold`;
    case 'move': {
      const dest = territoryName(order.destination, territories);
      return `${prefix} ${loc} \u2192 ${dest}`;
    }
    case 'support': {
      const sPrefix = order.supportedUnit.type === 'army' ? 'A' : 'F';
      const sLoc = territoryName(order.supportedUnit.location, territories);
      if (order.supportDestination) {
        const sDest = territoryName(order.supportDestination, territories);
        return `${prefix} ${loc} supports ${sPrefix} ${sLoc} \u2192 ${sDest}`;
      }
      return `${prefix} ${loc} supports ${sPrefix} ${sLoc} hold`;
    }
    case 'convoy': {
      const aLoc = territoryName(order.convoyedArmy.location, territories);
      const cDest = territoryName(order.convoyDestination, territories);
      return `${prefix} ${loc} convoys A ${aLoc} \u2192 ${cDest}`;
    }
    default:
      return `${prefix} ${loc}`;
  }
}

function formatBuild(build: BuildOrder, territories: Record<string, { name: string }>): string {
  if (build.action === 'waive') return 'Waive build';
  const prefix = build.unitType === 'army' ? 'A' : 'F';
  const loc = build.location ? territoryName(build.location, territories) : '?';
  if (build.action === 'build') return `Build ${prefix} ${loc}`;
  return `Disband ${prefix} ${loc}`;
}

interface ScChange {
  power: PowerId;
  gains: string[];
  losses: string[];
  total: number;
}

function computeScChanges(
  current: TurnResult,
  previous: TurnResult | undefined,
  territories: Record<string, { name: string }>,
): ScChange[] {
  const changes: ScChange[] = [];

  for (const power of ALL_POWERS) {
    const curScs = new Set(current.newState.powers[power]?.supplyCenters ?? []);
    let prevScs: Set<string>;

    if (previous) {
      prevScs = new Set(previous.newState.powers[power]?.supplyCenters ?? []);
    } else {
      // First fall turn — previous is initial 3 home SCs per power
      // Use the current power's home supply centers from territory data
      const homeScs = Object.values(territories)
        .filter(t => (t as any).isSupplyCenter && (t as any).homeSupplyCenter === power)
        .map(t => (t as any).id ?? '');
      prevScs = new Set(homeScs.filter(Boolean));
    }

    const gains: string[] = [];
    const losses: string[] = [];

    for (const sc of curScs) {
      if (!prevScs.has(sc)) gains.push(sc);
    }
    for (const sc of prevScs) {
      if (!curScs.has(sc)) losses.push(sc);
    }

    if (gains.length > 0 || losses.length > 0) {
      changes.push({ power, gains, losses, total: curScs.size });
    }
  }

  return changes;
}

function isFallPhase(phase: Phase): boolean {
  return phase === 'fall_orders' || phase === 'fall_retreats';
}

function orderMatchesPower(order: Order, power: PowerId): boolean {
  return order.power === power;
}

export function HistoryPanel({ gameState, gameId }: HistoryPanelProps) {
  const [turnHistory, setTurnHistory] = useState<TurnResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPower, setFilterPower] = useState<PowerId | 'all'>('all');

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      setIsLoading(true);
      try {
        const response = await fetch(apiUrl(`/api/game/${gameId}/history`));
        if (!response.ok) throw new Error('Failed to fetch history');
        const data = await response.json();
        if (!cancelled) {
          setTurnHistory(data.turnHistory ?? []);
        }
      } catch (err) {
        console.error('Failed to load history:', err);
        if (!cancelled) setTurnHistory([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchHistory();
    return () => { cancelled = true; };
  }, [gameId, gameState.year, gameState.phase]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-[#8b7355] text-sm">Loading history...</div>
      </div>
    );
  }

  if (turnHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#8b7355] gap-2 px-6">
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium text-sm">No history yet</span>
        <span className="text-xs text-center">Turn history will appear here after the first orders are resolved.</span>
      </div>
    );
  }

  // Find the last fall turn before each turn for SC change computation
  const fallTurns = turnHistory.filter(t => isFallPhase(t.phase));

  // Reversed for display (most recent first)
  const reversedHistory = [...turnHistory].reverse();

  return (
    <div className="flex flex-col h-full">
      {/* Filter Bar */}
      <div className="p-3 border-b border-amber-900/20">
        <select
          value={filterPower}
          onChange={(e) => setFilterPower(e.target.value as PowerId | 'all')}
          className="w-full text-sm border border-amber-900/20 rounded px-2 py-1.5 bg-[#f4e8c1]/60 text-[#4a3520]"
        >
          <option value="all">All Powers</option>
          {ALL_POWERS.map(p => (
            <option key={p} value={p}>{POWER_NAMES[p]}</option>
          ))}
        </select>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {reversedHistory.map((turn, idx) => {
          const reversedIdx = turnHistory.length - 1 - idx;
          const prevTurn = reversedIdx > 0 ? turnHistory[reversedIdx - 1] : undefined;

          // Collect entries for this turn
          const entries: JSX.Element[] = [];

          // Order resolutions
          if (turn.resolutions && turn.resolutions.length > 0) {
            const filteredResolutions = filterPower === 'all'
              ? turn.resolutions
              : turn.resolutions.filter(r => orderMatchesPower(r.order, filterPower));

            for (const res of filteredResolutions) {
              entries.push(
                <OrderEntry
                  key={`${res.order.power}-${res.order.location}-${res.order.type}`}
                  resolution={res}
                  territories={gameState.territories}
                />
              );
            }
          }

          // Builds
          if (turn.builds) {
            for (const [power, builds] of Object.entries(turn.builds)) {
              if (filterPower !== 'all' && power !== filterPower) continue;
              for (const build of builds) {
                entries.push(
                  <BuildEntry
                    key={`build-${power}-${build.location}-${build.action}`}
                    build={build}
                    power={power as PowerId}
                    territories={gameState.territories}
                  />
                );
              }
            }
          }

          // SC Changes (after fall phases)
          let scCard: JSX.Element | null = null;
          if (isFallPhase(turn.phase)) {
            const fallIdx = fallTurns.indexOf(turn);
            const prevFall = fallIdx > 0 ? fallTurns[fallIdx - 1] : undefined;
            const changes = computeScChanges(turn, prevFall, gameState.territories);
            const filteredChanges = filterPower === 'all'
              ? changes
              : changes.filter(c => c.power === filterPower);

            if (filteredChanges.length > 0) {
              scCard = (
                <div className="mx-3 my-2 p-2 bg-[#ede0b8]/50 rounded border border-amber-900/20 text-xs space-y-1">
                  <div className="font-semibold text-[#4a3520] mb-1">Supply Center Changes</div>
                  {filteredChanges.map(ch => (
                    <div key={ch.power} className="flex items-start gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0 ${POWER_COLORS[ch.power]}`} />
                      <div>
                        <span className="font-medium text-[#4a3520]">{POWER_NAMES[ch.power]}</span>
                        {ch.gains.length > 0 && (
                          <span className="text-green-700 ml-1">
                            {ch.gains.map(g => `+${territoryName(g, gameState.territories)}`).join(', ')}
                          </span>
                        )}
                        {ch.losses.length > 0 && (
                          <span className="text-red-700 ml-1">
                            {ch.losses.map(l => `\u2212${territoryName(l, gameState.territories)}`).join(', ')}
                          </span>
                        )}
                        <span className="text-[#8b7355] ml-1">({ch.total} SC)</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            }
          }

          // Elimination cards
          const eliminationCards: JSX.Element[] = [];
          for (const powerId of ALL_POWERS) {
            if (filterPower !== 'all' && powerId !== filterPower) continue;
            const wasEliminated = prevTurn?.newState.powers[powerId]?.isEliminated ?? false;
            const isEliminated = turn.newState.powers[powerId]?.isEliminated ?? false;
            if (!wasEliminated && isEliminated) {
              eliminationCards.push(
                <div key={`elim-${powerId}`} className="mx-3 my-2 p-2 bg-[#e8c0a0]/40 rounded border border-[#a07040]/30 text-xs flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${POWER_COLORS[powerId]}`} />
                  <span className="font-semibold text-[#8b3a1a]">{POWER_NAMES[powerId]} eliminated</span>
                </div>
              );
            }
          }

          // Game end card
          let gameEndCard: JSX.Element | null = null;
          if (turn.newState.isComplete) {
            const isDraw = turn.newState.isDraw;
            const winner = turn.newState.winner;
            const survivors = ALL_POWERS.filter(p => !turn.newState.powers[p].isEliminated);
            gameEndCard = (
              <div className="mx-3 my-2 p-3 bg-[#e8d9a8]/60 rounded border border-amber-900/30 text-sm text-center">
                {isDraw ? (
                  <span className="font-bold text-[#6b4a20]">
                    Draw among {survivors.map(p => POWER_NAMES[p]).join(', ')}
                  </span>
                ) : (
                  <span className="font-bold text-[#6b4a20]">
                    Victory! {POWER_NAMES[winner!]} wins
                  </span>
                )}
                <div className="text-xs text-[#8b7355] mt-1">
                  Game ended in {turn.newState.year}
                </div>
              </div>
            );
          }

          // Skip section if filter hides everything
          if (entries.length === 0 && !scCard && eliminationCards.length === 0 && !gameEndCard) return null;

          return (
            <div key={`${turn.year}-${turn.phase}-${reversedIdx}`}>
              {/* Section Header */}
              <div className="sticky top-0 bg-[#e8d9a8]/80 border-b border-amber-900/20 px-3 py-2 text-xs font-semibold text-[#4a3520] z-10">
                {PHASE_NAMES[turn.phase] ?? turn.phase} {turn.year}
              </div>
              <div className="py-1">
                {entries}
              </div>
              {scCard}
              {eliminationCards}
              {gameEndCard}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderEntry({
  resolution,
  territories,
}: {
  resolution: OrderResolution;
  territories: Record<string, { name: string }>;
}) {
  const { order, success, reason } = resolution;
  const text = formatOrder(order, territories);

  return (
    <div className={`flex items-start gap-2 px-3 py-1 text-sm ${success ? 'text-[#3d2b1a]' : 'text-[#8b7355] line-through'}`}>
      <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${POWER_COLORS[order.power]}`} />
      <div className="flex-1 min-w-0">
        <span>{text}</span>
      </div>
      <div className="flex-shrink-0">
        {success ? (
          <span className="text-green-700">{'\u2713'}</span>
        ) : (
          <span className="text-red-700" title={reason}>{'\u2717'}</span>
        )}
      </div>
    </div>
  );
}

function BuildEntry({
  build,
  power,
  territories,
}: {
  build: BuildOrder;
  power: PowerId;
  territories: Record<string, { name: string }>;
}) {
  const text = formatBuild(build, territories);

  return (
    <div className="flex items-start gap-2 px-3 py-1 text-sm text-[#3d2b1a]">
      <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${POWER_COLORS[power]}`} />
      <div className="flex-1 min-w-0">
        <span>{text}</span>
      </div>
    </div>
  );
}
