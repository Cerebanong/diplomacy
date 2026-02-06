// Generate the BLA and AEG SVG path strings
// Based on the analysis of path3810 vertices

// path3810 absolute vertices:
const v = [
  /* 0  */ [994.30859, 711.02930],
  /* 1  */ [950.87305, 735.58008],
  /* 2  */ [916.87891, 762.01953],
  /* 3  */ [933.87500, 779.01562],
  /* 4  */ [956.53711, 773.35156],
  /* 5  */ [958.42578, 782.79297],
  /* 6  */ [939.54102, 788.45898],
  /* 7  */ [933.87500, 796.01367],
  /* 8  */ [922.54492, 797.90234],
  /* 9  */ [918.76758, 811.12109],
  /* 10 */ [901.76953, 805.45508],
  /* 11 */ [901.76953, 796.01367],
  /* 12 */ [884.77344, 788.45898],
  /* 13 */ [892.32812, 775.24023],
  /* 14 */ [903.65820, 771.46289],
  /* 15 */ [899.88281, 767.68555],
  /* 16 */ [879.10742, 771.46289],
  /* 17 */ [867.77734, 763.90820],
  /* 18 */ [871.55469, 760.13086],
  /* 19 */ [867.77734, 756.35352],
  /* 20 */ [843.22656, 762.01953],
  /* 21 */ [828.11719, 797.90234],
  /* 22 */ [830.00586, 811.12109],
  /* 23 */ [816.78711, 820.56445],
  /* 24 */ [813.00977, 847.00391],  // path3387 end point
  /* 25 */ [811.12109, 852.66797],
  /* 26 */ [803.56641, 854.55664],
  /* 27 */ [797.90234, 880.99609],
  /* 28 */ [805.45508, 897.99414],  // path3387 start point
  /* 29 */ [813.00977, 907.43555],
  /* 30 */ [831.89453, 913.10156],
  /* 31 */ [822.45312, 922.54492],
  /* 32 */ [796.01367, 930.09766],
  /* 33 */ [782.61914, 943.48242],
  /* 34 */ [775.24023, 941.42969],
  /* 35 */ [771.46289, 935.76367],  // path3421 end point
  /* 36 */ [756.35352, 931.98633],
  /* 37 */ [741.24609, 939.54102],  // path3421 start point
  /* 38 */ [718.58398, 939.54102],
  /* 39 */ [729.91406, 950.87305],
  /* 40 */ [720.47266, 948.98438],
  /* 41 */ [722.36133, 960.31445],
  /* 42 */ [716.69531, 962.20312],
  /* 43 */ [701.58594, 948.98438],
  /* 44 */ [695.92188, 960.31445],
  /* 45 */ [714.80664, 981.08789],
  /* 46 */ [701.58594, 975.42383],
  /* 47 */ [699.69922, 981.08789],
  /* 48 */ [728.02539, 1009.41600],
  /* 49 */ [729.91406, 1022.63670],
  /* 50 */ [712.91797, 1016.97070],
  /* 51 */ [714.80664, 1032.07810],
  /* 52 */ [701.58594, 1030.18940],
  /* 53 */ [711.02930, 1062.29490],
  /* 54 */ [724.25000, 1075.51560],
  /* 55 */ [731.80273, 1079.29300],
  /* 56 */ [779.01562, 1081.18160],
  /* 57 */ [786.57031, 1084.95900],
  /* 58 */ [822.45312, 1049.07810],
  /* 59 */ [822.45312, 1035.85740],
  /* 60 */ [807.34375, 1037.74610],
  /* 61 */ [799.78906, 1011.30470],
  /* 62 */ [788.45703, 1005.63870],
  /* 63 */ [788.45703, 988.64258],
  /* 64 */ [794.12305, 982.97656],
  /* 65 */ [788.45703, 971.64648],
  /* 66 */ [788.45703, 965.98047],
  /* 67 */ [773.34961, 967.86914],
  /* 68 */ [775.23828, 958.42578],
  /* 69 */ [783.60157, 946.25781],
  /* 70 */ [803.56446, 945.20703],
  /* 71 */ [847.00195, 924.43359],
  /* 72 */ [830.00391, 922.54492],
  /* 73 */ [835.66992, 916.87891],
  /* 74 */ [877.21679, 911.21289],
  /* 75 */ [888.54882, 892.32812],
  /* 76 */ [909.32226, 875.33203],
  /* 77 */ [948.98242, 865.88867],
  /* 78 */ [965.97851, 879.10742],
  /* 79 */ [971.64452, 875.33203],
  /* 80 */ [982.97460, 880.99609],
  /* 81 */ [1041.51954, 873.44336],
  /* 82 */ [1049.07422, 875.33203],
  /* 83 */ [1077.40032, 854.55664],
  /* 84 */ [1083.06633, 835.67188],
  /* 85 */ [1071.73625, 818.67578],
  /* 86 */ [1047.18547, 814.89844],
  /* 87 */ [998.08391, 792.23633],
  /* 88 */ [977.30852, 790.34766],
  /* 89 */ [964.08977, 777.12695],
  /* 90 */ [965.97844, 771.46289],
  /* 91 */ [973.53313, 773.35156],
  /* 92 */ [982.97453, 748.80078],
  /* 93 */ [977.30852, 748.80078],
  /* 94 */ [971.64445, 737.46875],
  /* 95 */ [996.19524, 716.69531],
];

