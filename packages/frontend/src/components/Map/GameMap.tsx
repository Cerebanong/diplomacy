import { useState, useRef, useMemo } from 'react';
import type { GameState, PowerId, Territory } from '@diplomacy/shared';
import {
  CLASSIC_MAP_DATA,
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Check if we're in build phase (for supply center pulse animation)
  const isBuildPhase = gameState.phase === 'winter_builds';

  // Get all units flattened with their positions
  const allUnits = useMemo(() => {
    const units: { unit: typeof gameState.powers.england.units[0]; position: { x: number; y: number } }[] = [];

    for (const power of Object.values(gameState.powers)) {
      for (const unit of power.units) {
        const visualData = CLASSIC_TERRITORY_VISUALS[unit.territory];
        if (visualData) {
          units.push({
            unit,
            position: visualData.center,
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

  const { width, height } = CLASSIC_MAP_DATA.viewBox;

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white rounded-lg shadow-lg overflow-hidden relative"
      onMouseMove={handleMouseMove}
    >
      <ZoomPanWrapper>
        <svg
          viewBox={`0 0 ${width} ${height}`}
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
          </defs>

          {/* Background */}
          <rect width={width} height={height} fill="url(#seaGrad)" />

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
            {Object.entries(CLASSIC_TERRITORY_VISUALS).map(([id, visualData]) => {
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
            {Object.entries(gameState.territories).map(([id]) => {
              const visualData = CLASSIC_TERRITORY_VISUALS[id];
              if (!visualData) return null;

              return (
                <text
                  key={`label-${id}`}
                  x={visualData.labelPosition.x}
                  y={visualData.labelPosition.y}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="500"
                  fill="#333"
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
                  size={10}
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
              />
            ))}
          </g>

          {/* Map title */}
          <text
            x={width / 2}
            y={35}
            textAnchor="middle"
            fontSize="28"
            fontWeight="bold"
            fill="#333"
          >
            Europe, {gameState.year}
          </text>
        </svg>
      </ZoomPanWrapper>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur rounded-lg shadow-lg p-3 text-xs">
        <div className="font-semibold mb-2">Legend</div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <ArmyIcon color="#333" size={20} />
            </svg>
            <span>Army</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <FleetIcon color="#333" size={20} />
            </svg>
            <span>Fleet</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M6 1 L7.5 4.5 L11 5 L8.5 7.5 L9 11 L6 9.5 L3 11 L3.5 7.5 L1 5 L4.5 4.5 Z"
                fill="#FFD700"
                stroke="#B8860B"
                strokeWidth="0.5"
              />
            </svg>
            <span>Supply Center</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      <TerritoryTooltip
        territory={hoveredTerritory ? gameState.territories[hoveredTerritory] : null}
        owner={hoveredTerritory ? getSupplyCenterOwner(hoveredTerritory, gameState.powers) : null}
        mousePosition={mousePosition}
        containerRef={containerRef as React.RefObject<HTMLDivElement>}
      />
    </div>
  );
}
