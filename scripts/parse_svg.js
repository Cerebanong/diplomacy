const fs = require('fs');
const svg = fs.readFileSync('C:\\Code\\Projects\\Diplomacy\\packages\\shared\\src\\maps\\Diplomacy.svg', 'utf8');

// Transform: x' = 1.8885246*x + 0.9442593, y' = 1.8885246*y + 48.157374
const txFn = (x) => 1.8885246 * x + 0.9442593;
const tyFn = (y) => 1.8885246 * y + 48.157374;

// Find Land and Seas layers by line ranges
const lines = svg.split('\n');
let landStart = -1, seasStart = -1, impassableStart = -1;
let bigDotsStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('inkscape:label="Land"')) landStart = i;
  if (lines[i].includes('inkscape:label="Impassable"')) impassableStart = i;
  if (lines[i].includes('inkscape:label="Seas"')) seasStart = i;
  if (lines[i].includes('inkscape:label="Big dots"')) bigDotsStart = i;
}

const landContent = lines.slice(landStart, impassableStart).join('\n');
const seasContent = lines.slice(seasStart, bigDotsStart).join('\n');

function isDashed(style) {
  if (!style) return false;
  const dashMatch = style.match(/stroke-dasharray\s*:\s*([^;]+)/);
  if (!dashMatch) return false;
  const val = dashMatch[1].trim();
  return val !== 'none' && val !== '0';
}

function parsePathD(d) {
  const coords = [];
  let cx = 0, cy = 0;
  const tokens = d.match(/[a-zA-Z]|[-+]?[0-9]*\.?[0-9]+/g);
  if (!tokens) return null;
  let cmd = '';
  let i = 0;
  let startX = 0, startY = 0;
  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) {
      cmd = tokens[i];
      i++;
    }
    if (i >= tokens.length) break;
    switch (cmd) {
      case 'M':
        cx = parseFloat(tokens[i]); cy = parseFloat(tokens[i+1]);
        coords.push([cx, cy]);
        startX = cx; startY = cy;
        i += 2;
        cmd = 'L';
        break;
      case 'm':
        cx += parseFloat(tokens[i]); cy += parseFloat(tokens[i+1]);
        coords.push([cx, cy]);
        startX = cx; startY = cy;
        i += 2;
        cmd = 'l';
        break;
      case 'L':
        cx = parseFloat(tokens[i]); cy = parseFloat(tokens[i+1]);
        coords.push([cx, cy]);
        i += 2;
        break;
      case 'l':
        cx += parseFloat(tokens[i]); cy += parseFloat(tokens[i+1]);
        coords.push([cx, cy]);
        i += 2;
        break;
      case 'H':
        cx = parseFloat(tokens[i]);
        coords.push([cx, cy]);
        i++;
        break;
      case 'h':
        cx += parseFloat(tokens[i]);
        coords.push([cx, cy]);
        i++;
        break;
      case 'V':
        cy = parseFloat(tokens[i]);
        coords.push([cx, cy]);
        i++;
        break;
      case 'v':
        cy += parseFloat(tokens[i]);
        coords.push([cx, cy]);
        i++;
        break;
      case 'C':
        for (let j = 0; j < 3; j++) {
          if (i + 1 >= tokens.length) break;
          coords.push([parseFloat(tokens[i]), parseFloat(tokens[i+1])]);
          i += 2;
        }
        cx = coords[coords.length-1][0]; cy = coords[coords.length-1][1];
        break;
      case 'c':
        for (let j = 0; j < 3; j++) {
          if (i + 1 >= tokens.length) break;
          const px = cx + parseFloat(tokens[i]);
          const py = cy + parseFloat(tokens[i+1]);
          coords.push([px, py]);
          i += 2;
        }
        cx = coords[coords.length-1][0]; cy = coords[coords.length-1][1];
        break;
      case 'S':
        for (let j = 0; j < 2; j++) {
          if (i + 1 >= tokens.length) break;
          coords.push([parseFloat(tokens[i]), parseFloat(tokens[i+1])]);
          i += 2;
        }
        cx = coords[coords.length-1][0]; cy = coords[coords.length-1][1];
        break;
      case 's':
        for (let j = 0; j < 2; j++) {
          if (i + 1 >= tokens.length) break;
          const px2 = cx + parseFloat(tokens[i]);
          const py2 = cy + parseFloat(tokens[i+1]);
          coords.push([px2, py2]);
          i += 2;
        }
        cx = coords[coords.length-1][0]; cy = coords[coords.length-1][1];
        break;
      case 'Q':
        for (let j = 0; j < 2; j++) {
          if (i + 1 >= tokens.length) break;
          coords.push([parseFloat(tokens[i]), parseFloat(tokens[i+1])]);
          i += 2;
        }
        cx = coords[coords.length-1][0]; cy = coords[coords.length-1][1];
        break;
      case 'q':
        for (let j = 0; j < 2; j++) {
          if (i + 1 >= tokens.length) break;
          const px3 = cx + parseFloat(tokens[i]);
          const py3 = cy + parseFloat(tokens[i+1]);
          coords.push([px3, py3]);
          i += 2;
        }
        cx = coords[coords.length-1][0]; cy = coords[coords.length-1][1];
        break;
      case 'A':
        if (i + 6 < tokens.length) {
          i += 5;
          cx = parseFloat(tokens[i]); cy = parseFloat(tokens[i+1]);
          coords.push([cx, cy]);
          i += 2;
        } else { i = tokens.length; }
        break;
      case 'a':
        if (i + 6 < tokens.length) {
          i += 5;
          cx += parseFloat(tokens[i]); cy += parseFloat(tokens[i+1]);
          coords.push([cx, cy]);
          i += 2;
        } else { i = tokens.length; }
        break;
      case 'Z':
      case 'z':
        cx = startX; cy = startY;
        break;
      default:
        i++;
    }
  }
  if (coords.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of coords) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function processLayer(layerContent, layerName) {
  // Match all path and polygon elements (self-closing or with closing tag)
  const elemRegex = /<(path|polygon)\s([\s\S]*?)(?:\/>|<\/\1>)/g;
  let match;
  const results = [];
  while ((match = elemRegex.exec(layerContent)) !== null) {
    const tag = match[1];
    const attrs = match[2];

    const idMatch = attrs.match(/id="([^"]+)"/);
    const id = idMatch ? idMatch[1] : 'NO_ID';

    const styleMatch = attrs.match(/style="([^"]+)"/);
    const style = styleMatch ? styleMatch[1] : '';

    if (isDashed(style)) continue;

    const transformMatch = attrs.match(/transform="([^"]+)"/);
    const hasTransform = !!transformMatch;

    let bbox = null;
    let dataStr = '';

    if (tag === 'path') {
      const dMatch = attrs.match(/\bd="([^"]+)"/);
      if (!dMatch) continue;
      dataStr = dMatch[1];
      bbox = parsePathD(dataStr);
    } else if (tag === 'polygon') {
      const pointsMatch = attrs.match(/points="([^"]+)"/);
      if (!pointsMatch) continue;
      dataStr = pointsMatch[1];
      const pairs = dataStr.trim().split(/\s+/);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const pair of pairs) {
        const [x, y] = pair.split(',').map(Number);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      bbox = { minX, minY, maxX, maxY };
    }

    if (!bbox) continue;

    let centerX, centerY, area;
    if (hasTransform) {
      const origCX = (bbox.minX + bbox.maxX) / 2;
      const origCY = (bbox.minY + bbox.maxY) / 2;
      centerX = txFn(origCX);
      centerY = tyFn(origCY);
      const w = (bbox.maxX - bbox.minX) * 1.8885246;
      const h = (bbox.maxY - bbox.minY) * 1.8885246;
      area = Math.round(w * h);
    } else {
      centerX = (bbox.minX + bbox.maxX) / 2;
      centerY = (bbox.minY + bbox.maxY) / 2;
      area = Math.round((bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY));
    }

    const first80 = dataStr.substring(0, 80);

    results.push(
      layerName + ' | ' + id + ' | ' + tag + ' | ' +
      (hasTransform ? 'yes' : 'no') + ' | ' +
      Math.round(centerX) + ',' + Math.round(centerY) + ' | ' +
      area + ' | ' + first80
    );
  }
  return results;
}

