interface UnitIconProps {
  color: string;
  size?: number;
}

// Shield path used by both icons: flat top with rounded corners, tapers to a rounded point at the bottom.
// Designed for a 24x28 coordinate space.
const SHIELD_PATH = 'M5 2 h14 a3 3 0 0 1 3 3 v10 c0 4 -5 9 -10 13 c-5 -4 -10 -9 -10 -13 V5 a3 3 0 0 1 3 -3 Z';

/**
 * Army icon - White shield with a colored star
 * Represents land units in Diplomacy
 */
export function ArmyIcon({ color, size = 28 }: UnitIconProps) {
  const scale = size / 28;

  return (
    <g transform={`scale(${scale})`}>
      {/* Shield background */}
      <path
        d={SHIELD_PATH}
        fill="white"
        stroke="#1a1a1a"
        strokeWidth={1.5}
      />
      {/* Five-pointed star in power's color */}
      <path
        d="M12 4.5 L13.8 9.5 L19 9.5 L14.8 12.8 L16.4 18 L12 14.8 L7.6 18 L9.2 12.8 L5 9.5 L10.2 9.5 Z"
        fill={color}
        stroke="#1a1a1a"
        strokeWidth={0.75}
        strokeLinejoin="round"
      />
    </g>
  );
}

/**
 * Fleet icon - White shield with a colored anchor
 * Represents naval units in Diplomacy
 */
export function FleetIcon({ color, size = 28 }: UnitIconProps) {
  const scale = size / 28;

  return (
    <g transform={`scale(${scale})`}>
      {/* Shield background */}
      <path
        d={SHIELD_PATH}
        fill="white"
        stroke="#1a1a1a"
        strokeWidth={1.5}
      />
      {/* Anchor — stroke-based line art */}
      <g fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" transform="translate(0,2)">
        {/* Ring at top */}
        <circle cx="12" cy="5" r="2" />
        {/* Vertical shaft */}
        <line x1="12" y1="7" x2="12" y2="20" />
        {/* Horizontal crossbar */}
        <line x1="7" y1="11" x2="17" y2="11" />
        {/* Left arm: arc from shaft bottom curving inward then left */}
        <path d="M12 20 C12 20 7 18 7 14" />
        {/* Right arm: arc from shaft bottom curving inward then right */}
        <path d="M12 20 C12 20 17 18 17 14" />
      </g>
    </g>
  );
}
