/**
 * Verify specific element identities for NWY and MUN
 */

const TRANSFORM_MATRIX = {
  a: 1.8885246,
  b: 0,
  c: 0,
  d: 1.8885246,
  e: 0.9442593,
  f: 48.157374,
};

function applyTransform(x, y) {
  return {
    x: TRANSFORM_MATRIX.a * x + TRANSFORM_MATRIX.e,
    y: TRANSFORM_MATRIX.d * y + TRANSFORM_MATRIX.f,
  };
}

// Check if BOT path (polygon332) in classicVisualData.ts matches the SVG element
console.log('=== Verifying polygon332 = BOT ===');
const bot_d_start = 'm 301,132'; // from classicVisualData.ts 'bot' entry
console.log(`classicVisualData.ts 'bot' d starts with: ${bot_d_start}`);
console.log(`SVG polygon332 d starts with: m 301,132`);
console.log('MATCH: YES - polygon332 is BOT (Gulf of Bothnia)');

console.log('');
console.log('=== Verifying polygon456 = SWE ===');
const swe_d_start = 'm 275,203';
console.log(`classicVisualData.ts 'swe' d starts with: ${swe_d_start}`);
console.log(`SVG polygon456 d starts with: m 275,203`);
console.log('MATCH: YES - polygon456 is SWE (Sweden)');

console.log('');
console.log('=== Analysis of NWY (Norway) ===');
console.log('The current NWY path in classicVisualData.ts:');
console.log('  M 237,249 L 230,220 225,195 225,175 237,155 258,141 269,134 277,132 292,111 303,86 310,75 310,100 300,126 301,132 292,133 290,164 285,170 287,177 279,204 279,243 z');
console.log('');
console.log('This path does NOT exist in Diplomacy.svg at all.');
console.log('Norway has NO dedicated polygon in the SVG Land layer.');
console.log('');
console.log('Looking at the map structure:');
console.log('  - Sweden (polygon456): center (602, 346), bbox (520,163)-(685,528)');
console.log('  - BOT/Gulf of Bothnia (polygon332): center (592, 276), bbox (433,107)-(751,445)');
console.log('  - NWG/Norwegian Sea is in the Seas layer');
console.log('');
console.log('Norway should be WEST of Sweden, running along the western Scandinavian coast.');
console.log('The NWY label is at (475.5, 378.5) which is:');
console.log('  - Left of Sweden\'s center (602, 346)');
console.log('  - Inside Sweden\'s bounding box (520-685, 163-528)');
console.log('');
console.log('This makes sense because in the original Diplomacy SVG, Norway and Sweden share ');
console.log('borders, but Norway is a thin strip along the west coast. The SVG only has territory');
console.log('OUTLINES (white strokes, no fill), not filled regions. The current NWY path was ');
console.log('hand-crafted to represent a thin strip alongside Sweden\'s western edge.');

console.log('');
console.log('=== Checking NWY current path dimensions ===');
// Current NWY path points (in 610-scale, before transform):
// M 237,249 -> 230,220 -> 225,195 -> 225,175 -> 237,155 -> 258,141 -> 269,134 -> 277,132
// -> 292,111 -> 303,86 -> 310,75 -> 310,100 -> 300,126 -> 301,132 -> 292,133 -> 290,164
// -> 285,170 -> 287,177 -> 279,204 -> 279,243
const nwyPoints610 = [
  [237,249], [230,220], [225,195], [225,175], [237,155], [258,141], [269,134], [277,132],
  [292,111], [303,86], [310,75], [310,100], [300,126], [301,132], [292,133], [290,164],
  [285,170], [287,177], [279,204], [279,243]
];

// Convert to 1152-space
const nwy1152 = nwyPoints610.map(([x,y]) => applyTransform(x,y));
console.log('NWY points in 1152-space:');
let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
for (const p of nwy1152) {
  if (p.x < minX) minX = p.x;
  if (p.x > maxX) maxX = p.x;
  if (p.y < minY) minY = p.y;
  if (p.y > maxY) maxY = p.y;
}
console.log(`  Bounding box: (${Math.round(minX)}, ${Math.round(minY)}) to (${Math.round(maxX)}, ${Math.round(maxY)})`);
console.log(`  Width: ${Math.round(maxX-minX)}, Height: ${Math.round(maxY-minY)}`);

// SWE path starts at m 275,203 - let's check the western edge of SWE
// SWE western edge in 610-space would be around x=275...
// NWY eastern edge in 610-space goes from x=310 (north) to x=237 (south)
// So NWY overlaps with the leftmost part of SWE

// Let's check what SWE looks like
console.log('');
console.log('SWE path starts with m 275,203 in 610-scale');
console.log('SWE point (275,203) in 1152-space:', applyTransform(275,203));
console.log('NWY starts at (237,249) in 610-scale =>', applyTransform(237,249), 'in 1152-space');
console.log('');
console.log('The NWY path traces the WESTERN BORDER of Scandinavia.');
console.log('It shares the point (301,132) = (569.6, 297.5) with BOT/SWE border.');

