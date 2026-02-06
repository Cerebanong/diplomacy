/**
 * Analyze territory mappings to identify issues
 */

const fs = require('fs');
const path = require('path');

const EXTRACTED_PATHS = path.join(__dirname, 'extracted-paths.json');
const data = JSON.parse(fs.readFileSync(EXTRACTED_PATHS, 'utf-8'));

// Parse starting coordinate from path
function parseCoord(pathD) {
  const match = pathD.match(/^m\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/i);
  if (match) return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
  return null;
}

// Transform SVG to screen coordinates
function toScreen(svgX, svgY) {
  return {
    x: Math.round(svgX * 1.8885246 + 0.9442593),
    y: Math.round(svgY * 1.8885246 + 48.157374)
  };
}

// Get all Land paths with coordinates
const landPaths = data.paths
  .filter(p => p.layer === 'Land')
  .map(p => {
    const coord = parseCoord(p.d);
    if (!coord) return null;
    const screen = toScreen(coord.x, coord.y);
    return {
      id: p.id,
      svgX: coord.x,
      svgY: coord.y,
      screenX: screen.x,
      screenY: screen.y,
      pathStart: p.d.substring(0, 50)
    };
  })
  .filter(Boolean);

// Sort by screen X (west to east)
landPaths.sort((a, b) => a.screenX - b.screenX);

console.log('=== ANALYSIS: Land Paths by Screen X (West to East) ===\n');

// Group by rough geographic regions based on X coordinate
const regions = {
  'IBERIA/WEST (X < 200)': landPaths.filter(p => p.screenX < 200),
  'FRANCE/BRITAIN (X 200-400)': landPaths.filter(p => p.screenX >= 200 && p.screenX < 400),
  'GERMANY/ITALY (X 400-600)': landPaths.filter(p => p.screenX >= 400 && p.screenX < 600),
  'AUSTRIA/BALKANS (X 600-850)': landPaths.filter(p => p.screenX >= 600 && p.screenX < 850),
  'RUSSIA/TURKEY (X 850+)': landPaths.filter(p => p.screenX >= 850)
};

for (const [region, paths] of Object.entries(regions)) {
  console.log(`\n--- ${region} ---`);
  paths.forEach(p => {
    console.log(`  ${p.id.padEnd(14)} Screen(${p.screenX.toString().padStart(4)},${p.screenY.toString().padStart(4)}) SVG(${p.svgX.toString().padStart(4)},${p.svgY.toString().padStart(4)})`);
  });
}

// Now look at specific problem areas
console.log('\n\n=== PROBLEM ANALYSIS ===\n');

// Check what's at low X coordinates (Iberia)
console.log('--- Paths at X < 150 (Should be: SPA, POR, MAO coast) ---');
landPaths.filter(p => p.screenX < 150).forEach(p => {
  console.log(`  ${p.id}: Screen(${p.screenX},${p.screenY})`);
});

// Check Austria-Hungary region
console.log('\n--- Paths in Austria-Hungary region (X 650-800, Y 850-950) ---');
console.log('Expected: BOH, VIE, BUD, GAL, TRI, TYR, SER');
landPaths.filter(p => p.screenX >= 650 && p.screenX <= 800 && p.screenY >= 850 && p.screenY <= 950)
  .forEach(p => {
    console.log(`  ${p.id}: Screen(${p.screenX},${p.screenY})`);
  });

// Check Balkans region
console.log('\n--- Paths in Balkans region (X 600-750, Y 900-1050) ---');
console.log('Expected: SER, ALB, GRE, BUL');
landPaths.filter(p => p.screenX >= 600 && p.screenX <= 750 && p.screenY >= 900 && p.screenY <= 1050)
  .forEach(p => {
    console.log(`  ${p.id}: Screen(${p.screenX},${p.screenY})`);
  });

// List what SHOULD be where (expected Diplomacy geography)
console.log('\n\n=== EXPECTED DIPLOMACY GEOGRAPHY (approximate screen coords) ===');
const expected = {
  // Iberia
  'por': { x: '50-150', y: '850-950' },
  'spa': { x: '100-250', y: '800-900' },

  // France
  'bre': { x: '200-280', y: '650-720' },
  'par': { x: '280-350', y: '700-750' },
  'pic': { x: '290-360', y: '630-680' },
  'bur': { x: '300-380', y: '780-850' },
  'gas': { x: '230-310', y: '760-830' },
  'mar': { x: '320-400', y: '700-780' },

  // Britain
  'cly': { x: '250-310', y: '400-450' },
  'edi': { x: '280-340', y: '420-480' },
  'lvp': { x: '220-280', y: '550-610' },
  'yor': { x: '280-340', y: '490-550' },
  'wal': { x: '240-300', y: '480-540' },
  'lon': { x: '280-340', y: '560-620' },

  // Germany
  'kie': { x: '450-520', y: '450-520' },
  'ber': { x: '520-600', y: '660-720' },
  'mun': { x: '500-580', y: '760-830' },
  'pru': { x: '560-640', y: '700-770' },
  'sil': { x: '620-700', y: '730-800' },
  'ruh': { x: '340-420', y: '620-690' },

  // Austria-Hungary
  'boh': { x: '700-780', y: '850-920' },
  'vie': { x: '720-800', y: '870-940' },
  'bud': { x: '760-840', y: '860-930' },
  'gal': { x: '780-860', y: '800-870' },
  'tri': { x: '580-660', y: '850-920' },
  'tyr': { x: '550-630', y: '810-880' },

  // Balkans
  'ser': { x: '640-720', y: '860-930' },
  'alb': { x: '620-700', y: '910-980' },
  'gre': { x: '660-740', y: '960-1050' },
  'bul': { x: '720-800', y: '900-970' },
  'rum': { x: '780-860', y: '780-850' },
};

console.log('Approximate expected positions for key territories:');
for (const [tid, range] of Object.entries(expected)) {
  console.log(`  ${tid.toUpperCase()}: X ${range.x}, Y ${range.y}`);
}

console.log('\n\n=== CURRENT MAPPING FROM SCRIPT ===');
// Read the current generate script to see mappings
const generateScript = fs.readFileSync(path.join(__dirname, 'generate-visual-data.js'), 'utf-8');
const mappingMatch = generateScript.match(/const TERRITORY_MAPPING = \{([\s\S]*?)\};/);
if (mappingMatch) {
  const lines = mappingMatch[1].split('\n').filter(l => l.includes(':'));
  console.log('Current polygon-to-territory mappings:');
  lines.forEach(l => console.log(l));
}
