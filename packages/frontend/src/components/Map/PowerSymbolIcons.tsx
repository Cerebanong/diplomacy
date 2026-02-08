import type { PowerId } from '@diplomacy/shared';

interface PowerSymbolProps {
  size?: number;
  bgColor?: string;
}

/** England: St George's Cross */
function EnglandSymbol({ size = 16 }: PowerSymbolProps) {
  const s = size / 24;
  return (
    <g transform={`scale(${s})`}>
      <rect x="10" y="2" width="4" height="20" fill="white" />
      <rect x="2" y="10" width="20" height="4" fill="white" />
    </g>
  );
}

/** France: Fleur-de-lis */
function FranceSymbol({ size = 16 }: PowerSymbolProps) {
  const s = size / 24;
  return (
    <g transform={`scale(${s})`}>
      <path
        d="M12 2 C12 2 9 6 9 10 C9 12 10 13 10 13 L8 13 C6 13 5 11 5 9 C5 9 3 11 3 14 C3 16 5 17 7 17 L10 17 L10 19 L8 19 L8 21 L16 21 L16 19 L14 19 L14 17 L17 17 C19 17 21 16 21 14 C21 11 19 9 19 9 C19 11 18 13 16 13 L14 13 C14 13 15 12 15 10 C15 6 12 2 12 2 Z"
        fill="white"
      />
    </g>
  );
}

/** Germany: Iron Cross */
function GermanySymbol({ size = 16 }: PowerSymbolProps) {
  const s = size / 24;
  return (
    <g transform={`scale(${s})`}>
      <path
        d="M10 2 L14 2 L14 8 L15 7 L18 7 L20 9 L20 10 L22 10 L22 14 L20 14 L20 15 L18 17 L15 17 L14 16 L14 22 L10 22 L10 16 L9 17 L6 17 L4 15 L4 14 L2 14 L2 10 L4 10 L4 9 L6 7 L9 7 L10 8 Z"
        fill="white"
      />
    </g>
  );
}

/** Italy: 5-pointed star (Stella d'Italia) */
function ItalySymbol({ size = 16 }: PowerSymbolProps) {
  const s = size / 24;
  // 5-pointed star centered at 12,12
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 10 : 4.5;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = 12 + r * Math.cos(angle);
    const py = 12 + r * Math.sin(angle);
    points.push(`${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`);
  }
  points.push('Z');
  return (
    <g transform={`scale(${s})`}>
      <path d={points.join(' ')} fill="white" />
    </g>
  );
}

/** Austria: Double-headed eagle (simplified) */
function AustriaSymbol({ size = 16 }: PowerSymbolProps) {
  const s = size / 24;
  return (
    <g transform={`scale(${s})`}>
      <path
        d="M12 4 L12 8 M12 8 L10 6 L7 3 L4 5 L6 7 L3 9 L6 10 L8 10 L10 12 L8 14 L6 14 L3 15 L6 17 L4 19 L7 21 L10 18 L12 16 M12 8 L14 6 L17 3 L20 5 L18 7 L21 9 L18 10 L16 10 L14 12 L16 14 L18 14 L21 15 L18 17 L20 19 L17 21 L14 18 L12 16 M12 16 L12 22 M10 20 L14 20"
        fill="none"
        stroke="white"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Two heads */}
      <circle cx="7" cy="3" r="1.5" fill="white" />
      <circle cx="17" cy="3" r="1.5" fill="white" />
    </g>
  );
}

/** Russia: Bear silhouette (simplified) */
function RussiaSymbol({ size = 16 }: PowerSymbolProps) {
  const s = size / 24;
  return (
    <g transform={`scale(${s})`}>
      <path
        d="M4 18 L4 14 C4 14 3 12 3 10 C3 8 5 6 7 6 L7 4 C7 3 8 3 8 4 L8 5.5 C9 5 10 5 11 5 L13 5 C14 5 15 5 16 5.5 L16 4 C16 3 17 3 17 4 L17 6 C19 6 21 8 21 10 C21 12 20 14 20 14 L20 18 L18 18 L18 16 L17 14 L7 14 L6 16 L6 18 Z M7.5 9 C6.5 9 6 9.5 6 10 C6 10.5 6.5 11 7.5 11 C8.5 11 9 10.5 9 10 C9 9.5 8.5 9 7.5 9 Z M16.5 9 C15.5 9 15 9.5 15 10 C15 10.5 15.5 11 16.5 11 C17.5 11 18 10.5 18 10 C18 9.5 17.5 9 16.5 9 Z"
        fill="white"
      />
    </g>
  );
}

/** Turkey: Crescent and star */
function TurkeySymbol({ size = 16, bgColor = '#F59E0B' }: PowerSymbolProps) {
  const s = size / 24;
  return (
    <g transform={`scale(${s})`}>
      {/* Crescent: white circle with bgColor masking circle */}
      <circle cx="10" cy="12" r="8" fill="white" />
      <circle cx="13" cy="12" r="6.5" fill={bgColor} />
      {/* Small star */}
      <polygon
        points="19,10 20,12.5 22.5,12.5 20.5,14 21.2,16.5 19,15 16.8,16.5 17.5,14 15.5,12.5 18,12.5"
        fill="white"
      />
    </g>
  );
}

export const POWER_SYMBOLS: Record<PowerId, React.FC<PowerSymbolProps>> = {
  england: EnglandSymbol,
  france: FranceSymbol,
  germany: GermanySymbol,
  italy: ItalySymbol,
  austria: AustriaSymbol,
  russia: RussiaSymbol,
  turkey: TurkeySymbol,
};
