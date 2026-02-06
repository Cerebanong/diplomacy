import type { PowerId } from '@diplomacy/shared';
import { CLASSIC_POWER_COLORS, NEUTRAL_COLORS } from '@diplomacy/shared';

interface SupplyCenterMarkerProps {
  x: number;
  y: number;
  owner: PowerId | null;
  isHighlighted?: boolean;
  size?: number;
}

/**
 * 5-pointed star SVG for supply center markers
 * Color indicates ownership: power color if owned, gold if neutral
 */
export function SupplyCenterMarker({
  x,
  y,
  owner,
  isHighlighted = false,
  size = 8,
}: SupplyCenterMarkerProps) {
  // Calculate star points (5-pointed star)
  const getStarPath = (cx: number, cy: number, outerRadius: number, innerRadius: number) => {
    const points: string[] = [];
    const angleOffset = -Math.PI / 2; // Start from top

    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = angleOffset + (i * Math.PI) / 5;
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);
      points.push(`${i === 0 ? 'M' : 'L'}${px},${py}`);
    }
    points.push('Z');
    return points.join(' ');
  };

  const fill = owner ? '#FFFFFF' : NEUTRAL_COLORS.supplyCenterNeutral;
  const stroke = owner ? CLASSIC_POWER_COLORS[owner].stroke : '#B8860B';
  const strokeWidth = owner ? 1.5 : 1;

  return (
    <path
      d={getStarPath(x, y, size, size * 0.4)}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      className={isHighlighted ? 'supply-center-pulse' : ''}
    />
  );
}
