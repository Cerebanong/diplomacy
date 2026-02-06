interface UnitIconProps {
  color: string;
  size?: number;
}

/**
 * Army icon - Shield shape with infantry silhouette
 * Represents land units in Diplomacy
 */
export function ArmyIcon({ color, size = 24 }: UnitIconProps) {
  const scale = size / 24;

  return (
    <g transform={`scale(${scale})`}>
      {/* Shield background */}
      <path
        d="M12 2 L4 6 L4 12 C4 17 12 22 12 22 C12 22 20 17 20 12 L20 6 Z"
        fill={color}
        stroke="#1a1a1a"
        strokeWidth={1.5}
      />
      {/* Infantry silhouette */}
      <g fill="white" stroke="none">
        {/* Head */}
        <circle cx="12" cy="8" r="2.5" />
        {/* Body */}
        <path d="M9 11 L15 11 L14 17 L10 17 Z" />
        {/* Arms */}
        <path d="M7 12 L9 11 L9 14 L7 13 Z" />
        <path d="M17 12 L15 11 L15 14 L17 13 Z" />
      </g>
    </g>
  );
}

/**
 * Fleet icon - Ship/vessel silhouette
 * Represents naval units in Diplomacy
 */
export function FleetIcon({ color, size = 24 }: UnitIconProps) {
  const scale = size / 24;

  return (
    <g transform={`scale(${scale})`}>
      {/* Ship hull */}
      <path
        d="M2 16 L5 20 L19 20 L22 16 L20 16 C20 16 18 18 12 18 C6 18 4 16 4 16 Z"
        fill={color}
        stroke="#1a1a1a"
        strokeWidth={1.5}
      />
      {/* Ship deck */}
      <path
        d="M6 16 L6 12 L18 12 L18 16"
        fill={color}
        stroke="#1a1a1a"
        strokeWidth={1.5}
      />
      {/* Mast */}
      <line x1="12" y1="12" x2="12" y2="4" stroke="#1a1a1a" strokeWidth={2} />
      {/* Sail */}
      <path
        d="M12 5 L12 11 L18 11 Z"
        fill="white"
        stroke="#1a1a1a"
        strokeWidth={1}
      />
      {/* Flag */}
      <path
        d="M12 4 L12 2 L16 3 L12 4"
        fill="white"
        stroke="none"
      />
    </g>
  );
}