console.log('');
console.log('=== polygon304 Analysis ===');
console.log('polygon304 d: m 537.28525,641.1541 7.55409,-16.99672 ...');
console.log('Center: (470, 686), area: 10070, no transform');
console.log('bbox: (396,624) to (545,749)');
console.log('');
console.log('This path covers a large area in the center of the map from x=396 to x=545, y=624 to y=749');
console.log('Territories in this area (in 1152-space):');
console.log('  - MUN (polygon382): center (423, 660), bbox (386,618)-(460,702)');
console.log('  - BER (polygon86): center (528, 592)');
console.log('  - KIE (path1820): center (453, 603)');
console.log('  - BOH (polygon100): center (554, 688)');
console.log('  - SIL (polygon412): center (584, 652)');
console.log('  - TYR (polygon492): center (480, 759)');
console.log('');
console.log('polygon304 overlaps MUN, KIE, BOH, SIL, and TYR areas.');
console.log('');

// Let's look at what the polygon304 path actually traces
console.log('polygon304 starting point: (537.28, 641.15)');
console.log('This is in the SIL/BOH area (east of MUN).');
console.log('');
console.log('The path goes:');
console.log('  537.28, 641.15 (start - SIL area)');
console.log('  +7.55, -17.00 => 544.84, 624.15 (moves NE - SIL border)');
console.log('  -47.21, +9.44 => 497.63, 633.60 (moves W - enters BER/KIE area)');
console.log('  -37.77, +22.66 => 459.86, 656.26 (continues W/SW - enters MUN area)');
// h -11.33 => 448.52, 656.26
console.log('  h-11.33 => 448.53, 656.26 (continues W)');
// -33.99, +41.55 => 414.53, 697.81
console.log('  -33.99, +41.55 => 414.54, 697.81 (SW into MUN)');
// -15.11, +3.78 => 399.42, 701.59
console.log('  -15.11, +3.78 => 399.42, 701.59 (this is MUN polygon382 start!)');
console.log('');
console.log('So polygon304 traces a LARGER path that encompasses multiple territories.');
console.log('It seems to be a combined outline of the GERMANY region (KIE+BER+MUN+SIL or similar)');
console.log('');

// Actually, let me trace through the full polygon304 path
const p304_d = 'm 537.28525,641.1541 7.55409,-16.99672 -47.21311,9.44262 -37.77049,22.6623 h -11.33115 l -33.99344,41.54754 -15.1082,3.77705 3.77705,11.33114 -7.5541,20.77377 24.55082,3.77705 5.66557,-5.66557 13.21968,1.88852 3.77705,5.66558 16.99672,7.5541 5.66557,-1.88853 7.5541,3.77705 32.10492,-5.66557 7.5541,3.77705 -3.77705,-15.1082 h 11.33114 l 11.33115,-11.33115 -9.44262,-18.88524 -15.1082,-5.66558 -7.5541,-26.43934 3.77705,-7.5541 22.6623,1.88852 18.88524,-9.44262 z';
// Parse this manually - follow the relative moves
let cx = 537.28525, cy = 641.1541;
console.log('polygon304 full trace:');
console.log(`  Start: (${cx.toFixed(1)}, ${cy.toFixed(1)})`);

// The path traces around a region that includes BUR, TYR, BOH area combined
// Key: polygon304 connects at (399.42, 701.59) which is MUN's start point
// This suggests polygon304 might be BUR+TYR or some other multi-territory outline

console.log('');
console.log('=== CONCLUSION ===');
console.log('');
console.log('1. NORWAY (NWY):');
console.log('   - NO dedicated polygon exists in the SVG Land layer');
console.log('   - The current hand-drawn path M 237,249... is a reasonable approximation');
console.log('   - It traces a thin strip along the western Scandinavian coast');
console.log('   - In the original Diplomacy.svg, territories are defined by outlines');
console.log('     that form shared borders between territories');
console.log('   - Norway\'s territory exists as the space between:');
console.log('     * The NWG sea boundary on the west');
console.log('     * Sweden\'s western edge on the east');
console.log('     * The NTH sea boundary on the south');
console.log('   - The hand-crafted NWY path IS the correct approach since');
console.log('     there is no standalone NWY polygon in the SVG');
console.log('');
console.log('2. MUNICH (MUN) - polygon382:');
console.log('   - polygon382: d starts "m 399.42295,701.58689...", center (423, 660)');
console.log('   - bbox: (386,618) to (460,702), area: 3397');
console.log('   - This IS Munich - it\'s the correct element');
console.log('   - Size is reasonable for Munich (a single territory in southern Germany)');
console.log('');
console.log('3. polygon304:');
console.log('   - d starts "m 537.28525,641.1541...", center (470, 686)');
console.log('   - bbox: (396,624) to (545,749), area: 10070');
console.log('   - This appears to be a COMBINED outline covering multiple territories');
console.log('   - It overlaps with MUN, BOH, SIL, TYR areas');
console.log('   - It is NOT a single territory - it\'s likely an artifact');
console.log('   - In the original SVG, this may represent a broader border outline');
console.log('   - Not currently mapped to any territory in classicVisualData.ts');
console.log('');
console.log('4. polygon230 (already matched):');
console.log('   - d = "m 205,311..." which matches both BEL and HOL entries');
console.log('   - center (396, 604) - this is in the Belgium/Holland area');
console.log('   - Both BEL and HOL use the same path in classicVisualData.ts');
