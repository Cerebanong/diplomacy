/**
 * Verify territory paths by computing bounding box centers from SVG d attributes
 * and comparing against declared centers in classicVisualData.ts
 *
 * Usage: node scripts/verify-territory-paths.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '../packages/shared/src/maps/Diplomacy.svg');
const svgContent = readFileSync(svgPath, 'utf8');

// Matrix transform: matrix(1.8885246,0,0,1.8885246,0.9442593,48.157374)
const SCALE = 1.8885246;
const TX = 0.9442593;
const TY = 48.157374;

function applyTransform(x, y) {
  return { x: x * SCALE + TX, y: y * SCALE + TY };
}

/**
 * Parse SVG path d attribute and compute bounding box
 */
function getPathBoundingBox(d) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let cx = 0, cy = 0;
  let startX = 0, startY = 0;

  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);
  if (!tokens) return null;

  function updateBounds(x, y) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  function parseNumbers(str) {
    const nums = str.match(/-?\d+\.?\d*(?:e[+-]?\d+)?/gi);
    return nums ? nums.map(Number) : [];
  }

  for (const token of tokens) {
    const cmd = token[0];
    const nums = parseNumbers(token.slice(1));

    switch (cmd) {
      case 'M': for (let i = 0; i < nums.length; i += 2) { cx = nums[i]; cy = nums[i+1]; updateBounds(cx, cy); if (i === 0) { startX = cx; startY = cy; } } break;
      case 'm': for (let i = 0; i < nums.length; i += 2) { cx += nums[i]; cy += nums[i+1]; updateBounds(cx, cy); if (i === 0) { startX = cx; startY = cy; } } break;
      case 'L': for (let i = 0; i < nums.length; i += 2) { cx = nums[i]; cy = nums[i+1]; updateBounds(cx, cy); } break;
      case 'l': for (let i = 0; i < nums.length; i += 2) { cx += nums[i]; cy += nums[i+1]; updateBounds(cx, cy); } break;
      case 'H': for (const n of nums) { cx = n; updateBounds(cx, cy); } break;
      case 'h': for (const n of nums) { cx += n; updateBounds(cx, cy); } break;
      case 'V': for (const n of nums) { cy = n; updateBounds(cx, cy); } break;
      case 'v': for (const n of nums) { cy += n; updateBounds(cx, cy); } break;
      case 'C': for (let i = 0; i < nums.length; i += 6) { updateBounds(nums[i], nums[i+1]); updateBounds(nums[i+2], nums[i+3]); cx = nums[i+4]; cy = nums[i+5]; updateBounds(cx, cy); } break;
      case 'c': for (let i = 0; i < nums.length; i += 6) { updateBounds(cx+nums[i], cy+nums[i+1]); updateBounds(cx+nums[i+2], cy+nums[i+3]); cx += nums[i+4]; cy += nums[i+5]; updateBounds(cx, cy); } break;
      case 'S': for (let i = 0; i < nums.length; i += 4) { updateBounds(nums[i], nums[i+1]); cx = nums[i+2]; cy = nums[i+3]; updateBounds(cx, cy); } break;
      case 's': for (let i = 0; i < nums.length; i += 4) { updateBounds(cx+nums[i], cy+nums[i+1]); cx += nums[i+2]; cy += nums[i+3]; updateBounds(cx, cy); } break;
      case 'A': for (let i = 0; i < nums.length; i += 7) { cx = nums[i+5]; cy = nums[i+6]; updateBounds(cx, cy); } break;
      case 'a': for (let i = 0; i < nums.length; i += 7) { cx += nums[i+5]; cy += nums[i+6]; updateBounds(cx, cy); } break;
      case 'Z': case 'z': cx = startX; cy = startY; break;
    }
  }

  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
}

// ALL territory centers from classicVisualData.ts
const ALL_CENTERS = {
  adr: {x:530,y:867}, aeg: {x:716,y:973}, alb: {x:628,y:898}, ank: {x:903,y:934},
  apu: {x:534,y:908}, arm: {x:1066,y:916}, bal: {x:574,y:537}, bar: {x:804,y:100},
  bel: {x:328,y:635}, ber: {x:499,y:615}, bla: {x:871,y:840}, boh: {x:521,y:689},
  bot: {x:613,y:383}, bre: {x:205,y:664}, bud: {x:622,y:762}, bul: {x:720,y:913},
  bur: {x:334,y:757}, cly: {x:255,y:440}, con: {x:809,y:902}, den: {x:464,y:530},
  eas: {x:822,y:1075}, edi: {x:305,y:466}, eng: {x:195,y:641}, fin: {x:694,y:340},
  gal: {x:663,y:694}, gas: {x:240,y:800}, gol: {x:303,y:869}, gre: {x:639,y:975},
  hel: {x:396,y:561}, hol: {x:366,y:612}, ion: {x:557,y:1048}, iri: {x:153,y:590},
  kie: {x:455,y:599}, lon: {x:281,y:600}, lvn: {x:704,y:524}, lvp: {x:278,y:527},
  mao: {x:44,y:668}, mar: {x:296,y:820}, mos: {x:922,y:486}, mun: {x:427,y:718},
  naf: {x:198,y:1051}, nao: {x:82,y:365}, nap: {x:499,y:917}, nth: {x:358,y:498},
  nwg: {x:416,y:225}, nwy: {x:476,y:378}, par: {x:291,y:700}, pic: {x:294,y:667},
  pie: {x:394,y:819}, por: {x:50,y:898}, pru: {x:603,y:598}, rom: {x:476,y:894},
  ruh: {x:417,y:678}, rum: {x:757,y:769}, ser: {x:636,y:875}, sev: {x:916,y:816},
  sil: {x:544,y:639}, ska: {x:453,y:468}, smy: {x:802,y:1007}, spa: {x:127,y:853},
  stp: {x:768,y:437}, swe: {x:572,y:355}, syr: {x:1047,y:1015}, tri: {x:539,y:802},
  tun: {x:383,y:1079}, tus: {x:442,y:833}, tyr: {x:480,y:772}, tys: {x:430,y:936},
  ukr: {x:778,y:672}, ven: {x:457,y:830}, vie: {x:563,y:733}, wal: {x:234,y:556},
  war: {x:656,y:634}, wes: {x:181,y:994}, yor: {x:297,y:558},
};

