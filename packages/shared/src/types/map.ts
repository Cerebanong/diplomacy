/**
 * Map visualization types for Diplomacy
 */

import type { PowerId } from './game.js';

/**
 * Available map style options
 */
export interface MapStyle {
  id: string;
  name: string;
  description: string;
  available: boolean;
}

/**
 * Visual data for rendering a single territory
 */
export interface TerritoryVisualData {
  /** SVG path d attribute for the territory shape */
  svgPath: string;
  /** SVG transform attribute (for scaling/translation) */
  transform?: string;
  /** Center point for unit placement */
  center: { x: number; y: number };
  /** Label position (may differ from center for readability) */
  labelPosition: { x: number; y: number };
  /** Supply center marker position (only for supply centers) */
  supplyCenterPosition?: { x: number; y: number };
  /** Default fill color (if not owned by a power) */
  defaultFill?: string;
  /** Coast boundary paths for multi-coast territories (SPA, STP, BUL) */
  coastPaths?: Array<{
    id: string;
    svgPath: string;
    label: string;
    labelPosition: { x: number; y: number };
  }>;
}

/**
 * Complete map data for a game variant
 */
export interface MapData {
  id: string;
  name: string;
  /** SVG viewBox dimensions */
  viewBox: { width: number; height: number };
  /** Visual data for each territory keyed by territory ID */
  territories: Record<string, TerritoryVisualData>;
  /** Power-specific colors */
  powerColors: Record<PowerId, {
    fill: string;
    stroke: string;
  }>;
}

/**
 * Available map styles
 */
export const MAP_STYLES: MapStyle[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional Diplomacy map style',
    available: true,
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean, modern styling (coming soon)',
    available: false,
  },
];
