/**
 * Update Label Positions Script
 *
 * This script updates the classicVisualData.ts file with correct label positions
 * extracted from the SVG's Curves layer.
 */

const fs = require('fs');
const path = require('path');

// Load correct label positions
const correctPositions = require('./correct-label-positions.json');

// Path to the visual data file
const visualDataPath = path.join(__dirname, '../packages/shared/src/maps/classicVisualData.ts');

// Read the current file
let content = fs.readFileSync(visualDataPath, 'utf-8');
const lines = content.split('\n');

// Track changes
const changes = [];

// Process line by line
let currentTerritory = null;
const newLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  // Check if we're entering a new territory block
  const territoryMatch = line.match(/^\s*'([a-z]{3})':\s*\{/);
  if (territoryMatch) {
    currentTerritory = territoryMatch[1];
  }

  // Check if we're exiting a territory block
  if (line.match(/^\s*\},?\s*$/) && currentTerritory) {
    currentTerritory = null;
  }

  // If we're in a territory block and this line has labelPosition or center
  if (currentTerritory && correctPositions[currentTerritory]) {
    const correct = correctPositions[currentTerritory];

    // Update labelPosition
    const labelMatch = line.match(/^(\s*)labelPosition:\s*\{\s*x:\s*([\d.]+),\s*y:\s*([\d.]+)\s*\}(,?)$/);
    if (labelMatch) {
      const indent = labelMatch[1];
      const oldX = parseFloat(labelMatch[2]);
      const oldY = parseFloat(labelMatch[3]);
      const comma = labelMatch[4];
      const newX = correct.x;
      const newY = correct.y;

      const distance = Math.sqrt(Math.pow(newX - oldX, 2) + Math.pow(newY - oldY, 2));
      if (distance > 1) {
        changes.push({
          territory: currentTerritory,
          name: correct.name,
          field: 'labelPosition',
          oldX,
          oldY,
          newX,
          newY,
          distance: Math.round(distance)
        });
      }

      line = `${indent}labelPosition: { x: ${newX}, y: ${newY} }${comma}`;
    }

    // Update center
    const centerMatch = line.match(/^(\s*)center:\s*\{\s*x:\s*([\d.]+),\s*y:\s*([\d.]+)\s*\}(,?)$/);
    if (centerMatch) {
      const indent = centerMatch[1];
      const oldX = parseFloat(centerMatch[2]);
      const oldY = parseFloat(centerMatch[3]);
      const comma = centerMatch[4];
      const newX = correct.x;
      const newY = correct.y;

      line = `${indent}center: { x: ${newX}, y: ${newY} }${comma}`;
    }

    // Update supplyCenterPosition (20px below center)
    const scMatch = line.match(/^(\s*)supplyCenterPosition:\s*\{\s*x:\s*([\d.]+),\s*y:\s*([\d.]+)\s*\}(,?)$/);
    if (scMatch) {
      const indent = scMatch[1];
      const comma = scMatch[4];
      const newX = correct.x;
      const newY = correct.y + 20;

      line = `${indent}supplyCenterPosition: { x: ${newX}, y: ${newY} }${comma}`;
    }
  }

  newLines.push(line);
}

// Write the updated file
fs.writeFileSync(visualDataPath, newLines.join('\n'), 'utf-8');

// Print summary
console.log('\n=== Label Position Update Summary ===\n');

// Sort by distance (largest first)
changes.sort((a, b) => b.distance - a.distance);

// Print changes grouped by severity
const critical = changes.filter(c => c.distance > 400);
const major = changes.filter(c => c.distance > 200 && c.distance <= 400);
const moderate = changes.filter(c => c.distance > 100 && c.distance <= 200);
const minor = changes.filter(c => c.distance > 50 && c.distance <= 100);
const small = changes.filter(c => c.distance <= 50 && c.distance > 1);

if (critical.length > 0) {
  console.log(`\n🔴 CRITICAL (>400px off): ${critical.length} territories`);
  critical.forEach(c => {
    console.log(`   ${c.territory.toUpperCase()} (${c.name}): (${c.oldX}, ${c.oldY}) → (${c.newX}, ${c.newY}) [${c.distance}px]`);
  });
}

if (major.length > 0) {
  console.log(`\n🟠 MAJOR (200-400px off): ${major.length} territories`);
  major.forEach(c => {
    console.log(`   ${c.territory.toUpperCase()} (${c.name}): (${c.oldX}, ${c.oldY}) → (${c.newX}, ${c.newY}) [${c.distance}px]`);
  });
}

if (moderate.length > 0) {
  console.log(`\n🟡 MODERATE (100-200px off): ${moderate.length} territories`);
  moderate.forEach(c => {
    console.log(`   ${c.territory.toUpperCase()} (${c.name}): (${c.oldX}, ${c.oldY}) → (${c.newX}, ${c.newY}) [${c.distance}px]`);
  });
}

if (minor.length > 0) {
  console.log(`\n🟢 MINOR (50-100px off): ${minor.length} territories`);
  minor.forEach(c => {
    console.log(`   ${c.territory.toUpperCase()} (${c.name}): (${c.oldX}, ${c.oldY}) → (${c.newX}, ${c.newY}) [${c.distance}px]`);
  });
}

if (small.length > 0) {
  console.log(`\n✅ SMALL (<50px off): ${small.length} territories`);
}

console.log(`\nTotal labelPosition changes: ${changes.length}`);
console.log('\n=== Update Complete ===\n');