// Helper: format a number for SVG (remove trailing zeros)
function fmt(n) {
  return parseFloat(n.toFixed(5)).toString();
}

// Helper: generate SVG path from vertex list
function makePathAbsolute(vertices, close = true) {
  let d = `M ${fmt(vertices[0][0])},${fmt(vertices[0][1])}`;
  for (let i = 1; i < vertices.length; i++) {
    d += ` L ${fmt(vertices[i][0])},${fmt(vertices[i][1])}`;
  }
  if (close) d += ' Z';
  return d;
}

// Helper: generate SVG path from vertex list using relative coordinates
function makePathRelative(vertices, close = true) {
  let d = `m ${fmt(vertices[0][0])},${fmt(vertices[0][1])}`;
  for (let i = 1; i < vertices.length; i++) {
    const dx = vertices[i][0] - vertices[i-1][0];
    const dy = vertices[i][1] - vertices[i-1][1];
    d += ` ${fmt(dx)},${fmt(dy)}`;
  }
  if (close) d += ' z';
  return d;
}

// ==========================================================
// BLA (Black Sea) path
// Vertices: 0 through 28, then bridge to 73, then 73 through 95, close
// ==========================================================
// However, we need to think about what "bridge" means.
// v28 = (805.46, 897.99) is the Bosphorus entrance from BLA
// v73 = (835.67, 916.88) is near CON/ANK boundary
//
// Looking at CON path in classicVisualData, CON currently uses the SAME path as BLA
// which has two sub-paths. The CON territory is the land between BLA and AEG.
// For the map rendering, BLA as a sea territory should cover the correct water area.
//
// The cleanest approach: from v28, go directly to v73 with a straight line.
// This line crosses through Constantinople's land area, which will be drawn
// on top of BLA (since land territories render after sea territories).
// The actual visible BLA water area will be correctly bounded by the coastlines.
//
// But actually, let me look at what ANK's path looks like.
// ANK starts at (982.98, 881.00) = v80 of path3810
// Its path goes through territory and includes the coastline.
//
// For a cleaner BLA, let me trace:
// v0 -> v28: BLA NW coast down to Bosphorus
// v28 -> v73: straight bridge across CON (hidden by CON land)
// v73 -> v95: BLA south coast (ANK coast) back to start
// Close

