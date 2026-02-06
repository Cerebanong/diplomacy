/**
 * Generate classicVisualData.ts from extracted SVG paths
 *
 * This script creates the visual data for the Diplomacy map by:
 * 1. Reading extracted paths from the SVG
 * 2. Mapping polygon IDs to territory IDs
 * 3. Calculating centers and positions
 * 4. Generating the TypeScript output
 */

const fs = require('fs');
const path = require('path');

const EXTRACTED_PATHS = path.join(__dirname, 'extracted-paths.json');
const OUTPUT_PATH = path.join(__dirname, '../packages/shared/src/maps/classicVisualData.ts');

// Territory mapping from SVG polygon IDs to Diplomacy territory IDs
// Positions based on SCREEN coordinates after transform is applied
// Screen Y coordinates help identify regions:
// Y ~170-280: Top (Scandinavia, Russia north)
// Y ~340-520: Upper-mid (Britain, Germany north, Russia mid)
// Y ~570-750: Mid (France, Germany south, Austria)
// Y ~750-900: Lower-mid (Italy, Balkans)
// Y ~900-1100: Bottom (Turkey, North Africa)
const TERRITORY_MAPPING = {
  // === SCANDINAVIA & RUSSIA NORTH ===
  'path3423': 'stp',      // screenY=171, St. Petersburg
  'polyline444': 'mos',   // screenY=203, Moscow (large)
  'polygon332': 'nwy',    // screenY=276, Norway
  'polygon186': 'war',    // screenY=274, Warsaw
  'polygon456': 'swe',    // screenY=346, Sweden

  // === BRITAIN ===
  'polygon140': 'cly',    // screenY=417, Clyde (Scotland NW)
  'polygon172': 'edi',    // screenY=446, Edinburgh (Scotland E)
  'polygon260': 'wal',    // screenX=261, West position → Wales
  'polygon546': 'yor',    // screenX=318, East upper → Yorkshire
  'polygon526': 'lvp',    // screenY=574, Liverpool
  'polygon274': 'lon',    // screenX=337, East lower → London

  // === RUSSIA (continued) ===
  'path3469': 'rum',      // screenY=407, Romania
  'polyline450': 'ukr',   // screenY=403, Ukraine
  'polygon296': 'sev',    // screenY=470, Sevastopol

  // === LOWLANDS ===
  'polygon230': 'bel',    // screenY=604, Belgium
  'polygon354': 'hol',    // screenY=805, Holland - seems wrong position? Check

  // === GERMANY ===
  'polygon192': 'kie',    // screenY=708, Kiel
  'polygon100': 'ber',    // screenY=688, Berlin
  'polygon518': 'pru',    // screenY=738, Prussia
  'polygon114': 'sil',    // screenY=766, Silesia
  'polygon78': 'ruh',     // screenY=643, Ruhr
  'polygon388': 'mun',    // screenY=791, Munich

  // === FRANCE ===
  'polygon348': 'pic',    // screenY=655, Picardy
  'polygon106': 'bre',    // screenY=686, Brest
  'polygon340': 'par',    // screenY=711, Paris
  'polygon282': 'bur',    // screenY=809, Burgundy
  'polygon198': 'gas',    // screenY=785, Gascony
  'polygon134': 'mar',    // screenY=727, Marseilles

  // === IBERIA ===
  'polyline432': 'spa',   // screenY=818, Spain
  'polygon360': 'por',    // screenY=864, Portugal

  // === ITALY ===
  'polygon492': 'pie',    // screenY=759, Piedmont
  'polygon510': 'ven',    // screenY=834, Venice
  'polygon470': 'tyr',    // screenY=836, Tyrolia (Alps)
  'polygon486': 'tus',    // screenY=854, Tuscany
  'polygon374': 'rom',    // screenY=896, Rome
  'polygon54': 'apu',     // screenY=924, Apulia
  'polygon312': 'nap',    // screenY=967, Naples

  // === AUSTRIA-HUNGARY ===
  'polyline122': 'vie',   // screenY=924, Vienna (south position)
  'polyline128': 'boh',   // screenY=875, Bohemia (north position)
  'polyline436': 'bud',   // screenY=908, Budapest (Balkans region)
  // gal and tri need to be found

  // === BALKANS ===
  'polygon40': 'alb',     // screenY=928, Albania
  'polygon204': 'gre',    // screenY=990, Greece
  'polygon156': 'bul',    // screenY=498, Bulgaria
  'polygon396': 'ser',    // screenX=701, screenY=908, Serbia (Balkans)

  // === TURKEY ===
  'path1820': 'con',      // screenY=603, Constantinople
  'polygon86': 'ank',     // screenY=592, Ankara
  'polygon368': 'smy',    // screenY=564, Smyrna
  'polygon268': 'arm',    // screenY=513, Armenia
  'polygon532': 'syr',    // screenY=627, Syria

  // === RUSSIA FAR NORTH/EAST ===
  'polygon46': 'fin',     // screenY=921, Finland
  'polygon424': 'lvn',    // screenY=987, Livonia
  'polygon60': 'nwg',     // screenY=917, Norwegian Sea (actually land path?)
  'polygon464': 'bot',    // screenY=1027, Gulf of Bothnia (actually land path?)

  // === NORTH AFRICA ===
  'polygon326': 'naf',    // screenY=1042, North Africa
  'polygon478': 'tun',    // screenY=1063, Tunisia

  // Extra paths that might be missing territories
  // polyline436 removed - was incorrectly in Iberia, now mapped to bud above
  'path3286': 'naf',      // screenY=791 - duplicate?
  'path3284': 'naf',      // screenY=907 - Africa related
  'polygon250': 'bul_sc', // screenY=543, Bulgaria south coast
  'path1803': 'bul_ec',   // screenY=522, Bulgaria east coast
  'polygon382': 'aeg_island', // screenY=660
  'polygon304': 'ion_island', // screenY=686
  'polygon412': 'eas_island', // screenY=652
  'polygon504': 'arm_coast',  // screenY=679
  'polygon404': 'sev_coast',  // screenY=730
  'path3387': 'misc1',    // screenY=872
  'path3421': 'misc2',    // screenY=934
  'path1829': 'misc3',    // screenY=945

  // === SEA ZONES ===
  'polygon72': 'bar',     // Barents Sea
  'polygon10': 'nth',     // North Sea
  'polygon320': 'nao',    // North Atlantic Ocean
  'polygon218': 'ska',    // Skagerrak
  'path16-9': 'bal',      // Baltic Sea
  'path3810': 'bot',      // Gulf of Bothnia (sea version)
  'polygon158': 'hel',    // Helgoland Bight
  'polygon244': 'iri',    // Irish Sea
  'polygon180': 'eng',    // English Channel
  'polygon290': 'mao',    // Mid-Atlantic Ocean
  'polygon540': 'wes',    // Western Mediterranean
  'polygon212': 'gol',    // Gulf of Lyon
  'polygon498': 'tys',    // Tyrrhenian Sea
  'polygon28': 'adr',     // Adriatic Sea
  'polygon238': 'ion',    // Ionian Sea
  'polygon166': 'aeg',    // Aegean Sea
  'polygon66': 'bla',     // Black Sea
  'polygon148': 'eas',    // Eastern Mediterranean
  'polygon252': 'aeg_sm', // Aegean small island
};

