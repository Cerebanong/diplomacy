/**
 * Extract SVG paths from Diplomacy.svg
 *
 * This script parses the SVG and extracts all path elements with their:
 * - id attribute
 * - d attribute (path data)
 * - stroke color from style
 * - calculated center point
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '../packages/shared/src/maps/Diplomacy.svg');
const OUTPUT_PATH = path.join(__dirname, 'extracted-paths.json');

/**
 * Parse the 'd' attribute to calculate bounding box
 */
function calculateBoundingBox(d) {
  if (!d) return null;

  // Extract all coordinates from the path
  const coords = [];

  // Match all coordinate pairs (numbers, potentially negative, with decimals)
  const coordPattern = /(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)/g;
  let match;

  // Also handle M, L, H, V, C, S, Q, T, A commands
  const commands = d.split(/(?=[MLHVCSQTAZmlhvcsqtaz])/);

  let currentX = 0;
  let currentY = 0;

  for (const cmd of commands) {
    if (!cmd.trim()) continue;

    const type = cmd[0];
    const args = cmd.slice(1).trim();
    const numbers = args.match(/-?\d+\.?\d*/g)?.map(Number) || [];

    switch (type) {
      case 'M':
      case 'L':
        for (let i = 0; i < numbers.length; i += 2) {
          if (i + 1 < numbers.length) {
            currentX = numbers[i];
            currentY = numbers[i + 1];
            coords.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'm':
      case 'l':
        for (let i = 0; i < numbers.length; i += 2) {
          if (i + 1 < numbers.length) {
            currentX += numbers[i];
            currentY += numbers[i + 1];
            coords.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'H':
        for (const n of numbers) {
          currentX = n;
          coords.push({ x: currentX, y: currentY });
        }
        break;
      case 'h':
        for (const n of numbers) {
          currentX += n;
          coords.push({ x: currentX, y: currentY });
        }
        break;
      case 'V':
        for (const n of numbers) {
          currentY = n;
          coords.push({ x: currentX, y: currentY });
        }
        break;
      case 'v':
        for (const n of numbers) {
          currentY += n;
          coords.push({ x: currentX, y: currentY });
        }
        break;
      case 'C':
        // Cubic bezier - take endpoint
        for (let i = 0; i < numbers.length; i += 6) {
          if (i + 5 < numbers.length) {
            currentX = numbers[i + 4];
            currentY = numbers[i + 5];
            coords.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'c':
        for (let i = 0; i < numbers.length; i += 6) {
          if (i + 5 < numbers.length) {
            currentX += numbers[i + 4];
            currentY += numbers[i + 5];
            coords.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'S':
      case 'Q':
        for (let i = 0; i < numbers.length; i += 4) {
          if (i + 3 < numbers.length) {
            currentX = numbers[i + 2];
            currentY = numbers[i + 3];
            coords.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 's':
      case 'q':
        for (let i = 0; i < numbers.length; i += 4) {
          if (i + 3 < numbers.length) {
            currentX += numbers[i + 2];
            currentY += numbers[i + 3];
            coords.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'A':
        for (let i = 0; i < numbers.length; i += 7) {
          if (i + 6 < numbers.length) {
            currentX = numbers[i + 5];
            currentY = numbers[i + 6];
            coords.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'a':
        for (let i = 0; i < numbers.length; i += 7) {
          if (i + 6 < numbers.length) {
            currentX += numbers[i + 5];
            currentY += numbers[i + 6];
            coords.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'Z':
      case 'z':
        // Close path - doesn't add coordinates
        break;
    }
  }

  if (coords.length === 0) return null;

  const minX = Math.min(...coords.map(c => c.x));
  const maxX = Math.max(...coords.map(c => c.x));
  const minY = Math.min(...coords.map(c => c.y));
  const maxY = Math.max(...coords.map(c => c.y));

  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Extract stroke color from style attribute
 */
function extractStrokeColor(style) {
  if (!style) return null;
  const match = style.match(/stroke:\s*([^;]+)/);
  return match ? match[1].trim() : null;
}

/**
 * Extract fill color from style attribute
 */
function extractFillColor(style) {
  if (!style) return null;
  const match = style.match(/fill:\s*([^;]+)/);
  return match ? match[1].trim() : null;
}

async function main() {
  console.log('Reading SVG file...');
  const svgContent = fs.readFileSync(SVG_PATH, 'utf-8');

  console.log('Parsing SVG...');
  const dom = new JSDOM(svgContent, { contentType: 'image/svg+xml' });
  const document = dom.window.document;

  // Get the SVG element
  const svg = document.querySelector('svg');
  const viewBox = svg.getAttribute('viewBox');
  console.log('SVG viewBox:', viewBox);

  // Find all layers
  const layers = document.querySelectorAll('g[inkscape\\:groupmode="layer"]');
  console.log(`Found ${layers.length} layers`);

  for (const layer of layers) {
    const label = layer.getAttribute('inkscape:label');
    console.log(`  - ${label} (id: ${layer.id})`);
  }

  // Extract all paths
  const paths = document.querySelectorAll('path');
  console.log(`\nFound ${paths.length} path elements`);

  const extractedPaths = [];

  for (const pathEl of paths) {
    const id = pathEl.getAttribute('id');
    const d = pathEl.getAttribute('d');
    const style = pathEl.getAttribute('style');
    const transform = pathEl.getAttribute('transform');

    if (!d) continue;

    const strokeColor = extractStrokeColor(style);
    const fillColor = extractFillColor(style);
    const boundingBox = calculateBoundingBox(d);

    // Get parent layer
    let parentLayer = pathEl.parentElement;
    while (parentLayer && !parentLayer.getAttribute('inkscape:groupmode')) {
      parentLayer = parentLayer.parentElement;
    }
    const layerLabel = parentLayer?.getAttribute('inkscape:label') || 'unknown';

    extractedPaths.push({
      id,
      d,
      strokeColor,
      fillColor,
      transform,
      boundingBox,
      layer: layerLabel,
    });
  }

  // Sort by layer and then by bounding box position (top to bottom, left to right)
  extractedPaths.sort((a, b) => {
    if (a.layer !== b.layer) return a.layer.localeCompare(b.layer);
    if (!a.boundingBox || !b.boundingBox) return 0;
    const yDiff = a.boundingBox.centerY - b.boundingBox.centerY;
    if (Math.abs(yDiff) > 50) return yDiff;
    return a.boundingBox.centerX - b.boundingBox.centerX;
  });

  console.log(`\nExtracted ${extractedPaths.length} paths with path data`);

  // Group by layer
  const byLayer = {};
  for (const p of extractedPaths) {
    if (!byLayer[p.layer]) byLayer[p.layer] = [];
    byLayer[p.layer].push(p);
  }

  for (const [layer, paths] of Object.entries(byLayer)) {
    console.log(`  ${layer}: ${paths.length} paths`);
  }

  // Output
  const output = {
    viewBox,
    paths: extractedPaths,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nOutput written to ${OUTPUT_PATH}`);

  // Print sample for inspection
  console.log('\n--- Sample paths from Land layer ---');
  const landPaths = extractedPaths.filter(p => p.layer === 'Land').slice(0, 10);
  for (const p of landPaths) {
    console.log(`${p.id}: center=(${p.boundingBox?.centerX?.toFixed(0)}, ${p.boundingBox?.centerY?.toFixed(0)}), stroke=${p.strokeColor}`);
  }
}

main().catch(console.error);