const bla_vertices = [];
for (let i = 0; i <= 28; i++) bla_vertices.push(v[i]);
// Bridge v28 to v73
bla_vertices.push(v[73]);
for (let i = 74; i <= 95; i++) bla_vertices.push(v[i]);

console.log("=== BLA PATH (absolute) ===");
const bla_abs = makePathAbsolute(bla_vertices);
console.log(bla_abs);
console.log("\n=== BLA PATH (relative) ===");
const bla_rel = makePathRelative(bla_vertices);
console.log(bla_rel);

// ==========================================================
// AEG (Aegean Sea) path
// Vertices: 38 through 67, then close
// The gap from v67 to v38 needs bridging.
// v67 = (773.35, 967.87)
// v38 = (718.58, 939.54)
// These are on opposite sides of CON's south border.
// A straight line from v67 to v38 would cross through CON land, which will
// be rendered on top. This is fine.
//
// But wait - we should also consider including v37 and v68.
// v37 = (741.25, 939.54) = Dardanelles W entrance (CON coast)
// v68 = (775.24, 958.43) = approaching CON from SMY coast
//
// The AEG sea area is bounded by:
// - West: Greece coast (some of v38-v57)
// - East: Turkey/SMY coast (some of v58-v67)
// - North: CON land (between v37 and v68, specifically the Dardanelles strait)
//
// For proper AEG, we want:
// v37 (Dardanelles W) -> v38 through v67 (AEG coast) -> v68 (Dardanelles E)
// Then close from v68 back to v37 via a straight line through CON
//
// Actually, since v37 and v38 are consecutive, and v67 and v68 are consecutive,
// let's include v37 and v68 for a complete shape:
// v37, v38, ..., v67, v68, close to v37
// ==========================================================

const aeg_vertices = [];
for (let i = 37; i <= 68; i++) aeg_vertices.push(v[i]);

console.log("\n\n=== AEG PATH (absolute) ===");
const aeg_abs = makePathAbsolute(aeg_vertices);
console.log(aeg_abs);
console.log("\n=== AEG PATH (relative) ===");
const aeg_rel = makePathRelative(aeg_vertices);
console.log(aeg_rel);

// ==========================================================
// Also output the CON path for reference
// CON: v28 through v37, then bridge/strait back to v28
// Plus the east side: v68 through v73
// Actually CON is bounded by:
//   Bosphorus (path3387): v28 to v24 (but v24-v28 are BLA coast vertices)
//   CON coast along path3810: v29 to v37
//   Dardanelles (path3421): v37 to v35 (but v35-v37 are CON coast vertices)
//   Also CON coast: v68 to v73
//   And v73 connects back to v29 area somehow
//
// The existing CON in classicVisualData has two subpaths which are exactly the
// current BLA shared path. Let me define CON more properly:
//
// CON is the land territory between the two straits. Its polygon is:
//   v28 (Bosphorus W) -> v29 -> ... -> v37 (Dardanelles W) -> straight to v68
//   -> v68 -> ... -> v73 -> straight back to v28
//
// This forms a loop around CON land
// ==========================================================

const con_vertices = [];
for (let i = 28; i <= 37; i++) con_vertices.push(v[i]);
// Bridge v37 to v68
con_vertices.push(v[68]);
for (let i = 69; i <= 73; i++) con_vertices.push(v[i]);
// Close back to v28

console.log("\n\n=== CON PATH (absolute) - for reference ===");
const con_abs = makePathAbsolute(con_vertices);
console.log(con_abs);

// Now let's also compute the d attribute using the ORIGINAL relative coordinates from path3810
// This is more faithful to the original SVG

console.log("\n\n=== ORIGINAL PATH3810 RELATIVE SEGMENTS ===");
console.log("Reproducing the path commands for each vertex:");