// Reverse mapping for quick lookup
const POLYGON_TO_TERRITORY = {};
for (const [polygonId, territoryId] of Object.entries(TERRITORY_MAPPING)) {
  // Skip coast/island variations
  if (territoryId.includes('_') || territoryId.startsWith('misc')) continue;
  // Handle conflicts by keeping first mapping
  if (!POLYGON_TO_TERRITORY[polygonId]) {
    POLYGON_TO_TERRITORY[polygonId] = territoryId;
  }
}

/**
 * Parse transform matrix to get scale and translate
 */
function parseTransform(transform) {
  if (!transform) return null;

  const match = transform.match(/matrix\(([^)]+)\)/);
  if (!match) return null;

  const [a, b, c, d, e, f] = match[1].split(',').map(s => parseFloat(s.trim()));
  return { scaleX: a, scaleY: d, translateX: e, translateY: f };
}

/**
 * Apply transform to coordinates
 */
function applyTransform(x, y, transform) {
  if (!transform) return { x, y };

  const t = parseTransform(transform);
  if (!t) return { x, y };

  return {
    x: x * t.scaleX + t.translateX,
    y: y * t.scaleY + t.translateY,
  };
}

/**
 * Calculate center point from path data
 */
function calculateCenter(pathData, transform) {
  // Extract all coordinates from the path
  const coords = [];
  const commands = pathData.split(/(?=[MLHVCSQTAZmlhvcsqtaz])/);

  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;

  for (const cmd of commands) {
    if (!cmd.trim()) continue;

    const type = cmd[0];
    const args = cmd.slice(1).trim();
    const numbers = args.match(/-?\d+\.?\d*/g)?.map(Number) || [];

    switch (type) {
      case 'M':
        for (let i = 0; i < numbers.length; i += 2) {
          if (i + 1 < numbers.length) {
            currentX = numbers[i];
            currentY = numbers[i + 1];
            if (i === 0) {
              startX = currentX;
              startY = currentY;
            }
            coords.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'm':
        for (let i = 0; i < numbers.length; i += 2) {
          if (i + 1 < numbers.length) {
            currentX += numbers[i];
            currentY += numbers[i + 1];
            if (i === 0 && coords.length === 0) {
              startX = currentX;
              startY = currentY;
            }
            coords.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'L':
        for (let i = 0; i < numbers.length; i += 2) {
          if (i + 1 < numbers.length) {
            currentX = numbers[i];
            currentY = numbers[i + 1];
            coords.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'l':
        for (let i = 0; i < numbers.length; i += 2) {
          if (i + 1 < numbers.length) {
            currentX += numbers[i];
            currentY += numbers[i + 1];
            coords.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'H':
        for (const n of numbers) {
          currentX = n;
          coords.push({ x: currentX, y: currentY });
        }
        break;
      case 'h':
        for (const n of numbers) {
          currentX += n;
          coords.push({ x: currentX, y: currentY });
        }
        break;
      case 'V':
        for (const n of numbers) {
          currentY = n;
          coords.push({ x: currentX, y: currentY });
        }
        break;
      case 'v':
        for (const n of numbers) {
          currentY += n;
          coords.push({ x: currentX, y: currentY });
        }
        break;
      case 'C':
        for (let i = 0; i < numbers.length; i += 6) {
          if (i + 5 < numbers.length) {
            currentX = numbers[i + 4];
            currentY = numbers[i + 5];
            coords.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'c':
        for (let i = 0; i < numbers.length; i += 6) {
          if (i + 5 < numbers.length) {
            currentX += numbers[i + 4];
            currentY += numbers[i + 5];
            coords.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'Z':
      case 'z':
        coords.push({ x: startX, y: startY });
        break;
    }
  }

  if (coords.length === 0) return null;

  // Apply transform to all coordinates
  const transformedCoords = coords.map(c => applyTransform(c.x, c.y, transform));

  const minX = Math.min(...transformedCoords.map(c => c.x));
  const maxX = Math.max(...transformedCoords.map(c => c.x));
  const minY = Math.min(...transformedCoords.map(c => c.y));
  const maxY = Math.max(...transformedCoords.map(c => c.y));

  return {
    x: Math.round((minX + maxX) / 2),
    y: Math.round((minY + maxY) / 2),
  };
}

/**
 * Check if a territory is a supply center
 */
const SUPPLY_CENTERS = [
  // England
  'edi', 'lvp', 'lon',
  // France
  'bre', 'par', 'mar',
  // Germany
  'kie', 'ber', 'mun',
  // Italy
  'ven', 'rom', 'nap',
  // Austria
  'vie', 'tri', 'bud',
  // Russia
  'stp', 'mos', 'war', 'sev',
  // Turkey
  'con', 'ank', 'smy',
  // Neutrals
  'nwy', 'swe', 'den', 'hol', 'bel', 'spa', 'por', 'tun', 'ser', 'gre', 'bul', 'rum',
];

/**
 * Check if a territory is a sea zone
 */
const SEA_TERRITORIES = [
  'nth', 'nwg', 'bar', 'ska', 'hel', 'bal', 'bot',
  'eng', 'iri', 'nao', 'mao', 'wes', 'gol', 'tys',
  'ion', 'adr', 'aeg', 'eas', 'bla',
];

// All required territories
const ALL_TERRITORIES = [
  // Sea zones (19)
  'nth', 'nwg', 'bar', 'ska', 'hel', 'bal', 'bot',
  'eng', 'iri', 'nao', 'mao', 'wes', 'gol', 'tys',
  'ion', 'adr', 'aeg', 'eas', 'bla',
  // Land territories (56)
  'cly', 'edi', 'lvp', 'yor', 'wal', 'lon',
  'bre', 'pic', 'par', 'bur', 'gas', 'mar',
  'kie', 'ber', 'mun', 'pru', 'sil', 'ruh',
  'pie', 'ven', 'tus', 'rom', 'nap', 'apu',
  'tyr', 'boh', 'vie', 'tri', 'bud', 'gal',
  'stp', 'mos', 'war', 'sev', 'ukr', 'lvn', 'fin',
  'con', 'ank', 'smy', 'arm', 'syr',
  'nwy', 'swe', 'den', 'hol', 'bel', 'spa', 'por', 'naf', 'tun', 'ser', 'alb', 'gre', 'bul', 'rum',
];

function main() {
  console.log('Reading extracted paths...');
  const data = JSON.parse(fs.readFileSync(EXTRACTED_PATHS, 'utf-8'));

  console.log('Processing paths...');

  const territories = {};
  const unmapped = [];
  const missingTerritories = new Set(ALL_TERRITORIES);

  // Process only Land and Seas layer paths
  const relevantPaths = data.paths.filter(p =>
    p.layer === 'Land' || p.layer === 'Seas'
  );

  for (const pathData of relevantPaths) {
    const territoryId = POLYGON_TO_TERRITORY[pathData.id];

    if (!territoryId) {
      unmapped.push(pathData.id);
      continue;
    }

    // Skip if we already have this territory
    if (territories[territoryId]) {
      continue;
    }

    const center = calculateCenter(pathData.d, pathData.transform);

    if (!center) {
      console.warn(`Could not calculate center for ${pathData.id} -> ${territoryId}`);
      continue;
    }

    const isSeaZone = SEA_TERRITORIES.includes(territoryId);
    const isSupplyCenter = SUPPLY_CENTERS.includes(territoryId);

    territories[territoryId] = {
      svgPath: pathData.d,
      transform: pathData.transform,
      center,
      labelPosition: {
        x: center.x,
        y: center.y + (isSeaZone ? 5 : 4)
      },
      isSeaZone,
      isSupplyCenter,
      supplyCenterPosition: isSupplyCenter ? {
        x: center.x,
        y: center.y + 8
      } : undefined,
    };

    missingTerritories.delete(territoryId);
  }

  console.log(`Mapped ${Object.keys(territories).length} territories`);

  // Report missing
  if (missingTerritories.size > 0) {
    console.log(`\nMissing ${missingTerritories.size} territories:`);
    console.log('  ' + [...missingTerritories].sort().join(', '));
  }

  console.log(`\nUnmapped polygon IDs: ${unmapped.length}`);

  // Adjust Norway center westward (label/SC was appearing on Sweden side)
  if (territories['nwy']) {
    territories['nwy'].center.x -= 40;
    territories['nwy'].labelPosition.x -= 40;
    if (territories['nwy'].supplyCenterPosition) {
      territories['nwy'].supplyCenterPosition.x -= 40;
    }
  }

  // Generate TypeScript file
  generateTypeScript(territories, [...missingTerritories].sort());
}

function generateTypeScript(territories, missingTerritories) {
  // Create placeholder entries for missing territories
  // Coordinates are based on screen positions in 1152x1152 viewBox
  const placeholders = {};
  const placeholderCoords = {
    // Based on standard Diplomacy map layout and surrounding territory positions
    'nwg': { x: 450, y: 140 },   // Norwegian Sea - between NAO (74,137) and BAR (853,163)
    'tyr': { x: 540, y: 780 },   // Tyrolia - between MUN (686,708) and VEN (484,834), in Alps
    'tri': { x: 600, y: 870 },   // Trieste - between VEN (484,834) and SER (660,880), Adriatic coast
    'gal': { x: 780, y: 850 },   // Galicia - between BOH (752,883) and WAR (715,274), north of BUD
    'den': { x: 620, y: 420 },   // Denmark - between SWE (602,346) and KIE (686,708), peninsula
  };

  for (const tid of missingTerritories) {
    const coord = placeholderCoords[tid] || { x: 500, y: 500 };
    const isSeaZone = SEA_TERRITORIES.includes(tid);
    const isSupplyCenter = SUPPLY_CENTERS.includes(tid);

    placeholders[tid] = {
      svgPath: `M ${coord.x},${coord.y} L ${coord.x + 30},${coord.y} L ${coord.x + 30},${coord.y + 25} L ${coord.x},${coord.y + 25} Z`,
      transform: null,
      center: coord,
      labelPosition: { x: coord.x + 15, y: coord.y + 15 },
      isSeaZone,
      isSupplyCenter,
      supplyCenterPosition: isSupplyCenter ? { x: coord.x + 15, y: coord.y + 20 } : undefined,
    };
  }

  const allTerritories = { ...territories, ...placeholders };

  const output = `/**
 * Classic Diplomacy Map Visual Data
 *
 * SVG paths and positions for the standard 1901 Diplomacy map
 * Map data derived from Diplomacy.svg by Martin Asal (CC BY-SA 4.0)
 * via https://github.com/elespike/diplomacy_maps
 *
 * Original: https://commons.wikimedia.org/wiki/File:Diplomacy.svg
 */

import type { MapData, TerritoryVisualData } from '../types/map.js';
import type { PowerId } from '../types/game.js';

/**
 * Power colors for the classic map
 */
export const CLASSIC_POWER_COLORS: Record<PowerId, { fill: string; stroke: string }> = {
  england: { fill: '#1E3A8A', stroke: '#1E40AF' },
  france: { fill: '#60A5FA', stroke: '#3B82F6' },
  germany: { fill: '#4B5563', stroke: '#374151' },
  italy: { fill: '#22C55E', stroke: '#16A34A' },
  austria: { fill: '#EF4444', stroke: '#DC2626' },
  russia: { fill: '#A855F7', stroke: '#9333EA' },
  turkey: { fill: '#F59E0B', stroke: '#D97706' },
};

/**
 * Neutral territory colors
 */
export const NEUTRAL_COLORS = {
  land: '#D4C4A8',
  sea: '#B8D4E8',
  supplyCenterNeutral: '#FFD700',
};

/**
 * Transform string for paths that need scaling
 * Original paths are in ~610x610 scale, need to transform to 1152x1152
 */
const TRANSFORM = 'matrix(1.8885246,0,0,1.8885246,0.9442593,48.157374)';

/**
 * Visual data for all 75 territories in classic Diplomacy
 * ViewBox: 0 0 1152 1152
 */
export const CLASSIC_TERRITORY_VISUALS: Record<string, TerritoryVisualData> = {
${Object.entries(allTerritories)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([id, data]) => {
    const lines = [];
    lines.push(`  '${id}': {`);
    lines.push(`    svgPath: '${data.svgPath}',`);
    if (data.transform) {
      lines.push(`    transform: TRANSFORM,`);
    }
    lines.push(`    center: { x: ${data.center.x}, y: ${data.center.y} },`);
    lines.push(`    labelPosition: { x: ${data.labelPosition.x}, y: ${data.labelPosition.y} },`);
    if (data.supplyCenterPosition) {
      lines.push(`    supplyCenterPosition: { x: ${data.supplyCenterPosition.x}, y: ${data.supplyCenterPosition.y} },`);
    }
    lines.push(`    defaultFill: ${data.isSeaZone ? 'NEUTRAL_COLORS.sea' : 'NEUTRAL_COLORS.land'},`);
    lines.push(`  },`);
    return lines.join('\n');
  })
  .join('\n')}
};

/**
 * List of all supply center territory IDs (34 total)
 */
export const SUPPLY_CENTER_IDS = [
  // England (3)
  'edi', 'lvp', 'lon',
  // France (3)
  'bre', 'par', 'mar',
  // Germany (3)
  'kie', 'ber', 'mun',
  // Italy (3)
  'ven', 'rom', 'nap',
  // Austria (3)
  'vie', 'tri', 'bud',
  // Russia (4)
  'stp', 'mos', 'war', 'sev',
  // Turkey (3)
  'con', 'ank', 'smy',
  // Neutrals (12)
  'nwy', 'swe', 'den', 'hol', 'bel', 'spa', 'por', 'tun', 'ser', 'gre', 'bul', 'rum',
];

/**
 * Complete classic map data
 */
export const CLASSIC_MAP_DATA: MapData = {
  id: 'classic',
  name: 'Classic Diplomacy Map',
  viewBox: { width: 1152, height: 1152 },
  territories: CLASSIC_TERRITORY_VISUALS,
  powerColors: CLASSIC_POWER_COLORS,
};
`;

  fs.writeFileSync(OUTPUT_PATH, output);
  console.log(`\nGenerated ${OUTPUT_PATH}`);
}

main();
