/**
 * Extract ALL territory label positions from SVG
 * Parses Labels_land layer and finds referenced path coordinates in Curves layer
 */

const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '../packages/shared/src/maps/Diplomacy.svg');
const svg = fs.readFileSync(SVG_PATH, 'utf-8');

// Territory name to code mapping (all 75 territories)
const NAME_TO_CODE = {
  // Land territories (56)
  'Denmark': 'den',
  'Edinburgh': 'edi',
  'Clyde': 'cly',
  'Liverpool': 'lvp',
  'Holland': 'hol',
  'Belgium': 'bel',
  'Picardy': 'pic',
  'Wales': 'wal',
  'Yorkshire': 'yor',
  'London': 'lon',
  'Tuscany': 'tus',
  'Paris': 'par',
  'Brest': 'bre',
  'Burgundy': 'bur',
  'Gascony': 'gas',
  'Marseilles': 'mar',
  'Piedmont': 'pie',
  'Venice': 'ven',
  'Naples': 'nap',
  'Rome': 'rom',
  'Apulia': 'apu',
  'Spain': 'spa',
  'Portugal': 'por',
  'North Africa': 'naf',
  'Tunis': 'tun',
  'Albania': 'alb',
  'Greece': 'gre',
  'Bulgaria': 'bul',
  'Smyrna': 'smy',
  'Ankara': 'ank',
  'Armenia': 'arm',
  'Syria': 'syr',
  'Rumania': 'rum',
  'Serbia': 'ser',
  'Budapest': 'bud',
  'Trieste': 'tri',
  'Vienna': 'vie',
  'Tyrolia': 'tyr',
  'Bohemia': 'boh',
  'Galicia': 'gal',
  'Munich': 'mun',
  'Berlin': 'ber',
  'Kiel': 'kie',
  'Ruhr': 'ruh',
  'Silesia': 'sil',
  'Prussia': 'pru',
  'Warsaw': 'war',
  'Ukraine': 'ukr',
  'Sevastopol': 'sev',
  'Constantinople': 'con',
  'Moscow': 'mos',
  'Livonia': 'lvn',
  'Saint Petersburg': 'stp',
  'St. Petersburg': 'stp',
  'Finland': 'fin',
  'Norway': 'nwy',
  'Sweden': 'swe',
  // Sea zones (19)
  'North Sea': 'nth',
  'Norwegian Sea': 'nwg',
  'Barents Sea': 'bar',
  'Skagerrak': 'ska',
  'Helgoland Bight': 'hel',
  'Helgoland': 'hel',
  'Baltic Sea': 'bal',
  'Gulf of Bothnia': 'bot',
  'English Channel': 'eng',
  'Irish Sea': 'iri',
  'North Atlantic Ocean': 'nao',
  'North Atlantic': 'nao',
  'Mid-Atlantic Ocean': 'mao',
  'Mid Atlantic Ocean': 'mao',
  'Western Mediterranean': 'wes',
  'Gulf of Lyon': 'gol',
  'Gulf of Lyons': 'gol',
  'Tyrrhenian Sea': 'tys',
  'Ionian Sea': 'ion',
  'Adriatic Sea': 'adr',
  'Aegean Sea': 'aeg',
  'Eastern Mediterranean': 'eas',
  'Black Sea': 'bla',
};

// Transform SVG to screen coordinates
function toScreen(svgX, svgY) {
  return {
    x: Math.round(svgX * 1.8885246 + 0.9442593),
    y: Math.round(svgY * 1.8885246 + 48.157374)
  };
}

// Extract starting coordinate from path d attribute
function extractPathStart(pathD) {
  // Match moveto command: m or M followed by coordinates
  const match = pathD.match(/^[mM]\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/);
  if (match) {
    return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
  }
  return null;
}

