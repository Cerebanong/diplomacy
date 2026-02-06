/**
 * Extract territory label positions from the SVG Curves layer
 * These define where labels are actually placed on the map
 */

const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '../packages/shared/src/maps/Diplomacy.svg');
const svg = fs.readFileSync(SVG_PATH, 'utf-8');

// Territory name to code mapping
const NAME_TO_CODE = {
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
  'Finland': 'fin',
  'Norway': 'nwy',
  'Sweden': 'swe',
  // Sea zones
  'North Sea': 'nth',
  'Norwegian Sea': 'nwg',
  'Barents Sea': 'bar',
  'Skagerrak': 'ska',
  'Helgoland Bight': 'hel',
  'Baltic Sea': 'bal',
  'Gulf of Bothnia': 'bot',
  'English Channel': 'eng',
  'Irish Sea': 'iri',
  'North Atlantic Ocean': 'nao',
  'Mid-Atlantic Ocean': 'mao',
  'Western Mediterranean': 'wes',
  'Gulf of Lyon': 'gol',
  'Tyrrhenian Sea': 'tys',
  'Ionian Sea': 'ion',
  'Adriatic Sea': 'adr',
  'Aegean Sea': 'aeg',
  'Eastern Mediterranean': 'eas',
  'Black Sea': 'bla',
};

// Extract label positions from text elements and their path references
const labelPositions = {};

// Find all text elements with territory names
const textRegex = /<text[^>]*>.*?<textPath[^>]*xlink:href="#([^"]+)"[^>]*>([^<]*)<\/textPath>.*?<\/text>/gs;
const pathRegex = /d="m\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/;

let match;
while ((match = textRegex.exec(svg)) !== null) {
  const pathId = match[1];
  let territoryName = match[2].trim();

  // Handle tspan content
  if (!territoryName) {
    const tspanMatch = match[0].match(/<tspan[^>]*>([^<]+)<\/tspan>/);
    if (tspanMatch) {
      territoryName = tspanMatch[1].trim();
    }
  }

  if (!territoryName) continue;

  const code = NAME_TO_CODE[territoryName];
  if (!code) {
    console.log(`Unknown territory: "${territoryName}"`);
    continue;
  }

  // Find the path definition
  const pathDefRegex = new RegExp(`id="${pathId}"[^>]*d="m\\s*(-?[\\d.]+)[,\\s]+(-?[\\d.]+)`, 's');
  const pathMatch = svg.match(pathDefRegex);

  if (pathMatch) {
    const x = Math.round(parseFloat(pathMatch[1]));
    const y = Math.round(parseFloat(pathMatch[2]));
    labelPositions[code] = { x, y, name: territoryName };
    console.log(`${code.toUpperCase().padEnd(4)} (${territoryName.padEnd(20)}): (${x}, ${y})`);
  }
}

console.log('\n=== LABEL POSITIONS (Screen Coordinates) ===\n');
console.log('const LABEL_POSITIONS = {');
Object.entries(labelPositions)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .forEach(([code, pos]) => {
    console.log(`  '${code}': { x: ${pos.x}, y: ${pos.y} }, // ${pos.name}`);
  });
console.log('};');

console.log(`\nTotal: ${Object.keys(labelPositions).length} territories found`);

// Compare with expected 75 territories (56 land + 19 sea)
const ALL_TERRITORIES = [
  'nth', 'nwg', 'bar', 'ska', 'hel', 'bal', 'bot',
  'eng', 'iri', 'nao', 'mao', 'wes', 'gol', 'tys',
  'ion', 'adr', 'aeg', 'eas', 'bla',
  'cly', 'edi', 'lvp', 'yor', 'wal', 'lon',
  'bre', 'pic', 'par', 'bur', 'gas', 'mar',
  'kie', 'ber', 'mun', 'pru', 'sil', 'ruh',
  'pie', 'ven', 'tus', 'rom', 'nap', 'apu',
  'tyr', 'boh', 'vie', 'tri', 'bud', 'gal',
  'stp', 'mos', 'war', 'sev', 'ukr', 'lvn', 'fin',
  'con', 'ank', 'smy', 'arm', 'syr',
  'nwy', 'swe', 'den', 'hol', 'bel', 'spa', 'por', 'naf', 'tun', 'ser', 'alb', 'gre', 'bul', 'rum',
];

const missing = ALL_TERRITORIES.filter(t => !labelPositions[t]);
if (missing.length > 0) {
  console.log(`\nMissing ${missing.length} territories: ${missing.join(', ')}`);
}
