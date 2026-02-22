import { useState, useRef, useMemo } from 'react';
import type { GameState, PowerId, Territory } from '@diplomacy/shared';
import {
  CLASSIC_TERRITORY_VISUALS,
  CLASSIC_POWER_COLORS,
  NEUTRAL_COLORS,
  SUPPLY_CENTER_IDS,
} from '@diplomacy/shared';
import { ZoomPanWrapper } from './ZoomPanWrapper';
import { SupplyCenterMarker } from './SupplyCenterMarker';
import { UnitMarker } from './UnitMarker';
import { TerritoryTooltip } from './TerritoryTooltip';
import { ArmyIcon, FleetIcon } from './UnitIcons';
import { Info } from 'lucide-react';

interface GameMapProps {
  gameState: GameState;
  onTerritoryClick: (territoryId: string) => void;
}

/**
 * Get the fill color for a territory based on ownership
 */
function getTerritoryFill(
  territory: Territory,
  powers: GameState['powers']
): string {
  // Sea territories always use sea color
  if (territory.type === 'sea') {
    return NEUTRAL_COLORS.sea;
  }

  // Check if any power owns this as a supply center
  for (const power of Object.values(powers)) {
    if (power.supplyCenters.includes(territory.id)) {
      return CLASSIC_POWER_COLORS[power.id as PowerId].fill;
    }
  }

  // Check if it's a home supply center (colored by home power even if not yet owned)
  if (territory.homeSupplyCenter) {
    return CLASSIC_POWER_COLORS[territory.homeSupplyCenter].fill;
  }

  // Neutral land
  return NEUTRAL_COLORS.land;
}

/**
 * Get the owner of a supply center
 */
function getSupplyCenterOwner(
  territoryId: string,
  powers: GameState['powers']
): PowerId | null {
  for (const power of Object.values(powers)) {
    if (power.supplyCenters.includes(territoryId)) {
      return power.id as PowerId;
    }
  }
  return null;
}

/**
 * Classic Diplomacy Map SVG with zoom/pan controls
 */