// Build a map of all path IDs to their d attributes and starting coordinates
const pathMap = {};
const pathRegex = /<path[^>]*\sid="([^"]+)"[^>]*\sd="([^"]+)"/g;
const pathRegex2 = /<path[^>]*\sd="([^"]+)"[^>]*\sid="([^"]+)"/g;

let match;
while ((match = pathRegex.exec(svg)) !== null) {
  const id = match[1];
  const d = match[2];
  const start = extractPathStart(d);
  if (start) {
    pathMap[id] = { d, start };
  }
}
while ((match = pathRegex2.exec(svg)) !== null) {
  const id = match[2];
  const d = match[1];
  if (!pathMap[id]) {
    const start = extractPathStart(d);
    if (start) {
      pathMap[id] = { d, start };
    }
  }
}

console.log(`Found ${Object.keys(pathMap).length} paths with coordinates\n`);

// Find all textPath references to path IDs and their territory names
const labelPositions = {};
const textPathRegex = /<textPath[^>]*xlink:href="#([^"]+)"[^>]*>([^<]*(?:<tspan[^>]*>([^<]*)<\/tspan>)?)/g;

while ((match = textPathRegex.exec(svg)) !== null) {
  const pathId = match[1];
  let territoryName = match[3] || match[2]; // tspan content or direct content
  territoryName = territoryName.trim();

  if (!territoryName) continue;

  const code = NAME_TO_CODE[territoryName];
  if (!code) {
    if (!territoryName.includes('Sea') && !territoryName.includes('Ocean') && !territoryName.includes('Gulf') &&
        !territoryName.includes('Channel') && !territoryName.includes('Bight') && !territoryName.includes('Atlantic')) {
      console.log(`Unknown territory: "${territoryName}" (path: ${pathId})`);
    }
    continue;
  }

  const pathInfo = pathMap[pathId];
  if (pathInfo) {
    const screen = toScreen(pathInfo.start.x, pathInfo.start.y);
    labelPositions[code] = {
      svgX: Math.round(pathInfo.start.x),
      svgY: Math.round(pathInfo.start.y),
      screenX: screen.x,
      screenY: screen.y,
      name: territoryName,
      pathId: pathId
    };
  } else {
    console.log(`Path not found: ${pathId} for "${territoryName}"`);
  }
}

// Sort by code and output
const sorted = Object.entries(labelPositions).sort((a, b) => a[0].localeCompare(b[0]));

console.log('\n=== ALL TERRITORY LABEL POSITIONS ===\n');
console.log('const LABEL_POSITIONS = {');
sorted.forEach(([code, pos]) => {
  console.log(`  '${code}': { x: ${pos.screenX}, y: ${pos.screenY} }, // ${pos.name} (path: ${pos.pathId})`);
});
console.log('};');

console.log(`\nTotal: ${sorted.length} territories extracted`);

// List missing territories
const ALL_TERRITORY_CODES = [
  // Sea
  'nth', 'nwg', 'bar', 'ska', 'hel', 'bal', 'bot',
  'eng', 'iri', 'nao', 'mao', 'wes', 'gol', 'tys',
  'ion', 'adr', 'aeg', 'eas', 'bla',
  // Land
  'cly', 'edi', 'lvp', 'yor', 'wal', 'lon',
  'bre', 'pic', 'par', 'bur', 'gas', 'mar',
  'kie', 'ber', 'mun', 'pru', 'sil', 'ruh',
  'pie', 'ven', 'tus', 'rom', 'nap', 'apu',
  'tyr', 'boh', 'vie', 'tri', 'bud', 'gal',
  'stp', 'mos', 'war', 'sev', 'ukr', 'lvn', 'fin',
  'con', 'ank', 'smy', 'arm', 'syr',
  'nwy', 'swe', 'den', 'hol', 'bel', 'spa', 'por',
  'naf', 'tun', 'ser', 'alb', 'gre', 'bul', 'rum',
];

const missing = ALL_TERRITORY_CODES.filter(c => !labelPositions[c]);
if (missing.length > 0) {
  console.log(`\nMissing ${missing.length} territories: ${missing.join(', ')}`);
}

// Output JSON for further use
const outputPath = path.join(__dirname, 'label-positions.json');
fs.writeFileSync(outputPath, JSON.stringify(labelPositions, null, 2));
console.log(`\nSaved to ${outputPath}`);