// Extract paths from Land layer only (these are the territory borders)
function extractLayerPaths(layerLabel) {
  const labelPattern = new RegExp(`inkscape:label="${layerLabel}"`, 'i');
  const match = svgContent.match(labelPattern);
  if (!match) return [];

  const layerStart = match.index;
  let gStart = svgContent.lastIndexOf('<g', layerStart);
  let layerEnd = svgContent.length;
  let depth = 0;

  for (let i = gStart; i < svgContent.length; i++) {
    if (svgContent.substring(i, i + 2) === '<g' && (svgContent[i+2] === ' ' || svgContent[i+2] === '>')) depth++;
    else if (svgContent.substring(i, i + 4) === '</g>') { depth--; if (depth === 0) { layerEnd = i + 4; break; } }
  }

  const layerContent = svgContent.substring(gStart, layerEnd);
  const pathRegex = /<path[\s\S]*?\/>/g;
  const paths = [];
  let pathMatch;

  while ((pathMatch = pathRegex.exec(layerContent)) !== null) {
    const elem = pathMatch[0];
    const idMatch = elem.match(/id="([^"]+)"/);
    const dMatch = elem.match(/\sd="([^"]+)"/);
    const transformMatch = elem.match(/transform="([^"]+)"/);
    const styleMatch = elem.match(/style="([^"]+)"/);

    if (idMatch && dMatch) {
      const isDashed = styleMatch && styleMatch[1].includes('stroke-dasharray') && !styleMatch[1].includes('stroke-dasharray:none');
      paths.push({ id: idMatch[1], d: dMatch[1], transform: transformMatch ? transformMatch[1] : null, isDashed });
    }
  }
  return paths;
}

const landPaths = extractLayerPaths('Land');
const seaPaths = extractLayerPaths('Seas');

console.log(`Land paths: ${landPaths.length}, Sea paths: ${seaPaths.length}\n`);

// For each path in the Land layer, find which territory center is closest
console.log('=== LAND LAYER: PATH -> NEAREST TERRITORY ===\n');

const problemTerritories = new Set(['mun','boh','gal','sev','ukr','bla','rum','con','bud','spa','tri']);

for (const pathInfo of landPaths) {
  if (pathInfo.isDashed) continue;

  const bbox = getPathBoundingBox(pathInfo.d);
  if (!bbox) continue;
  if (bbox.width < 5 && bbox.height < 5) continue; // Skip tiny paths

  let centerX, centerY;
  if (pathInfo.transform && pathInfo.transform.includes('matrix')) {
    const t = applyTransform(bbox.centerX, bbox.centerY);
    centerX = t.x; centerY = t.y;
  } else {
    centerX = bbox.centerX; centerY = bbox.centerY;
  }

  // Find nearest territory center
  let bestTer = null, bestDist = Infinity;
  for (const [terId, center] of Object.entries(ALL_CENTERS)) {
    const dist = Math.sqrt((centerX - center.x) ** 2 + (centerY - center.y) ** 2);
    if (dist < bestDist) { bestDist = dist; bestTer = terId; }
  }

  if (bestDist < 80 && problemTerritories.has(bestTer)) {
    const hasT = pathInfo.transform ? ' +TRANSFORM' : '';
    console.log(`  ${pathInfo.id} -> ${bestTer.toUpperCase()} dist=${Math.round(bestDist)} center=(${Math.round(centerX)},${Math.round(centerY)}) area=${Math.round(bbox.width*bbox.height)}${hasT}`);
    console.log(`    d="${pathInfo.d.substring(0, 80)}..."`);
    console.log('');
  }
}

console.log('\n=== SEA LAYER: PATH -> NEAREST TERRITORY ===\n');

for (const pathInfo of seaPaths) {
  if (pathInfo.isDashed) continue;

  const bbox = getPathBoundingBox(pathInfo.d);
  if (!bbox) continue;
  if (bbox.width < 5 && bbox.height < 5) continue;

  let centerX, centerY;
  if (pathInfo.transform && pathInfo.transform.includes('matrix')) {
    const t = applyTransform(bbox.centerX, bbox.centerY);
    centerX = t.x; centerY = t.y;
  } else {
    centerX = bbox.centerX; centerY = bbox.centerY;
  }

  let bestTer = null, bestDist = Infinity;
  for (const [terId, center] of Object.entries(ALL_CENTERS)) {
    const dist = Math.sqrt((centerX - center.x) ** 2 + (centerY - center.y) ** 2);
    if (dist < bestDist) { bestDist = dist; bestTer = terId; }
  }

  if (bestDist < 80 && problemTerritories.has(bestTer)) {
    const hasT = pathInfo.transform ? ' +TRANSFORM' : '';
    console.log(`  ${pathInfo.id} -> ${bestTer.toUpperCase()} dist=${Math.round(bestDist)} center=(${Math.round(centerX)},${Math.round(centerY)}) area=${Math.round(bbox.width*bbox.height)}${hasT}`);
    console.log(`    d="${pathInfo.d.substring(0, 80)}..."`);
    console.log('');
  }
}
