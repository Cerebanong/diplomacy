/**
 * Compare polygon304 vertices against all known territory vertices to identify it.
 */

const TRANSFORM = {
  a: 1.8885246, e: 0.9442593,
  d: 1.8885246, f: 48.157374,
};

function to1152(x, y) {
  return [TRANSFORM.a * x + TRANSFORM.e, TRANSFORM.d * y + TRANSFORM.f];
}

// polygon304 vertices in 1152-space
const p304 = [
  [537.3, 641.2], [544.8, 624.2], [497.6, 633.6], [459.9, 656.3],
  [448.5, 656.3], [414.5, 697.8], [399.4, 701.6], [403.2, 712.9],
  [395.6, 733.7], [420.2, 737.5], [425.9, 731.8], [439.1, 733.7],
  [442.9, 739.4], [459.9, 746.9], [465.5, 745.0], [473.1, 748.8],
  [505.2, 743.1], [512.7, 746.9], [509.0, 731.8], [520.3, 731.8],
  [531.6, 720.5], [522.2, 701.6], [507.1, 695.9], [499.5, 669.5],
  [503.3, 661.9], [526.0, 663.8], [544.8, 654.4],
];

// Now let me check which territories share vertices
// First get all territory vertices from the Austria region

// BUD (311,375 in 610-scale, with transform):
const bud_610 = [
  [311,375], [322,370], [335,354], [337,350], [350,347], [360,351],
  [368,353], [377,360], [378,363], [384,365], [394,376], [395,382],
  [401,385], [406,396], [401,402], [387,402], [367,406], [365,412],
  [360,413], [342,410], [338,412], [335,410], [332,410], [323,408],
  [321,398], [311,394], [308,383]
];
const bud_1152 = bud_610.map(([x,y]) => to1152(x,y));

// TYR (241,378 in 610-scale):
const tyr_610 = [
  [241,378], [234,374], [234,366], [243,370], [246,369], [250,371],
  [267,368], [271,370], [269,362], [275,362], [281,356], [292,357],
  [295,362], [294,380], [289,385], [276,386], [268,385], [259,388],
  [255,394], [250,397], [246,392], [243,388], [245,384]
];
const tyr_1152 = tyr_610.map(([x,y]) => to1152(x,y));

// Let me compare polygon304 vertex 8 (395.6, 733.7) with known territories
// In 610-scale, 395.6 = (395.6 - 0.944) / 1.889 = 208.9
// 733.7 = (733.7 - 48.157) / 1.889 = 362.8
// So polygon304 vertex 8 in 610-scale is approximately (209, 363)

// Convert polygon304 to 610-scale
console.log('polygon304 vertices converted to 610-scale:');
const p304_610 = p304.map(([x,y]) => {
  return [
    Math.round((x - TRANSFORM.e) / TRANSFORM.a * 10) / 10,
    Math.round((y - TRANSFORM.f) / TRANSFORM.d * 10) / 10,
  ];
});

for (let i = 0; i < p304_610.length; i++) {
  console.log(`  ${i}: (${p304_610[i][0]}, ${p304_610[i][1]})`);
}

// Now check if the 610-scale coords match known Austrian territory points
console.log('\n=== Matching polygon304 (610-scale) against known territories ===');

// polygon304 vertex 6 in 610-scale: ~(211, 346)
// MUN start in 610-scale: d starts "m 399.42295,701.58689" which is 1152-scale
// MUN in 610-scale: (399.42-0.944)/1.889 = 210.9, (701.59-48.157)/1.889 = 345.9
// So MUN start is (210.9, 345.9) in 610-scale

// polygon304 vertex 8 in 610-scale: (209, 363)
// BUR territory has vertices including the BUR-MUN-TYR border area

// Let me check if polygon304 traces BUR + MUN + TYR combined border
// BUR (169,412) in 610-scale -> that's further north/west

// Actually, let me look at the Austria nation border (polygon100-2 in Nations layer)
// Austria = VIE + TRI + BUD
// The polygon100-2 border has stroke:#f41a0e (red)

