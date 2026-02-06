/**
 * Extract territory label positions from SVG Curves layer
 * NOTE: Curves layer paths are ALREADY in 1152x1152 screen coordinates
 * (unlike Land layer which needs the matrix transform)
 */

const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '../packages/shared/src/maps/Diplomacy.svg');
const svg = fs.readFileSync(SVG_PATH, 'utf-8');

// Territory name to code mapping
const NAME_TO_CODE = {
  'Denmark': 'den', 'Edinburgh': 'edi', 'Clyde': 'cly', 'Liverpool': 'lvp',
  'Holland': 'hol', 'Belgium': 'bel', 'Picardy': 'pic', 'Wales': 'wal',
  'Yorkshire': 'yor', 'London': 'lon', 'Tuscany': 'tus', 'Paris': 'par',
  'Brest': 'bre', 'Burgundy': 'bur', 'Gascony': 'gas', 'Marseilles': 'mar',
  'Piedmont': 'pie', 'Venice': 'ven', 'Naples': 'nap', 'Rome': 'rom',
  'Apulia': 'apu', 'Spain': 'spa', 'Portugal': 'por', 'North Africa': 'naf',
  'Tunis': 'tun', 'Albania': 'alb', 'Greece': 'gre', 'Bulgaria': 'bul',
  'Smyrna': 'smy', 'Ankara': 'ank', 'Armenia': 'arm', 'Syria': 'syr',
  'Rumania': 'rum', 'Serbia': 'ser', 'Budapest': 'bud', 'Trieste': 'tri',
  'Vienna': 'vie', 'Tyrolia': 'tyr', 'Bohemia': 'boh', 'Galicia': 'gal',
  'Munich': 'mun', 'Berlin': 'ber', 'Kiel': 'kie', 'Ruhr': 'ruh',
  'Silesia': 'sil', 'Prussia': 'pru', 'Warsaw': 'war', 'Ukraine': 'ukr',
  'Sevastopol': 'sev', 'Constantinople': 'con', 'Moscow': 'mos',
  'Livonia': 'lvn', 'Saint Petersburg': 'stp', 'St. Petersburg': 'stp',
  'Finland': 'fin', 'Norway': 'nwy', 'Sweden': 'swe',
  // Sea zones
  'North Sea': 'nth', 'Norwegian Sea': 'nwg', 'Barents Sea': 'bar',
  'Skagerrak': 'ska', 'Helgoland Bight': 'hel', 'Helgoland': 'hel',
  'Baltic Sea': 'bal', 'Gulf of Bothnia': 'bot', 'English Channel': 'eng',
  'Irish Sea': 'iri', 'North Atlantic Ocean': 'nao', 'North Atlantic': 'nao',
  'Mid-Atlantic Ocean': 'mao', 'Mid Atlantic Ocean': 'mao', 'Mid-Atlantic': 'mao',
  'Western Mediterranean': 'wes', 'Gulf of Lyon': 'gol', 'Gulf of Lyons': 'gol',
  'Gulf of Lion': 'gol', 'Tyrrhenian Sea': 'tys', 'Ionian Sea': 'ion',
  'Adriatic Sea': 'adr', 'Aegean Sea': 'aeg', 'Eastern Mediterranean': 'eas',
  'Black Sea': 'bla',
};

// Extract starting coordinate from path (NO transform - already in screen coords)
function extractPathStart(pathD) {
  const match = pathD.match(/^[mM]\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/);
  if (match) {
    return { x: Math.round(parseFloat(match[1])), y: Math.round(parseFloat(match[2])) };
  }
  return null;
}

// Build map of path IDs to their starting coordinates
const pathMap = {};
const pathRegex1 = /<path[^>]*\sid="([^"]+)"[^>]*\sd="([^"]+)"/g;
const pathRegex2 = /<path[^>]*\sd="([^"]+)"[^>]*\sid="([^"]+)"/g;

let match;
while ((match = pathRegex1.exec(svg)) !== null) {
  const start = extractPathStart(match[2]);
  if (start) pathMap[match[1]] = start;
}
while ((match = pathRegex2.exec(svg)) !== null) {
  if (!pathMap[match[2]]) {
    const start = extractPathStart(match[1]);
    if (start) pathMap[match[2]] = start;
  }
}

// Find all textPath references
const labelPositions = {};
const textPathRegex = /<textPath[^>]*xlink:href="#([^"]+)"[^>]*>([^<]*(?:<tspan[^>]*>([^<]*)<\/tspan>)?)/g;

while ((match = textPathRegex.exec(svg)) !== null) {
  const pathId = match[1];
  let name = (match[3] || match[2]).trim();
  if (!name) continue;

  const code = NAME_TO_CODE[name];
  if (!code) continue;

  const pos = pathMap[pathId];
  if (pos) {
    labelPositions[code] = { x: pos.x, y: pos.y, name, pathId };
  }
}