// The original d attribute commands in order:
const origCommands = [
  "m 994.30859,711.0293",       // v0 M
  "-43.43554,24.55078",          // v1
  "-33.99414,26.43945",          // v2
  "16.99609,16.99609",           // v3
  "22.66211,-5.66406",           // v4
  "1.88867,9.44141",             // v5
  "-18.88476,5.66601",           // v6
  "-5.66602,7.55469",            // v7
  "-11.33008,1.88867",           // v8
  "-3.77734,13.21875",           // v9
  "-16.99805,-5.66601",          // v10
  "v -9.44141",                  // v11
  "l -16.99609,-7.55469",        // v12
  "7.55468,-13.21875",           // v13
  "11.33008,-3.77734",           // v14
  "-3.77539,-3.77734",           // v15
  "-20.77539,3.77734",           // v16
  "-11.33008,-7.55469",          // v17
  "3.77735,-3.77734",            // v18
  "-3.77735,-3.77734",           // v19
  "-24.55078,5.66601",           // v20
  "-15.10937,35.88281",          // v21
  "1.88867,13.21875",            // v22
  "-13.21875,9.44336",           // v23
  "-3.77734,26.43946",           // v24
  "-1.88868,5.66406",            // v25
  "-7.55468,1.88867",            // v26
  "-5.66407,26.43945",           // v27
  "7.55274,16.99805",            // v28
  "7.55469,9.44141",             // v29
  "18.88476,5.66601",            // v30
  "-9.44141,9.44336",            // v31
  "-26.43945,7.55274",           // v32
  "-13.39453,13.38476",          // v33
  "-7.37891,-2.05273",           // v34
  "-3.77734,-5.66602",           // v35
  "-15.10937,-3.77734",          // v36
  "-15.10743,7.55469",           // v37
  "h -22.66211",                 // v38
  "l 11.33008,11.33203",         // v39
  "-9.4414,-1.88867",            // v40
  "1.88867,11.33007",            // v41
  "-5.66602,1.88867",            // v42
  "-15.10937,-13.21874",         // v43
  "-5.66406,11.33007",           // v44
  "18.88476,20.77344",           // v45
  "-13.2207,-5.66406",           // v46
  "-1.88672,5.66406",            // v47
  "28.32617,28.32811",           // v48
  "1.88867,13.2207",             // v49
  "-16.99609,-5.666",            // v50
  "1.88867,15.1074",             // v51
  "-13.2207,-1.8886",            // v52
  "9.44336,32.1054",             // v53
  "13.2207,13.2207",             // v54
  "7.55273,3.7754",              // v55
  "47.21289,1.8887",             // v56
  "7.55469,3.7773",              // v57
  "35.88281,-35.8808",           // v58
  "v -13.2207",                  // v59
  "l -15.10937,1.8886",          // v60
  "-7.55273,-26.4394",           // v61
  "-11.33204,-5.666",            // v62
  "v -16.99612",                 // v63
  "l 5.66602,-5.66602",          // v64
  "-5.66602,-11.33008",          // v65
  "v -5.66601",                  // v66
  "l -15.10742,1.88867",         // v67
  "1.88867,-9.44336",            // v68
  "8.36329,-12.16797",           // v69
  "19.96289,-1.05078",           // v70
  "43.4375,-20.77344",           // v71
  "-16.99805,-1.88867",          // v72
  "5.66602,-5.66601",            // v73
  "41.54687,-5.66602",           // v74
  "11.33203,-18.88477",          // v75
  "20.77344,-16.99609",          // v76
  "39.66016,-9.44336",           // v77
  "16.99609,13.21875",           // v78
  "5.66601,-3.77539",            // v79
  "11.33008,5.66406",            // v80
  "58.54494,-7.55273",           // v81
  "7.5547,1.88867",              // v82
  "28.3261,-20.77539",           // v83
  "5.6661,-18.88476",            // v84
  "-11.3301,-16.9961",           // v85
  "-24.5508,-3.77734",           // v86
  "-49.10156,-22.66211",         // v87
  "-20.77539,-1.88867",          // v88
  "-13.21875,-13.22071",         // v89
  "1.88867,-5.66406",            // v90
  "7.55469,1.88867",             // v91
  "9.4414,-24.55078",            // v92
  "h -5.66601",                  // v93
  "l -5.66407,-11.33203",        // v94
  "24.55079,-20.77344",          // v95
  "z"                            // close
];