// Germany border from Nations layer = polygon86-7 with stroke:#f7e90c (yellow)
// The inkscape:original for polygon86-7 contains the vertices

// polygon86-7 original vertices (from Nations layer):
const germany_vertices_1152 = [
  [544.83984, 654.37305], [525.95508, 663.81641], [503.29297, 661.92773],
  [499.51562, 669.48242], [507.06836, 695.92188], [522.17773, 701.58789],
  [531.61914, 720.47266], [520.28906, 731.80273], [508.95703, 731.80273],
  [512.73438, 746.91211], [505.17969, 743.13477], [473.07617, 748.80078],
  [465.52148, 745.02344], [459.85547, 746.91211], [442.85938, 739.35742],
  [442.85938, 754.46484], [456.07812, 762.01953], [463.63281, 773.35156],
  [459.85547, 780.9043], [465.52148, 788.45898], [473.07617, 797.90234],
  [482.51758, 792.23633], [490.07227, 780.9043], [507.06836, 775.24023],
  [522.17773, 777.12891], [527.84375, 782.79297],
  // ... continues with more vertices
];

// Check if polygon304 vertex 0 matches germany_vertices_1152[0]
console.log('\npolygon304[0]:', p304[0], '=> Germany[0]:', germany_vertices_1152[0]);
console.log('Match:', Math.abs(p304[0][0] - germany_vertices_1152[0][0]) < 1 && Math.abs(p304[0][1] - germany_vertices_1152[0][1]) < 1);

// Check vertex-by-vertex
console.log('\n=== Vertex-by-vertex comparison of polygon304 vs Germany nation outline ===');
const minLen = Math.min(p304.length, germany_vertices_1152.length);
let matches = 0;
for (let i = 0; i < minLen; i++) {
  const dist = Math.sqrt(
    (p304[i][0] - germany_vertices_1152[i][0]) ** 2 +
    (p304[i][1] - germany_vertices_1152[i][1]) ** 2
  );
  const isMatch = dist < 2;
  if (isMatch) matches++;
  console.log(`  vertex ${i}: p304(${p304[i][0].toFixed(1)}, ${p304[i][1].toFixed(1)}) vs germany(${germany_vertices_1152[i][0].toFixed(1)}, ${germany_vertices_1152[i][1].toFixed(1)}) dist=${dist.toFixed(1)} ${isMatch ? 'MATCH' : ''}`);
}
console.log(`\nMatches: ${matches} out of ${minLen}`);

if (matches > minLen / 2) {
  console.log('polygon304 IS the Germany nation border outline (inner path)!');
  console.log('It traces the SOUTHERN border of Germany:');
  console.log('  SIL -> KIE border -> MUN -> TYR border -> BOH border -> back to SIL');
} else {
  console.log('polygon304 does NOT match Germany nation border closely');
}

// More importantly, let me check: does the Germany outline from Nations layer
// contain the EXACT same initial vertices as polygon304?
// The inkscape:original starts with "M 544.83984 654.37305"
// polygon304 starts with "m 537.28525,641.1541"
// These are DIFFERENT starting points!
//
// But the path direction and vertices should still match if it's the same outline,
// just starting at a different vertex...

// Let me check ALL germany vertices against ALL polygon304 vertices
console.log('\n=== Checking ALL polygon304 vertices against Germany outline (any order) ===');
for (let i = 0; i < p304.length; i++) {
  let bestDist = Infinity;
  let bestIdx = -1;
  for (let j = 0; j < germany_vertices_1152.length; j++) {
    const dist = Math.sqrt(
      (p304[i][0] - germany_vertices_1152[j][0]) ** 2 +
      (p304[i][1] - germany_vertices_1152[j][1]) ** 2
    );
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = j;
    }
  }
  const isMatch = bestDist < 3;
  if (isMatch) {
    console.log(`  p304[${i}] (${p304[i][0].toFixed(1)}, ${p304[i][1].toFixed(1)}) ~ germany[${bestIdx}] (${germany_vertices_1152[bestIdx][0].toFixed(1)}, ${germany_vertices_1152[bestIdx][1].toFixed(1)}) dist=${bestDist.toFixed(1)}`);
  }
}