export function GameMap({ gameState, onTerritoryClick }: GameMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredTerritory, setHoveredTerritory] = useState<string | null>(null);
  const [hoveredUnitIdx, setHoveredUnitIdx] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showLegend, setShowLegend] = useState(false);

  // Check if we're in build phase (for supply center pulse animation)
  const isBuildPhase = gameState.phase === 'winter_builds';

  // Get all units flattened with their positions
  const allUnits = useMemo(() => {
    const units: { unit: typeof gameState.powers.england.units[0]; position: { x: number; y: number } }[] = [];

    for (const power of Object.values(gameState.powers)) {
      for (const unit of power.units) {
        const visualData = CLASSIC_TERRITORY_VISUALS[unit.territory];
        if (visualData) {
          // Determine unit position with priority:
          // 1. Fleet on a specific coast -> position above coast label
          // 2. Territory has supply center -> stack above it
          // 3. Fallback -> place near territory label
          let pos: { x: number; y: number };

          const coastMatch = unit.type === 'fleet' && unit.coast && visualData.coastPaths
            ? visualData.coastPaths.find(c => c.id === unit.coast)
            : null;

          if (coastMatch) {
            pos = { x: coastMatch.labelPosition.x, y: coastMatch.labelPosition.y - 14 };
          } else if (visualData.supplyCenterPosition) {
            // Stack unit above supply center marker
            pos = { x: visualData.supplyCenterPosition.x, y: visualData.supplyCenterPosition.y - 24 };
          } else {
            // No supply center: place unit just to the right of the territory label
            const labelPos = visualData.labelPosition;
            const labelText = unit.territory.toUpperCase();
            const fontSize = visualData.labelFontSize ?? 12;
            const labelHalfWidth = labelText.length * 3.5;
            const gap = labelText.length > 3 ? 18 : 12;
            const largeTextNudge = fontSize > 10 ? 6 : 0;
            pos = { x: labelPos.x + labelHalfWidth + gap + largeTextNudge, y: labelPos.y - 4 };
          }
          units.push({
            unit,
            position: pos,
          });
        }
      }
    }

    return units;
  }, [gameState.powers]);

  // Handle mouse move for tooltip positioning
  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  // Crop viewBox to actual map content bounds (with padding)
  // Content ranges: x 50-1066, y 90-1079 based on territory positions
  // Add padding for territory path strokes extending beyond center points
  const vbX = 10;
  const vbY = 55;
  const vbW = 1100;
  const vbH = 1050;

  return (
    <div className="w-full h-full p-1">
    <div className="map-frame w-full h-full">
    <div
      ref={containerRef}
      className="w-full h-full bg-white overflow-hidden relative"
      onMouseMove={handleMouseMove}
    >
      <ZoomPanWrapper aspectRatio={vbW / vbH}>
        <svg
          viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
          className="w-full h-full"
          style={{ backgroundColor: NEUTRAL_COLORS.sea }}
        >
          {/* Definitions */}
          <defs>
            {/* Power gradients */}
            {Object.entries(CLASSIC_POWER_COLORS).map(([powerId, colors]) => (
              <linearGradient
                key={powerId}
                id={`${powerId}Grad`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={colors.fill} />
                <stop offset="100%" stopColor={colors.stroke} />
              </linearGradient>
            ))}

            {/* Neutral gradient */}
            <linearGradient id="neutralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={NEUTRAL_COLORS.land} />
              <stop offset="100%" stopColor="#C4B498" />
            </linearGradient>

            {/* Sea gradient */}
            <linearGradient id="seaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={NEUTRAL_COLORS.sea} />
              <stop offset="100%" stopColor="#9CC4DC" />
            </linearGradient>

            {/* Hatching pattern for impassable territories */}
            <pattern id="impassableHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill={NEUTRAL_COLORS.land} />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#B8A88C" strokeWidth="2" />
            </pattern>

            {/* Supply center glossy gradient */}
            <radialGradient id="scGloss" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="white" stopOpacity={0.35} />
              <stop offset="100%" stopColor="white" stopOpacity={0} />
            </radialGradient>

            {/* Supply center drop shadow */}
            <filter id="scShadow">
              <feDropShadow dx="1" dy="1" stdDeviation="1.5" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Background */}
          <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#seaGrad)" />

          {/* Impassable territories (Switzerland) - rendered before interactive territories */}
          <path
            d="m 225,362 -3,3 -13,-2 -1,4 -14,15 3,3 6,-6 4,7 6,1 8,-2 6,5 2,-5 14,3 2,-4 -4,-6 -7,-4 v -8 l -2,-3 z"
            transform="matrix(1.8885246,0,0,1.8885246,0.9442593,48.157374)"
            fill="url(#impassableHatch)"
            stroke="#999"
            strokeWidth={0.8}
            pointerEvents="none"
          />

          {/* Territories - render in layers: large seas first, then small seas, then land */}
          <g className="territories">
            {Object.entries(gameState.territories)
              .sort(([idA, a], [idB, b]) => {
                // Sea territories render before land (lower = rendered first = behind)
                const aIsSea = a.type === 'sea' ? 0 : 1;
                const bIsSea = b.type === 'sea' ? 0 : 1;
                if (aIsSea !== bIsSea) return aIsSea - bIsSea;
                // Among seas, render larger paths first (behind smaller ones)
                if (a.type === 'sea' && b.type === 'sea') {
                  const aLen = CLASSIC_TERRITORY_VISUALS[idA]?.svgPath?.length ?? 0;
                  const bLen = CLASSIC_TERRITORY_VISUALS[idB]?.svgPath?.length ?? 0;
                  return bLen - aLen;
                }
                return 0;
              })
              .map(([id, territory]) => {
              const visualData = CLASSIC_TERRITORY_VISUALS[id];
              if (!visualData || !visualData.svgPath) return null;

              const fill = getTerritoryFill(territory, gameState.powers);
              const isHovered = hoveredTerritory === id;

              return (
                <path
                  key={id}
                  d={visualData.svgPath}
                  fill={fill}
                  stroke="#333"
                  strokeWidth={isHovered ? 2 : 1}
                  className="territory cursor-pointer transition-opacity"
                  opacity={isHovered ? 0.85 : 1}
                  transform={visualData.transform}
                  onClick={() => onTerritoryClick(id)}
                  onMouseEnter={() => setHoveredTerritory(id)}
                  onMouseLeave={() => setHoveredTerritory(null)}
                />
              );
            })}
          </g>

          {/* Coast Boundaries */}
          <g className="coast-boundaries" pointerEvents="none">
            {Object.entries(CLASSIC_TERRITORY_VISUALS).map(([_id, visualData]) => {
              if (!visualData.coastPaths) return null;
              return visualData.coastPaths.map(coast => (
                <g key={coast.id}>
                  {coast.svgPath && (
                    <path
                      d={coast.svgPath}
                      fill="none"
                      stroke="#666"
                      strokeWidth={1.5}
                      strokeDasharray="4,8"
                    />
                  )}
                  <text
                    x={coast.labelPosition.x}
                    y={coast.labelPosition.y}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="#555"
                    className="select-none"
                  >
                    {coast.label}
                  </text>
                </g>
              ));
            })}
          </g>

          {/* Territory Labels */}
          <g className="territory-labels" pointerEvents="none">
            {Object.entries(gameState.territories).map(([id, territory]) => {
              const visualData = CLASSIC_TERRITORY_VISUALS[id];
              if (!visualData) return null;

              const isSea = territory.type === 'sea';
              const fontSize = visualData.labelFontSize ?? 12;

              return (
                <text
                  key={`label-${id}`}
                  x={visualData.labelPosition.x}
                  y={visualData.labelPosition.y}
                  textAnchor="middle"
                  fontSize={fontSize}
                  fontWeight="500"
                  fill={isSea ? '#4A6B8A' : '#333'}
                  fontStyle={isSea ? 'italic' : undefined}
                  className="select-none"
                >
                  {id.toUpperCase()}
                </text>
              );
            })}
          </g>

          {/* Supply Centers */}
          <g className="supply-centers">
            {SUPPLY_CENTER_IDS.map(scId => {
              const visualData = CLASSIC_TERRITORY_VISUALS[scId];
              if (!visualData || !visualData.supplyCenterPosition) return null;

              const owner = getSupplyCenterOwner(scId, gameState.powers);
              const isPlayerSC = owner === gameState.playerPower;

              return (
                <SupplyCenterMarker
                  key={`sc-${scId}`}
                  x={visualData.supplyCenterPosition.x}
                  y={visualData.supplyCenterPosition.y}
                  owner={owner}
                  isHighlighted={isBuildPhase && isPlayerSC}
                />
              );
            })}
          </g>

          {/* Units */}
          <g className="units">
            {allUnits.map(({ unit, position }, idx) => (
              <UnitMarker
                key={`${unit.power}-${unit.territory}-${idx}`}
                unit={unit}
                x={position.x}
                y={position.y}
                onMouseEnter={() => setHoveredUnitIdx(idx)}
                onMouseLeave={() => setHoveredUnitIdx(null)}
              />
            ))}
          </g>

        </svg>
      </ZoomPanWrapper>

      {/* Legend toggle */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col items-start gap-1">
        {showLegend && (
          <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-3 text-xs">
            <div className="font-semibold mb-2">Legend</div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <svg width="18" height="22" viewBox="0 0 24 28">
                  <ArmyIcon color="#333" size={28} />
                </svg>
                <span>Army</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="18" height="22" viewBox="0 0 24 28">
                  <FleetIcon color="#333" size={28} />
                </svg>
                <span>Fleet</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 14 14">
                  <circle cx="7" cy="7" r="5" fill="none" stroke="#555" strokeWidth="1.5" />
                </svg>
                <span>Supply Center</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <circle cx="9" cy="9" r="7" fill="#4B5563" stroke="#374151" strokeWidth="1" />
                </svg>
                <span>Owned SC</span>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowLegend(v => !v)}
          className="p-2 bg-white/90 hover:bg-white rounded shadow-md transition-colors"
          title={showLegend ? 'Hide Legend' : 'Show Legend'}
          aria-label={showLegend ? 'Hide Legend' : 'Show Legend'}
        >
          <Info size={18} className="text-gray-700" />
        </button>
      </div>

      {/* Territory Tooltip */}
      {hoveredUnitIdx === null && (
        <TerritoryTooltip
          territory={hoveredTerritory ? gameState.territories[hoveredTerritory] : null}
          owner={hoveredTerritory ? getSupplyCenterOwner(hoveredTerritory, gameState.powers) : null}
          mousePosition={mousePosition}
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
        />
      )}

      {/* Unit Tooltip */}
      {hoveredUnitIdx !== null && allUnits[hoveredUnitIdx] && (() => {
        const { unit } = allUnits[hoveredUnitIdx];
        const powerName = unit.power.charAt(0).toUpperCase() + unit.power.slice(1);
        const unitLabel = unit.type === 'army' ? 'Army' : 'Fleet';
        const territoryName = gameState.territories[unit.territory]?.name ?? unit.territory.toUpperCase();
        const coastLabel = unit.coast ? ` (${unit.coast.split('_')[1]?.toUpperCase() ?? unit.coast})` : '';
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return null;
        const tx = mousePosition.x - containerRect.left + 15;
        const ty = mousePosition.y - containerRect.top - 10;

        return (
          <div
            className="absolute pointer-events-none z-20 bg-gray-900/95 text-white px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap"
            style={{ left: tx, top: ty, transform: 'translateY(-100%)' }}
          >
            <div className="font-semibold">{powerName} {unitLabel}</div>
            <div className="text-gray-300 text-xs">{territoryName}{coastLabel}</div>
          </div>
        );
      })()}
    </div>
    </div>
    </div>
  );
}
