const data = require('./extracted-paths.json');

// Get all territory paths (Land + Seas)
const landPaths = data.paths.filter(p => p.layer === 'Land');
const seaPaths = data.paths.filter(p => p.layer === 'Seas');

console.log('=== LAND TERRITORIES ===');
console.log('Sorted by Y position (top to bottom), then X (left to right):');
console.log('');

// Sort by approximate geographic region
const sorted = [...landPaths].sort((a, b) => {
  const ay = a.boundingBox?.centerY || 0;
  const by = b.boundingBox?.centerY || 0;
  const yDiff = ay - by;
  if (Math.abs(yDiff) > 40) return yDiff;
  return (a.boundingBox?.centerX || 0) - (b.boundingBox?.centerX || 0);
});

for (const p of sorted) {
  const bb = p.boundingBox;
  const x = bb?.centerX?.toFixed(0) || '?';
  const y = bb?.centerY?.toFixed(0) || '?';
  const w = bb?.width?.toFixed(0) || '?';
  const h = bb?.height?.toFixed(0) || '?';
  console.log(`${p.id.padEnd(15)} x:${x.padStart(5)} y:${y.padStart(5)}  (${w}x${h})`);
}

console.log('');
console.log('=== SEA TERRITORIES ===');
const sortedSeas = [...seaPaths].sort((a, b) => {
  const ay = a.boundingBox?.centerY || 0;
  const by = b.boundingBox?.centerY || 0;
  const yDiff = ay - by;
  if (Math.abs(yDiff) > 40) return yDiff;
  return (a.boundingBox?.centerX || 0) - (b.boundingBox?.centerX || 0);
});

for (const p of sortedSeas) {
  const bb = p.boundingBox;
  const x = bb?.centerX?.toFixed(0) || '?';
  const y = bb?.centerY?.toFixed(0) || '?';
  const w = bb?.width?.toFixed(0) || '?';
  const h = bb?.height?.toFixed(0) || '?';
  console.log(`${p.id.padEnd(15)} x:${x.padStart(5)} y:${y.padStart(5)}  (${w}x${h})`);
}
