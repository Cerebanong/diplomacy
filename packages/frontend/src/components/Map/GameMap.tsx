import type { GameState } from '@diplomacy/shared';

interface GameMapProps {
  gameState: GameState;
  onTerritoryClick: (territoryId: string) => void;
}

/**
 * Classic Diplomacy Map SVG
 * This is a simplified representation - the full map will have detailed paths
 */
export function GameMap({ gameState, onTerritoryClick }: GameMapProps) {
  return (
    <div className="w-full h-full bg-white rounded-lg shadow-lg overflow-hidden">
      <svg
        viewBox="0 0 1000 800"
        className="w-full h-full"
        style={{ backgroundColor: '#B8D4E8' }}
      >
        {/* Map Background */}
        <defs>
          {/* Pattern for land territories */}
          <pattern id="landPattern" patternUnits="userSpaceOnUse" width="4" height="4">
            <rect width="4" height="4" fill="#E8DCC4" />
          </pattern>

          {/* Gradient for sea */}
          <linearGradient id="seaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#B8D4E8" />
            <stop offset="100%" stopColor="#9CC4DC" />
          </linearGradient>

          {/* Power colors */}
          <linearGradient id="englandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient id="franceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="germanyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#4B5563" />
          </linearGradient>
          <linearGradient id="italyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#16A34A" />
          </linearGradient>
          <linearGradient id="austriaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          <linearGradient id="russiaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#9333EA" />
          </linearGradient>
          <linearGradient id="turkeyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>

        {/* Sea Background */}
        <rect width="1000" height="800" fill="url(#seaGradient)" />

        {/* Simplified Europe landmass */}
        <g className="territories">
          {/* British Isles */}
          <path
            d="M180 180 L220 160 L260 180 L270 240 L250 280 L220 300 L180 280 L160 240 Z"
            fill="url(#englandGrad)"
            stroke="#333"
            strokeWidth="1"
            className="territory"
            onClick={() => onTerritoryClick('lon')}
          />
          <path
            d="M160 140 L200 120 L230 140 L220 160 L180 180 L150 160 Z"
            fill="url(#englandGrad)"
            stroke="#333"
            strokeWidth="1"
            className="territory"
            onClick={() => onTerritoryClick('edi')}
          />

          {/* France */}
          <path
            d="M200 340 L280 320 L320 360 L340 420 L300 480 L240 500 L180 460 L160 400 Z"
            fill="url(#franceGrad)"
            stroke="#333"
            strokeWidth="1"
            className="territory"
            onClick={() => onTerritoryClick('par')}
          />

          {/* Germany */}
          <path
            d="M380 220 L460 200 L520 240 L540 300 L500 360 L420 380 L360 340 L340 280 Z"
            fill="url(#germanyGrad)"
            stroke="#333"
            strokeWidth="1"
            className="territory"
            onClick={() => onTerritoryClick('ber')}
          />

          {/* Italy */}
          <path
            d="M400 420 L440 400 L480 440 L500 520 L480 600 L440 640 L400 600 L380 520 Z"
            fill="url(#italyGrad)"
            stroke="#333"
            strokeWidth="1"
            className="territory"
            onClick={() => onTerritoryClick('rom')}
          />

          {/* Austria-Hungary */}
          <path
            d="M500 360 L580 340 L640 380 L660 440 L620 500 L540 520 L480 480 L460 420 Z"
            fill="url(#austriaGrad)"
            stroke="#333"
            strokeWidth="1"
            className="territory"
            onClick={() => onTerritoryClick('vie')}
          />

          {/* Russia */}
          <path
            d="M600 100 L800 80 L900 160 L920 320 L880 460 L780 520 L680 480 L620 380 L580 260 L560 180 Z"
            fill="url(#russiaGrad)"
            stroke="#333"
            strokeWidth="1"
            className="territory"
            onClick={() => onTerritoryClick('mos')}
          />

          {/* Turkey */}
          <path
            d="M700 520 L800 500 L880 540 L920 600 L900 680 L820 720 L720 700 L660 640 L660 580 Z"
            fill="url(#turkeyGrad)"
            stroke="#333"
            strokeWidth="1"
            className="territory"
            onClick={() => onTerritoryClick('con')}
          />

          {/* Neutral territories - Scandinavia */}
          <path
            d="M400 80 L480 60 L520 100 L540 180 L500 220 L440 200 L380 160 L360 120 Z"
            fill="#D4C4A8"
            stroke="#333"
            strokeWidth="1"
            className="territory"
            onClick={() => onTerritoryClick('swe')}
          />

          {/* Iberian Peninsula */}
          <path
            d="M100 440 L180 420 L200 480 L180 560 L120 580 L60 540 L40 480 Z"
            fill="#D4C4A8"
            stroke="#333"
            strokeWidth="1"
            className="territory"
            onClick={() => onTerritoryClick('spa')}
          />

          {/* Balkans */}
          <path
            d="M580 520 L640 500 L680 540 L700 600 L660 660 L600 680 L540 640 L520 580 Z"
            fill="#D4C4A8"
            stroke="#333"
            strokeWidth="1"
            className="territory"
            onClick={() => onTerritoryClick('ser')}
          />
        </g>

        {/* Units */}
        <g className="units">
          {Object.values(gameState.powers).map(power =>
            power.units.map((unit, idx) => (
              <g key={`${power.id}-${unit.territory}-${idx}`} className="unit-marker">
                {/* Unit circle */}
                <circle
                  cx={getUnitPosition(unit.territory).x}
                  cy={getUnitPosition(unit.territory).y}
                  r="12"
                  fill={POWER_FILLS[power.id]}
                  stroke="#333"
                  strokeWidth="2"
                />
                {/* Unit type indicator */}
                <text
                  x={getUnitPosition(unit.territory).x}
                  y={getUnitPosition(unit.territory).y + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {unit.type === 'army' ? 'A' : 'F'}
                </text>
              </g>
            ))
          )}
        </g>

        {/* Supply Center markers */}
        <g className="supply-centers">
          {/* TODO: Add supply center dots */}
        </g>

        {/* Legend */}
        <g transform="translate(20, 700)">
          <rect x="0" y="0" width="200" height="80" fill="white" fillOpacity="0.9" rx="4" />
          <text x="10" y="20" fontSize="12" fontWeight="bold">Legend</text>
          <circle cx="20" cy="40" r="6" fill="#333" />
          <text x="35" y="44" fontSize="10">Army (A)</text>
          <circle cx="100" cy="40" r="6" fill="#333" />
          <text x="115" y="44" fontSize="10">Fleet (F)</text>
          <rect x="10" y="55" width="10" height="10" fill="#fbbf24" stroke="#333" />
          <text x="25" y="64" fontSize="10">Supply Center</text>
        </g>

        {/* Map title */}
        <text x="500" y="30" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#333">
          Europe, {gameState.year}
        </text>
      </svg>
    </div>
  );
}

const POWER_FILLS: Record<string, string> = {
  england: '#1E3A8A',
  france: '#60A5FA',
  germany: '#374151',
  italy: '#22C55E',
  austria: '#EF4444',
  russia: '#A855F7',
  turkey: '#F59E0B',
};

// Simplified unit positions - will need proper territory centers
function getUnitPosition(territory: string): { x: number; y: number } {
  const positions: Record<string, { x: number; y: number }> = {
    // England
    lon: { x: 220, y: 260 },
    edi: { x: 190, y: 150 },
    lvp: { x: 170, y: 220 },
    // France
    par: { x: 260, y: 380 },
    bre: { x: 200, y: 360 },
    mar: { x: 300, y: 440 },
    // Germany
    ber: { x: 460, y: 280 },
    kie: { x: 420, y: 240 },
    mun: { x: 440, y: 340 },
    // Italy
    rom: { x: 440, y: 520 },
    nap: { x: 480, y: 580 },
    ven: { x: 440, y: 440 },
    // Austria
    vie: { x: 540, y: 400 },
    bud: { x: 600, y: 420 },
    tri: { x: 500, y: 440 },
    // Russia
    mos: { x: 760, y: 280 },
    war: { x: 620, y: 320 },
    sev: { x: 800, y: 420 },
    stp: { x: 680, y: 140 },
    // Turkey
    con: { x: 720, y: 560 },
    ank: { x: 820, y: 580 },
    smy: { x: 800, y: 640 },
    // Neutrals
    nwy: { x: 420, y: 120 },
    swe: { x: 480, y: 160 },
    den: { x: 420, y: 200 },
    hol: { x: 340, y: 280 },
    bel: { x: 320, y: 320 },
    spa: { x: 140, y: 500 },
    por: { x: 80, y: 520 },
    tun: { x: 380, y: 680 },
    ser: { x: 600, y: 560 },
    rum: { x: 680, y: 480 },
    bul: { x: 660, y: 540 },
    gre: { x: 620, y: 620 },
  };

  return positions[territory] || { x: 500, y: 400 };
}
