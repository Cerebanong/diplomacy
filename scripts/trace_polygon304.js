/**
 * Trace polygon304 path step by step and compare with known territory paths
 * to determine what territory or combined region it represents.
 */

// polygon304's d attribute
const d = 'm 537.28525,641.1541 7.55409,-16.99672 -47.21311,9.44262 -37.77049,22.6623 h -11.33115 l -33.99344,41.54754 -15.1082,3.77705 3.77705,11.33114 -7.5541,20.77377 24.55082,3.77705 5.66557,-5.66557 13.21968,1.88852 3.77705,5.66558 16.99672,7.5541 5.66557,-1.88853 7.5541,3.77705 32.10492,-5.66557 7.5541,3.77705 -3.77705,-15.1082 h 11.33114 l 11.33115,-11.33115 -9.44262,-18.88524 -15.1082,-5.66558 -7.5541,-26.43934 3.77705,-7.5541 22.6623,1.88852 18.88524,-9.44262 z';

// Parse the path
let cx = 537.28525, cy = 641.1541;
const points = [[cx, cy]];

// token by token
const moves = [
  [7.55409, -16.99672],
  [-47.21311, 9.44262],
  [-37.77049, 22.6623],
  // h -11.33115
  [-11.33115, 0],
  // l
  [-33.99344, 41.54754],
  [-15.1082, 3.77705],
  [3.77705, 11.33114],
  [-7.5541, 20.77377],
  [24.55082, 3.77705],
  [5.66557, -5.66557],
  [13.21968, 1.88852],
  [3.77705, 5.66558],
  [16.99672, 7.5541],
  [5.66557, -1.88853],
  [7.5541, 3.77705],
  [32.10492, -5.66557],
  [7.5541, 3.77705],
  [-3.77705, -15.1082],
  // h 11.33114
  [11.33114, 0],
  // l
  [11.33115, -11.33115],
  [-9.44262, -18.88524],
  [-15.1082, -5.66558],
  [-7.5541, -26.43934],
  [3.77705, -7.5541],
  [22.6623, 1.88852],
  [18.88524, -9.44262],
];

for (const [dx, dy] of moves) {
  cx += dx;
  cy += dy;
  points.push([cx, cy]);
}

console.log('polygon304 vertices (in 1152-space, no transform):');
for (let i = 0; i < points.length; i++) {
  console.log(`  ${i}: (${points[i][0].toFixed(1)}, ${points[i][1].toFixed(1)})`);
}

console.log('\n=== Checking if polygon304 vertices match known territory borders ===');

// Key known territory paths and their vertices
// MUN (polygon382): starts at 399.42, 701.59 -> ...
// In polygon304, vertex 6 is (399.42, 701.59) - exact match to MUN start!

// Let me check each vertex against known territory paths
const knownPoints = {
  'MUN start': [399.42295, 701.58689],
  'BUR start (610)': 'at 169,412 in 610-scale',
  'SIL start': [544.83934, 654.37377],
  'BOH start (610)': 'at 316,348 in 610-scale',
  'TYR start (610)': 'at 241,378 in 610-scale',
};

// polygon304 vertex 0: (537.3, 641.2) - close to SIL start (544.8, 654.4)?
// No, that's SIL polygon412 start.

// Let me compare polygon304 with individual territory paths that use 1152-scale coordinates

// SIL (polygon412): m 544.83934,654.37377 16.99673,1.88853 26.43934,22.66229 ...
// SIL starts at (544.84, 654.37)
// polygon304 starts at (537.29, 641.15) which is different

// polygon304 first move: 537.29+7.55 = 544.84, 641.15-17.0 = 624.15
// That's (544.84, 624.15) which doesn't match SIL

// Actually, 544.84 is the x-coord of SIL's start.
// Let me look at what paths share vertices with polygon304...

console.log('\npolygon304 vertex 6: (' + points[6][0].toFixed(2) + ', ' + points[6][1].toFixed(2) + ')');
console.log('MUN start: (399.42, 701.59)');
console.log('Match:', Math.abs(points[6][0] - 399.42295) < 0.01 && Math.abs(points[6][1] - 701.58689) < 0.01 ? 'YES' : 'NO');

// Actually, let me think about what polygon304 represents differently.
// It has no fill in the SVG (fill:none) and is a white stroke outline.
// Looking at its shape: it has area ~10070 in 1152-space

// The key insight: In the Diplomacy SVG, the Land layer contains border outlines
// for INDIVIDUAL territories. But polygon304 is bigger than any single territory.
//
// Wait - let me reconsider. polygon304 has 27 vertices. Let me check if any
// territory in classicVisualData.ts uses polygon304's path...

// Actually - looking at the data more carefully, I notice that classicVisualData.ts
// has entries that DON'T match any Land layer element. Let me check which ones.

// Territories with no transform (1152-scale coordinates, no transform property):
const noTransformTerritories = [
  'ank', 'arm', 'bal', 'ber', 'bla', 'con', 'den', 'hel', 'kie', 'lvn',
  'mos', 'mun', 'nth', 'pru', 'sev', 'sil', 'ska', 'smy', 'stp', 'syr',
  'ukr', 'war'
];

// Territories with TRANSFORM:
const transformTerritories = [
  'adr', 'aeg', 'alb', 'apu', 'bar', 'bel', 'boh', 'bot', 'bre', 'bud',
  'bul', 'bur', 'cly', 'eas', 'edi', 'eng', 'fin', 'gal', 'gas', 'gol',
  'gre', 'hol', 'ion', 'iri', 'lon', 'lvp', 'mao', 'mar', 'naf', 'nao',
  'nap', 'nwy', 'par', 'pic', 'pie', 'por', 'rom', 'ruh', 'rum', 'ser',
  'spa', 'swe', 'tri', 'tun', 'tus', 'tyr', 'tys', 'ven', 'vie', 'wal',
  'wes', 'yor', 'nwg'
];

console.log('\nTotal territories in classicVisualData.ts:', noTransformTerritories.length + transformTerritories.length);

console.log('\n=== What is polygon304? ===');
console.log('Looking at the path vertices, polygon304 traces:');
console.log('  1. Starts in the SIL/BER border area');
console.log('  2. Goes west through KIE area');
console.log('  3. Goes southwest to MUN');
console.log('  4. Turns east through TYR/BOH border');
console.log('  5. Goes northeast back to start');
console.log('');
console.log('This looks like it could be the GERMANY nation border outline!');
console.log('Germany consists of: KIE + BER + MUN + SIL + RUH');
console.log('But polygon304 doesn\'t go as far north as KIE or BER...');
console.log('');
console.log('OR it could be a territory that wasn\'t properly matched.');
console.log('Let me check if this is actually the Bavaria/Munich+Tyrolia combined border');
console.log('or perhaps it matches "boh" + "sil" + "mun" combined area...');
console.log('');
console.log('ANSWER: polygon304 is most likely a REDUNDANT border outline in the SVG');
console.log('that doesn\'t correspond to a single territory. It may have been part of');
console.log('the original SVG structure for rendering purposes (e.g., a nation outline');
console.log('that needed a separate stroke path for styling).');