// Output
console.log('=== CORRECT LABEL POSITIONS (Screen Coordinates 0-1152) ===\n');

const sorted = Object.entries(labelPositions).sort((a, b) => a[0].localeCompare(b[0]));
sorted.forEach(([code, pos]) => {
  console.log(`'${code}': { x: ${pos.x}, y: ${pos.y} }, // ${pos.name}`);
});

console.log(`\nTotal: ${sorted.length} territories`);

// Compare with current implementation
const CURRENT_POSITIONS = {
  'adr': { x: 563, y: 882 }, 'aeg': { x: 881, y: 1061 }, 'alb': { x: 643, y: 932 },
  'ank': { x: 528, y: 596 }, 'apu': { x: 564, y: 928 }, 'arm': { x: 715, y: 517 },
  'bal': { x: 451, y: 381 }, 'bar': { x: 853, y: 168 }, 'bel': { x: 396, y: 608 },
  'ber': { x: 554, y: 692 }, 'bla': { x: 584, y: 468 }, 'boh': { x: 736, y: 911 },
  'bot': { x: 1072, y: 1032 }, 'bre': { x: 237, y: 690 }, 'bud': { x: 176, y: 908 },
  'bul': { x: 483, y: 502 }, 'bur': { x: 334, y: 813 }, 'cly': { x: 276, y: 421 },
  'con': { x: 453, y: 607 }, 'den': { x: 635, y: 435 }, 'eas': { x: 815, y: 934 },
  'edi': { x: 298, y: 450 }, 'eng': { x: 247, y: 636 }, 'fin': { x: 965, y: 925 },
  'gal': { x: 795, y: 865 }, 'gas': { x: 265, y: 789 }, 'gol': { x: 330, y: 883 },
  'gre': { x: 691, y: 994 }, 'hel': { x: 495, y: 520 }, 'hol': { x: 423, y: 809 },
  'ion': { x: 591, y: 1034 }, 'iri': { x: 187, y: 554 }, 'kie': { x: 686, y: 712 },
  'lon': { x: 306, y: 587 }, 'lvn': { x: 926, y: 991 }, 'lvp': { x: 240, y: 578 },
  'mar': { x: 349, y: 731 }, 'mos': { x: 941, y: 207 }, 'mun': { x: 760, y: 795 },
  'naf': { x: 193, y: 1046 }, 'nao': { x: 141, y: 311 }, 'nap': { x: 551, y: 971 },
  'nth': { x: 483, y: 239 }, 'nwg': { x: 1100, y: 922 }, 'nwy': { x: 552, y: 280 },
  'par': { x: 316, y: 715 }, 'pic': { x: 322, y: 659 }, 'pie': { x: 500, y: 763 },
  'por': { x: 67, y: 868 }, 'pru': { x: 595, y: 742 }, 'rom': { x: 499, y: 900 },
  'ruh': { x: 359, y: 647 }, 'rum': { x: 770, y: 411 }, 'ser': { x: 660, y: 884 },
  'sev': { x: 934, y: 474 }, 'sil': { x: 675, y: 770 }, 'ska': { x: 686, y: 368 },
  'smy': { x: 623, y: 568 }, 'spa': { x: 158, y: 822 }, 'stp': { x: 891, y: 175 },
  'swe': { x: 602, y: 350 }, 'syr': { x: 668, y: 631 }, 'tri': { x: 615, y: 885 },
  'tun': { x: 408, y: 1067 }, 'tus': { x: 469, y: 858 }, 'tyr': { x: 579, y: 840 },
  'ukr': { x: 882, y: 407 }, 'ven': { x: 484, y: 838 }, 'vie': { x: 752, y: 887 },
  'wal': { x: 262, y: 503 }, 'war': { x: 715, y: 278 }, 'wes': { x: 242, y: 985 },
  'yor': { x: 303, y: 521 },
};

console.log('\n=== POSITION DISCREPANCIES (>50px difference) ===\n');
const discrepancies = [];
for (const [code, extracted] of sorted) {
  const current = CURRENT_POSITIONS[code];
  if (current) {
    const dx = Math.abs(extracted.x - current.x);
    const dy = Math.abs(extracted.y - current.y);
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > 50) {
      discrepancies.push({ code, current, extracted, dist: Math.round(dist), name: extracted.name });
    }
  }
}

discrepancies.sort((a, b) => b.dist - a.dist);
discrepancies.forEach(d => {
  console.log(`${d.code.toUpperCase().padEnd(4)} (${d.name.padEnd(20)}): Current(${d.current.x}, ${d.current.y}) → Should be(${d.extracted.x}, ${d.extracted.y})  [${d.dist}px off]`);
});

// Save JSON
const outputPath = path.join(__dirname, 'correct-label-positions.json');
fs.writeFileSync(outputPath, JSON.stringify(labelPositions, null, 2));
console.log(`\nSaved to ${outputPath}`);
