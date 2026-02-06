import type { Territory, PowerId } from '@diplomacy/shared';

interface TerritoryTooltipProps {
  territory: Territory | null;
  owner: PowerId | null;
  mousePosition: { x: number; y: number };
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Floating tooltip that appears on territory hover
 * Shows territory name, type, and supply center status
 */
export function TerritoryTooltip({
  territory,
  owner,
  mousePosition,
  containerRef,
}: TerritoryTooltipProps) {
  if (!territory) return null;

  // Calculate tooltip position relative to the container
  const containerRect = containerRef.current?.getBoundingClientRect();
  if (!containerRect) return null;

  const tooltipX = mousePosition.x - containerRect.left + 15;
  const tooltipY = mousePosition.y - containerRect.top - 10;

  const ownerName = owner
    ? owner.charAt(0).toUpperCase() + owner.slice(1)
    : 'Neutral';

  const typeLabel = territory.type === 'sea' ? 'Sea' : territory.type === 'coastal' ? 'Coastal' : 'Inland';

  return (
    <div
      className="absolute pointer-events-none z-20 bg-gray-900/95 text-white px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap"
      style={{
        left: tooltipX,
        top: tooltipY,
        transform: 'translateY(-100%)',
      }}
    >
      <div className="font-semibold">{territory.name}</div>
      <div className="text-gray-300 text-xs">{typeLabel}</div>
      {territory.isSupplyCenter && (
        <div className="flex items-center gap-1 mt-1 text-yellow-400 text-xs">
          <span>★</span>
          <span>Supply Center ({ownerName})</span>
        </div>
      )}
    </div>
  );
}
