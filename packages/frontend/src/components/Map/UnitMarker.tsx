import type { Unit, PowerId } from '@diplomacy/shared';
import { CLASSIC_POWER_COLORS } from '@diplomacy/shared';
import { ArmyIcon, FleetIcon } from './UnitIcons';

interface UnitMarkerProps {
  unit: Unit;
  x: number;
  y: number;
  isSelected?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * Unit marker component that renders either an Army or Fleet icon
 * Positioned at the territory center with proper power color
 */
export function UnitMarker({
  unit,
  x,
  y,
  isSelected = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: UnitMarkerProps) {
  const color = CLASSIC_POWER_COLORS[unit.power as PowerId].fill;
  const size = 20;

  // Offset to center the icon on the position
  const offsetX = x - size / 2;
  const offsetY = y - size / 2;

  return (
    <g
      transform={`translate(${offsetX}, ${offsetY})`}
      className={`unit-marker ${isSelected ? 'unit-selected' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {unit.type === 'army' ? (
        <ArmyIcon color={color} size={size} />
      ) : (
        <FleetIcon color={color} size={size} />
      )}
    </g>
  );
}