const landResults = processLayer(landContent, 'Land');
const seasResults = processLayer(seasContent, 'Seas');

console.log('=== LAND LAYER (' + landResults.length + ' elements) ===');
for (const r of landResults) console.log(r);
console.log('');
console.log('=== SEAS LAYER (' + seasResults.length + ' elements) ===');
for (const r of seasResults) console.log(r);

// Now match problem territories
console.log('\n=== PROBLEM TERRITORY MATCHING ===');
const problems = [
  { name: 'BLA', cx: 871, cy: 840, layer: 'Seas' },
  { name: 'AEG', cx: 716, cy: 973, layer: 'Seas' },
  { name: 'MAO', cx: 44, cy: 668, layer: 'Seas' },
  { name: 'CON', cx: 809, cy: 902, layer: 'Land' },
  { name: 'ANK', cx: 903, cy: 934, layer: 'Land' },
  { name: 'BUL', cx: 720, cy: 913, layer: 'Land' },
  { name: 'NWY', cx: 476, cy: 378, layer: 'Land' },
  { name: 'FIN', cx: 694, cy: 340, layer: 'Land' },
  { name: 'STP', cx: 768, cy: 437, layer: 'Land' },
  { name: 'DEN', cx: 464, cy: 530, layer: 'Land' },
  { name: 'BOT', cx: 613, cy: 383, layer: 'Seas' },
  { name: 'MUN', cx: 427, cy: 718, layer: 'Land' },
  { name: 'BUR', cx: 334, cy: 757, layer: 'Land' },
  { name: 'MAR', cx: 346, cy: 741, layer: 'Land' },
];

const allResults = [...landResults, ...seasResults];

for (const prob of problems) {
  console.log('\n--- ' + prob.name + ' (target: ' + prob.cx + ',' + prob.cy + ', layer: ' + prob.layer + ') ---');
  // Find closest elements from correct layer
  const layerResults = allResults.filter(r => r.startsWith(prob.layer));
  const distances = layerResults.map(r => {
    const centerPart = r.split(' | ')[4];
    const [cx, cy] = centerPart.split(',').map(Number);
    const dist = Math.sqrt((cx - prob.cx) ** 2 + (cy - prob.cy) ** 2);
    return { r, dist };
  });
  distances.sort((a, b) => a.dist - b.dist);
  for (let i = 0; i < Math.min(5, distances.length); i++) {
    console.log('  dist=' + Math.round(distances[i].dist) + ' => ' + distances[i].r);
  }
}