// Now construct the BLA and AEG paths using relative coordinates
// BLA: v0-v28, then straight jump to v73, then v73-v95, close

console.log("\n=== BLA RELATIVE PATH (constructed from original segments) ===");
let bla_d = origCommands[0]; // m 994.30859,711.0293 (v0)
for (let i = 1; i <= 28; i++) {
  bla_d += ' ' + origCommands[i];
}
// Now we need to add a relative segment from v28 to v73
// v28 = (805.45508, 897.99414)
// v73 = (835.66992, 916.87891)
const dx_28_73 = v[73][0] - v[28][0];
const dy_28_73 = v[73][1] - v[28][1];
bla_d += ` ${fmt(dx_28_73)},${fmt(dy_28_73)}`; // bridge
for (let i = 74; i <= 95; i++) {
  bla_d += ' ' + origCommands[i];
}
bla_d += ' z';
console.log(bla_d);

console.log("\n=== AEG RELATIVE PATH (constructed from original segments) ===");
// AEG: v37-v68, close
// Start with an absolute move to v37
let aeg_d = `m ${fmt(v[37][0])},${fmt(v[37][1])}`; // absolute move to v37
for (let i = 38; i <= 68; i++) {
  aeg_d += ' ' + origCommands[i];
}
// Close back from v68 to v37
aeg_d += ' z';
console.log(aeg_d);

// Let's also verify the bridge distances
console.log("\n=== BRIDGE VERIFICATIONS ===");
console.log(`v28 to v73: dx=${fmt(dx_28_73)}, dy=${fmt(dy_28_73)}`);
console.log(`  distance: ${Math.sqrt(dx_28_73*dx_28_73 + dy_28_73*dy_28_73).toFixed(2)}`);

const dx_68_37 = v[37][0] - v[68][0];
const dy_68_37 = v[37][1] - v[68][1];
console.log(`v68 to v37: dx=${fmt(dx_68_37)}, dy=${fmt(dy_68_37)}`);
console.log(`  distance: ${Math.sqrt(dx_68_37*dx_68_37 + dy_68_37*dy_68_37).toFixed(2)}`);

// Final formatted paths for use in classicVisualData.ts
console.log("\n\n========================================");
console.log("FINAL BLA SVG PATH FOR classicVisualData.ts:");
console.log("========================================");
console.log(bla_d);

console.log("\n========================================");
console.log("FINAL AEG SVG PATH FOR classicVisualData.ts:");
console.log("========================================");
console.log(aeg_d);

// Now verify: does the existing AEG entry in classicVisualData match the GRE entry?
// The existing AEG svgPath is: 'm 352,508 15,-1 4,4 ...'
// This is the Greece COAST + AEG sea islands/coast in the ~610 space
// This is NOT the sea polygon from path3810
//
// For the game map, AEG needs to be the SEA territory polygon.
// The Greece (GRE) territory has a separate land polygon.
// Looking at the existing data:
// - aeg svgPath = gre svgPath (they share the same path - THIS IS THE BUG)
// - What we want: aeg should be the sea polygon, gre should be the land polygon
//
// So our new AEG path should use the 1152-space coordinates directly (no transform needed)
// since path3810 is already in 1152-space.

console.log("\n\n========================================");
console.log("USAGE IN classicVisualData.ts:");
console.log("========================================");
console.log("BLA entry should use the BLA path above (no transform, already in 1152-space)");
console.log("AEG entry should use the AEG path above (no transform, already in 1152-space)");
console.log("Both entries should NOT have a 'transform' property");
