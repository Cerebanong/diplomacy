/**
 * Analyze all Land layer elements in Diplomacy.svg to find their bounding boxes and centers.
 * This helps identify which SVG element corresponds to which territory.
 */

const fs = require('fs');
const path = require('path');

const svgContent = fs.readFileSync(
  path.join(__dirname, '..', 'packages', 'shared', 'src', 'maps', 'Diplomacy.svg'),
  'utf-8'
);

// The transform matrix used for ~610-scale paths
const TRANSFORM_MATRIX = {
  a: 1.8885246,
  b: 0,
  c: 0,
  d: 1.8885246,
  e: 0.9442593,
  f: 48.157374,
};

function applyTransform(x, y, matrix) {
  return {
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f,
  };
}

/**
 * Parse SVG path d attribute to extract all coordinate points.
 * This is a simplified parser that handles M, m, L, l, H, h, V, v, Z, z, C, c, S, s, Q, q, A, a commands.
 */
function parsePathPoints(d) {
  const points = [];
  let currentX = 0, currentY = 0;
  let startX = 0, startY = 0;

  // Tokenize
  const tokens = d.match(/[a-zA-Z]|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g);
  if (!tokens) return points;

  let i = 0;
  let cmd = 'M';

  function nextNum() {
    if (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
      return parseFloat(tokens[i++]);
    }
    return NaN;
  }

  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) {
      cmd = tokens[i++];
    }

    switch (cmd) {
      case 'M':
        currentX = nextNum();
        currentY = nextNum();
        startX = currentX;
        startY = currentY;
        points.push({ x: currentX, y: currentY });
        cmd = 'L'; // subsequent coords treated as L
        break;
      case 'm':
        currentX += nextNum();
        currentY += nextNum();
        startX = currentX;
        startY = currentY;
        points.push({ x: currentX, y: currentY });
        cmd = 'l';
        break;
      case 'L':
        currentX = nextNum();
        currentY = nextNum();
        points.push({ x: currentX, y: currentY });
        break;
      case 'l':
        currentX += nextNum();
        currentY += nextNum();
        points.push({ x: currentX, y: currentY });
        break;
      case 'H':
        currentX = nextNum();
        points.push({ x: currentX, y: currentY });
        break;
      case 'h':
        currentX += nextNum();
        points.push({ x: currentX, y: currentY });
        break;
      case 'V':
        currentY = nextNum();
        points.push({ x: currentX, y: currentY });
        break;
      case 'v':
        currentY += nextNum();
        points.push({ x: currentX, y: currentY });
        break;
      case 'C':
        for (let j = 0; j < 3; j++) {
          const cx = nextNum();
          const cy = nextNum();
          if (!isNaN(cx) && !isNaN(cy)) {
            points.push({ x: cx, y: cy });
            currentX = cx;
            currentY = cy;
          }
        }
        break;
      case 'c':
        for (let j = 0; j < 3; j++) {
          const dx = nextNum();
          const dy = nextNum();
          if (!isNaN(dx) && !isNaN(dy)) {
            currentX += dx;
            currentY += dy;
            points.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'S':
        for (let j = 0; j < 2; j++) {
          const sx = nextNum();
          const sy = nextNum();
          if (!isNaN(sx) && !isNaN(sy)) {
            points.push({ x: sx, y: sy });
            currentX = sx;
            currentY = sy;
          }
        }
        break;
      case 's':
        for (let j = 0; j < 2; j++) {
          const dx = nextNum();
          const dy = nextNum();
          if (!isNaN(dx) && !isNaN(dy)) {
            currentX += dx;
            currentY += dy;
            points.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'Q':
        for (let j = 0; j < 2; j++) {
          const qx = nextNum();
          const qy = nextNum();
          if (!isNaN(qx) && !isNaN(qy)) {
            points.push({ x: qx, y: qy });
            currentX = qx;
            currentY = qy;
          }
        }
        break;
      case 'q':
        for (let j = 0; j < 2; j++) {
          const dx = nextNum();
          const dy = nextNum();
          if (!isNaN(dx) && !isNaN(dy)) {
            currentX += dx;
            currentY += dy;
            points.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'A':
        nextNum(); nextNum(); nextNum(); nextNum(); nextNum(); // rx ry rotation large-arc sweep
        currentX = nextNum();
        currentY = nextNum();
        if (!isNaN(currentX) && !isNaN(currentY)) {
          points.push({ x: currentX, y: currentY });
        }
        break;
      case 'a':
        nextNum(); nextNum(); nextNum(); nextNum(); nextNum();
        currentX += nextNum();
        currentY += nextNum();
        points.push({ x: currentX, y: currentY });
        break;
      case 'Z':
      case 'z':
        currentX = startX;
        currentY = startY;
        break;
      default:
        i++; // skip unknown
        break;
    }
  }

  return points;
}

function computeBBox(points) {
  if (points.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function computeArea(points) {
  // Shoelace formula for approximate area
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

// Extract Land layer content
const landLayerMatch = svgContent.match(/inkscape:label="Land"[\s\S]*?<\/g>/);
if (!landLayerMatch) {
  console.error('Could not find Land layer');
  process.exit(1);
}

const landLayer = landLayerMatch[0];

// Extract all path elements
const pathRegex = /<path[\s\S]*?\/>/g;
let match;
const elements = [];

while ((match = pathRegex.exec(landLayer)) !== null) {
  const pathEl = match[0];

  // Extract id
  const idMatch = pathEl.match(/id="([^"]+)"/);
  const id = idMatch ? idMatch[1] : 'unknown';

  // Extract d attribute
  const dMatch = pathEl.match(/\bd="([^"]+)"/);
  const d = dMatch ? dMatch[1] : '';

  // Check for transform
  const transformMatch = pathEl.match(/transform="([^"]+)"/);
  const hasTransform = !!transformMatch;

  // Check if it's a dashed line (coast path)
  const isDashed = pathEl.includes('stroke-dasharray') && !pathEl.includes('stroke-dasharray:none');

  const rawPoints = parsePathPoints(d);

  let transformedPoints;
  if (hasTransform) {
    transformedPoints = rawPoints.map(p => applyTransform(p.x, p.y, TRANSFORM_MATRIX));
  } else {
    transformedPoints = rawPoints;
  }

  const bbox = computeBBox(transformedPoints);
  if (!bbox) continue;

  const centerX = Math.round((bbox.minX + bbox.maxX) / 2);
  const centerY = Math.round((bbox.minY + bbox.maxY) / 2);
  const area = Math.round(computeArea(transformedPoints));
  const width = Math.round(bbox.maxX - bbox.minX);
  const height = Math.round(bbox.maxY - bbox.minY);

  elements.push({
    id,
    hasTransform,
    isDashed,
    d: d.substring(0, 30) + '...',
    dStart: d.substring(0, 50),
    bbox: {
      minX: Math.round(bbox.minX),
      minY: Math.round(bbox.minY),
      maxX: Math.round(bbox.maxX),
      maxY: Math.round(bbox.maxY),
    },
    center: { x: centerX, y: centerY },
    width,
    height,
    area,
  });
}

// Known territory-to-path mappings from classicVisualData.ts
const knownMappings = {
  'polygon40': 'ALB (d starts m 335,480)',
  'polygon78': 'RUH (d starts m 169,311 4,-10)',
  'polygon332': 'BOT (d starts m 301,132)',
  'polygon106': 'BRE (d starts m 100,322)',
  'polygon134': 'MAR (d starts m 208,367)',
  'polygon198': 'GAS (d starts m 142,417)',
  'polygon282': 'BUR (d starts m 169,412)',
  'polygon340': 'PAR (d starts m 146,365)',
  'polygon348': 'PIC (d starts m 169,311 -16)',
  'polygon360': 'POR (d starts m 62,407)',
  'polygon388': 'RUM (d starts m 390,425)',
  'polygon396': 'SER (d starts m 371,456)',
  'polygon86': 'BER (d starts m 556.17)',
  'path1820': 'KIE (d starts m 484.40)',
  'polygon250': 'DEN island (d starts m 461.74)',
  'polygon304': '??? (d starts m 537.28)',
  'polygon368': 'PRU (d starts m 644.93)',
  'polygon382': 'MUN (d starts m 399.42)',
  'polygon412': 'SIL (d starts m 544.83)',
  'polyline432': 'SPA polyline (d starts m 134,417)',
  'polyline436': 'MAO polyline (d starts m 40,441)',
  'polygon456': 'SWE (d starts m 275,203)',
  'polygon46': 'ANK (d starts m 982.97)',
  'polygon60': 'ARM (d starts m 1062.29)',
  'path1829': 'BLA/CON (d starts m 805.45508)',
  'polygon424': 'SMY (d starts m 799.79)',
  'polygon464': 'SYR (d starts m 1151.05)',
  'polygon478': 'TUN (d starts m 203,520)',
  'polygon54': 'APU (d starts m 318,485)',
  'polygon312': 'NAP (d starts m 311,491)',
  'polygon354': 'PIE (d starts m 233,404)',
  'polygon374': 'ROM (d starts m 279,458)',
  'polygon486': 'TUS (d starts m 236,411)',
  'polygon510': 'VEN (d starts m 270,398)',
  'polygon100': 'BOH (d starts m 316,348)',
  'polygon114': 'BUD (d starts m 311,375)',
  'polygon192': 'GAL (d starts m 404,371)',
  'polygon470': 'TRI (d starts m 294,380)',
  'polygon492': 'TYR (d starts m 241,378)',
  'polygon518': 'VIE (d starts m 303,346)',
  'polygon186': 'FIN (d starts m 660.03)',
  'polygon268': 'LVN (d starts m 690.25)',
  'polygon296': 'MOS (d starts m 1009.41 first one)',
  'polygon404': 'SEV (d starts m 1066.07)',
  'polyline444': 'STP polyline (d starts m 1009.41 second)',
  'polyline450': 'STP polyline2 (d starts m 782.79)',
  'polygon504': 'UKR (d starts m 782.79344,750)',
  'polygon532': 'WAR (d starts m 650.59)',
  'polygon140': 'CLY (d starts m 146,200)',
  'polygon172': 'EDI (d starts m 165,210)',
  'polygon260': 'WAL (d starts m 138,214)',
  'polygon274': 'LON (d starts m 178,274)',
  'polygon526': 'LVP (d starts m 128,262)',
  'polygon546': 'YOR (d starts m 168,246)',
  'polygon326': 'NAF (d starts m 0,520)',
  'polyline122': 'BUL polyline (d starts m 413,464)',
  'polyline128': 'BUL polyline2 (d starts m 371,438)',
  // Dashed paths are coast paths
  'path3284': 'SPA_SC coast',
  'path3286': 'SPA_NC coast',
  'path3387': 'BUL_EC coast',
  'path3421': 'BUL_SC coast',
  'path3423': 'STP_NC coast',
  'path3469': 'STP_SC coast',
  'path1803': 'DEN peninsula (d starts m 508.95)',
};

console.log('=== ALL LAND LAYER ELEMENTS ===');
console.log(`Total elements: ${elements.length}`);
console.log('');

for (const el of elements) {
  const known = knownMappings[el.id] || '??? UNKNOWN';
  console.log(`${el.id}: center(${el.center.x}, ${el.center.y}), size ${el.width}x${el.height}, area=${el.area}, transform=${el.hasTransform}, dashed=${el.isDashed}`);
  console.log(`  dStart: ${el.dStart}`);
  console.log(`  bbox: (${el.bbox.minX},${el.bbox.minY}) to (${el.bbox.maxX},${el.bbox.maxY})`);
  console.log(`  Mapping: ${known}`);
  console.log('');
}

// Now specifically look for NWY candidates
console.log('\n=== NWY CANDIDATES (center near 476,378 in 1152-space) ===');
console.log('Looking for elements with center roughly x=400-550, y=300-470');
for (const el of elements) {
  if (el.center.x >= 400 && el.center.x <= 550 && el.center.y >= 300 && el.center.y <= 470 && !el.isDashed) {
    const known = knownMappings[el.id] || '??? UNKNOWN';
    console.log(`  ${el.id}: center(${el.center.x}, ${el.center.y}), area=${el.area}, ${known}`);
    console.log(`    dStart: ${el.dStart}`);
  }
}

// Look for MUN candidates
console.log('\n=== MUN AREA CANDIDATES (center near 400-550, 620-740) ===');
for (const el of elements) {
  if (el.center.x >= 380 && el.center.x <= 560 && el.center.y >= 600 && el.center.y <= 750 && !el.isDashed) {
    const known = knownMappings[el.id] || '??? UNKNOWN';
    console.log(`  ${el.id}: center(${el.center.x}, ${el.center.y}), area=${el.area}, ${known}`);
    console.log(`    dStart: ${el.dStart}`);
  }
}

// Look for UNMATCHED elements (not in known mappings)
console.log('\n=== ELEMENTS NOT IN KNOWN MAPPINGS ===');
for (const el of elements) {
  if (!knownMappings[el.id]) {
    console.log(`  ${el.id}: center(${el.center.x}, ${el.center.y}), area=${el.area}, transform=${el.hasTransform}, dashed=${el.isDashed}`);
    console.log(`    dStart: ${el.dStart}`);
    console.log(`    bbox: (${el.bbox.minX},${el.bbox.minY}) to (${el.bbox.maxX},${el.bbox.maxY})`);
  }
}

// Check for NWY path specifically - the current one
console.log('\n=== CHECKING CURRENT NWY PATH ===');
const nwyD = 'M 237,249 L 230,220 225,195 225,175 237,155 258,141 269,134 277,132 292,111 303,86 310,75 310,100 300,126 301,132 292,133 290,164 285,170 287,177 279,204 279,243 z';
const nwyPoints = parsePathPoints(nwyD);
const nwyTransformed = nwyPoints.map(p => applyTransform(p.x, p.y, TRANSFORM_MATRIX));
const nwyBBox = computeBBox(nwyTransformed);
console.log(`Current NWY path bbox in 1152-space: (${Math.round(nwyBBox.minX)}, ${Math.round(nwyBBox.minY)}) to (${Math.round(nwyBBox.maxX)}, ${Math.round(nwyBBox.maxY)})`);
console.log(`Current NWY path center: (${Math.round((nwyBBox.minX + nwyBBox.maxX) / 2)}, ${Math.round((nwyBBox.minY + nwyBBox.maxY) / 2)})`);
console.log(`Width: ${Math.round(nwyBBox.maxX - nwyBBox.minX)}, Height: ${Math.round(nwyBBox.maxY - nwyBBox.minY)}`);
console.log(`Area: ${Math.round(computeArea(nwyTransformed))}`);

// Now let's check if this matches any element in the Land layer
console.log('\n=== SEARCHING FOR NWY PATH IN SVG ===');
if (landLayer.includes('237,249')) {
  console.log('Found "237,249" in Land layer');
} else {
  console.log('NOT found "237,249" in Land layer');
}
if (landLayer.includes('M 237,249')) {
  console.log('Found "M 237,249" in Land layer');
} else {
  console.log('NOT found "M 237,249" in Land layer');
}

// Search for any path containing key NWY coordinates
const nwySearchTerms = ['237,249', '310,75', '303,86', '292,111', '258,141'];
for (const term of nwySearchTerms) {
  if (landLayer.includes(term)) {
    console.log(`Found "${term}" in Land layer`);
  }
}

// Also check the entire SVG for these coordinates
for (const term of nwySearchTerms) {
  const idx = svgContent.indexOf(term);
  if (idx >= 0) {
    console.log(`Found "${term}" in SVG at position ${idx}, context: ...${svgContent.substring(Math.max(0, idx-50), idx+50)}...`);
  }
}

// Let's also look for Norway in labels layer
console.log('\n=== SEARCHING LABELS FOR NORWAY ===');
const nwyLabelMatches = svgContent.match(/[Nn]or[^"]*|[Nn]wy[^"]*/g);
if (nwyLabelMatches) {
  for (const m of nwyLabelMatches) {
    console.log(`  Found: ${m}`);
  }
}
