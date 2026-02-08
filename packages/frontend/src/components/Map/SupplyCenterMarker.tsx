import type { PowerId } from '@diplomacy/shared';
import { CLASSIC_POWER_COLORS } from '@diplomacy/shared';
import { POWER_SYMBOLS } from './PowerSymbolIcons';

interface SupplyCenterMarkerProps {
  x: number;
  y: number;
  owner: PowerId | null;
  isHighlighted?: boolean;
}

/**
 * Supply center marker: open ring for neutral, glossy button with national symbol for owned
 */
export function SupplyCenterMarker({
  x,
  y,
  owner,
  isHighlighted = false,
}: SupplyCenterMarkerProps) {
  // Neutral SC: small open circle ring
  if (!owner) {
    return (
      <circle
        cx={x}
        cy={y}
        r={7}
        fill="none"
        stroke="#555"
        strokeWidth={1.5}
        className={isHighlighted ? 'supply-center-pulse' : ''}
      />
    );
  }

  // Owned SC: glossy button with national symbol
  const powerColor = CLASSIC_POWER_COLORS[owner];
  const SymbolComponent = POWER_SYMBOLS[owner];
  const symbolSize = 16;

  return (
    <g
      filter="url(#scShadow)"
      className={isHighlighted ? 'supply-center-pulse' : ''}
      style={{ transformOrigin: `${x}px ${y}px` }}
    >
      {/* Base circle with power color */}
      <circle
        cx={x}
        cy={y}
        r={11}
        fill={powerColor.fill}
        stroke={powerColor.stroke}
        strokeWidth={1.5}
      />
      {/* Glossy gradient overlay */}
      <circle cx={x} cy={y} r={10.5} fill="url(#scGloss)" />
      {/* Highlight shine ellipse */}
      <ellipse
        cx={x - 2}
        cy={y - 4}
        rx={5}
        ry={3}
        fill="white"
        opacity={0.2}
      />
      {/* National symbol */}
      <g transform={`translate(${x - symbolSize / 2}, ${y - symbolSize / 2})`}>
        <SymbolComponent size={symbolSize} bgColor={powerColor.fill} />
      </g>
    </g>
  );
}
