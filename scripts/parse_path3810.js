// Parse path3810 and convert all relative coordinates to absolute
// Also parse boundary paths path3387, path3421, polyline122, polyline128

function parsePathToAbsolute(d) {
  const vertices = [];
  let x = 0, y = 0;

  // Tokenize the d attribute
  const tokens = d.match(/[a-zA-Z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g);

  let i = 0;
  let currentCmd = '';

  while (i < tokens.length) {
    const token = tokens[i];

    if (/[a-zA-Z]/.test(token)) {
      currentCmd = token;
      i++;

      if (currentCmd === 'z' || currentCmd === 'Z') {
        vertices.push({ cmd: 'Z', x: vertices[0].x, y: vertices[0].y });
        continue;
      }
    }

    switch (currentCmd) {
      case 'm': // relative moveto
        x += parseFloat(tokens[i]);
        y += parseFloat(tokens[i + 1]);
        vertices.push({ cmd: 'M', x, y });
        i += 2;
        currentCmd = 'l'; // subsequent coords are lineto
        break;
      case 'M': // absolute moveto
        x = parseFloat(tokens[i]);
        y = parseFloat(tokens[i + 1]);
        vertices.push({ cmd: 'M', x, y });
        i += 2;
        currentCmd = 'L';
        break;
      case 'l': // relative lineto
        x += parseFloat(tokens[i]);
        y += parseFloat(tokens[i + 1]);
        vertices.push({ cmd: 'L', x, y });
        i += 2;
        break;
      case 'L': // absolute lineto
        x = parseFloat(tokens[i]);
        y = parseFloat(tokens[i + 1]);
        vertices.push({ cmd: 'L', x, y });
        i += 2;
        break;
      case 'h': // relative horizontal
        x += parseFloat(tokens[i]);
        vertices.push({ cmd: 'L', x, y });
        i += 1;
        break;
      case 'H': // absolute horizontal
        x = parseFloat(tokens[i]);
        vertices.push({ cmd: 'L', x, y });
        i += 1;
        break;
      case 'v': // relative vertical
        y += parseFloat(tokens[i]);
        vertices.push({ cmd: 'L', x, y });
        i += 1;
        break;
      case 'V': // absolute vertical
        y = parseFloat(tokens[i]);
        vertices.push({ cmd: 'L', x, y });
        i += 1;
        break;
      case 'c': // relative cubic bezier
        {
          const x1 = x + parseFloat(tokens[i]);
          const y1 = y + parseFloat(tokens[i+1]);
          const x2 = x + parseFloat(tokens[i+2]);
          const y2 = y + parseFloat(tokens[i+3]);
          x += parseFloat(tokens[i+4]);
          y += parseFloat(tokens[i+5]);
          vertices.push({ cmd: 'C', x1, y1, x2, y2, x, y });
          i += 6;
        }
        break;
      case 'C': // absolute cubic bezier
        {
          const x1 = parseFloat(tokens[i]);
          const y1 = parseFloat(tokens[i+1]);
          const x2 = parseFloat(tokens[i+2]);
          const y2 = parseFloat(tokens[i+3]);
          x = parseFloat(tokens[i+4]);
          y = parseFloat(tokens[i+5]);
          vertices.push({ cmd: 'C', x1, y1, x2, y2, x, y });
          i += 6;
        }
        break;
      default:
        console.log(`Unknown command: ${currentCmd} at index ${i}`);
        i++;
    }
  }

  return vertices;
}

function verticesToString(verts) {
  return verts.map((v, idx) => {
    if (v.cmd === 'Z') return `  [${idx}] Z (close to ${v.x.toFixed(2)}, ${v.y.toFixed(2)})`;
    if (v.cmd === 'C') return `  [${idx}] C cp1=(${v.x1.toFixed(2)}, ${v.y1.toFixed(2)}) cp2=(${v.x2.toFixed(2)}, ${v.y2.toFixed(2)}) end=(${v.x.toFixed(2)}, ${v.y.toFixed(2)})`;
    return `  [${idx}] ${v.cmd} (${v.x.toFixed(2)}, ${v.y.toFixed(2)})`;
  }).join('\n');
}

// path3810 - the combined BLA+CON+AEG polygon
const path3810_d = "m 994.30859,711.0293 -43.43554,24.55078 -33.99414,26.43945 16.99609,16.99609 22.66211,-5.66406 1.88867,9.44141 -18.88476,5.66601 -5.66602,7.55469 -11.33008,1.88867 -3.77734,13.21875 -16.99805,-5.66601 v -9.44141 l -16.99609,-7.55469 7.55468,-13.21875 11.33008,-3.77734 -3.77539,-3.77734 -20.77539,3.77734 -11.33008,-7.55469 3.77735,-3.77734 -3.77735,-3.77734 -24.55078,5.66601 -15.10937,35.88281 1.88867,13.21875 -13.21875,9.44336 -3.77734,26.43946 -1.88868,5.66406 -7.55468,1.88867 -5.66407,26.43945 7.55274,16.99805 7.55469,9.44141 18.88476,5.66601 -9.44141,9.44336 -26.43945,7.55274 -13.39453,13.38476 -7.37891,-2.05273 -3.77734,-5.66602 -15.10937,-3.77734 -15.10743,7.55469 h -22.66211 l 11.33008,11.33203 -9.4414,-1.88867 1.88867,11.33007 -5.66602,1.88867 -15.10937,-13.21874 -5.66406,11.33007 18.88476,20.77344 -13.2207,-5.66406 -1.88672,5.66406 28.32617,28.32811 1.88867,13.2207 -16.99609,-5.666 1.88867,15.1074 -13.2207,-1.8886 9.44336,32.1054 13.2207,13.2207 7.55273,3.7754 47.21289,1.8887 7.55469,3.7773 35.88281,-35.8808 v -13.2207 l -15.10937,1.8886 -7.55273,-26.4394 -11.33204,-5.666 v -16.99612 l 5.66602,-5.66602 -5.66602,-11.33008 v -5.66601 l -15.10742,1.88867 1.88867,-9.44336 8.36329,-12.16797 19.96289,-1.05078 43.4375,-20.77344 -16.99805,-1.88867 5.66602,-5.66601 41.54687,-5.66602 11.33203,-18.88477 20.77344,-16.99609 39.66016,-9.44336 16.99609,13.21875 5.66601,-3.77539 11.33008,5.66406 58.54494,-7.55273 7.5547,1.88867 28.3261,-20.77539 5.6661,-18.88476 -11.3301,-16.9961 -24.5508,-3.77734 -49.10156,-22.66211 -20.77539,-1.88867 -13.21875,-13.22071 1.88867,-5.66406 7.55469,1.88867 9.4414,-24.55078 h -5.66601 l -5.66407,-11.33203 24.55079,-20.77344 z";

// path3387 - dashed boundary (BLA/BUL border, Bosphorus area)
const path3387_d = "m 805.45574,897.99344 c 0,0 -15.44271,-3.36281 -19.38347,-10.46024 -3.41501,-7.77929 0.66406,-24.0625 0.66406,-24.0625 l 2.04492,-8.74609 c 5.26341,-6.59839 14.3991,-10.1787 24.22859,-7.72133";

// path3421 - dashed boundary (CON/AEG border, Dardanelles area)
const path3421_d = "m 741.2459,939.54099 c 1.9e-4,3e-5 0.27564,-11.87049 9.58222,-19.55661 5.18439,-1.94768 11.30143,-1.67793 16.375,-1.23438 7.0571,7.62471 4.25977,17.01367 4.25977,17.01367";

// polyline122 - coastline (needs transform: matrix(1.8885246,0,0,1.8885246,0.9442593,48.157374))
const polyline122_d = "m 413,464 -1,-10 8,-3 6,-1 -4,-9 3,-14 4,-1 1,-3 -8,-3 h -12 l -6,2 -6,5 -8,-2 -8,2 -7,-4 -5,2 -3,-4 -2,4 3,8 3,5";

// polyline128 - coastline (needs same transform)
const polyline128_d = "m 371,438 -5,1 5,17 -6,5 4,3 h 7 l 12,-4 4,12 8,-4 8,2 5,-6 -1,-10";

// Transform function for matrix(1.8885246,0,0,1.8885246,0.9442593,48.157374)
function applyTransform(x, y) {
  return {
    x: 1.8885246 * x + 0.9442593,
    y: 1.8885246 * y + 48.157374
  };
}

console.log("=== path3810 (BLA+CON+AEG combined sea area) ===");
const path3810 = parsePathToAbsolute(path3810_d);
console.log(verticesToString(path3810));
console.log(`\nTotal vertices: ${path3810.length}`);

console.log("\n=== path3387 (dashed boundary - Bosphorus) ===");
const path3387 = parsePathToAbsolute(path3387_d);
console.log(verticesToString(path3387));

console.log("\n=== path3421 (dashed boundary - Dardanelles) ===");
const path3421 = parsePathToAbsolute(path3421_d);
console.log(verticesToString(path3421));

console.log("\n=== polyline122 (coastline, raw coords) ===");
const poly122_raw = parsePathToAbsolute(polyline122_d);
console.log(verticesToString(poly122_raw));

console.log("\n=== polyline122 (coastline, in 1152-space after transform) ===");
const poly122_1152 = poly122_raw.map(v => {
  const t = applyTransform(v.x, v.y);
  return { ...v, x: t.x, y: t.y };
});
console.log(verticesToString(poly122_1152));

console.log("\n=== polyline128 (coastline, raw coords) ===");
const poly128_raw = parsePathToAbsolute(polyline128_d);
console.log(verticesToString(poly128_raw));

console.log("\n=== polyline128 (coastline, in 1152-space after transform) ===");
const poly128_1152 = poly128_raw.map(v => {
  const t = applyTransform(v.x, v.y);
  return { ...v, x: t.x, y: t.y };
});
console.log(verticesToString(poly128_1152));

// Now let's analyze the geography
console.log("\n\n=== GEOGRAPHICAL ANALYSIS ===");
console.log("\npath3810 vertices sorted by region:");
path3810.forEach((v, i) => {
  if (v.cmd === 'Z') return;
  let region = '';
  if (v.y < 900) region = 'BLA region (y<900)';
  else if (v.y < 960 && v.x < 830) region = 'CON/Straits region';
  else if (v.y >= 960 || (v.y >= 900 && v.x < 750)) region = 'AEG region';
  else region = 'BLA-south/ANK coast';
  console.log(`  [${i}] (${v.x.toFixed(2)}, ${v.y.toFixed(2)}) - ${region}`);
});

// Identify the key boundary crossing points
console.log("\n\n=== KEY OBSERVATIONS ===");
console.log("path3387 starts at:", path3387[0].x.toFixed(2), path3387[0].y.toFixed(2));
console.log("path3387 ends at:", path3387[path3387.length-1].x.toFixed(2), path3387[path3387.length-1].y.toFixed(2));
console.log("path3421 starts at:", path3421[0].x.toFixed(2), path3421[0].y.toFixed(2));
console.log("path3421 ends at:", path3421[path3421.length-1].x.toFixed(2), path3421[path3421.length-1].y.toFixed(2));
