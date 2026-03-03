/**
 * Parse a CSV file of survey points.
 * Supports formats:
 *   Point ID, Northing, Easting, Elevation[, Description]
 *   Point ID, Easting, Northing, Elevation[, Description]  (auto-detected)
 */
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const points = [];
  let startIdx = 0;

  // Skip header row if present
  const firstLine = lines[0].toLowerCase();
  if (firstLine.includes('point') || firstLine.includes('id') || firstLine.includes('north') || firstLine.includes('east') || isNaN(lines[0].split(',')[1])) {
    startIdx = 1;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',').map(p => p.trim());
    if (parts.length < 4) continue;

    const id = parts[0];
    const a = parseFloat(parts[1]);
    const b = parseFloat(parts[2]);
    const elev = parseFloat(parts[3]);
    const desc = parts[4] || '';

    if (isNaN(a) || isNaN(b) || isNaN(elev)) continue;

    points.push({ id, northing: a, easting: b, elevation: elev, description: desc });
  }

  return points;
}

export function pointsToCSV(points) {
  const lines = ['Point ID,Northing,Easting,Elevation,Description'];
  for (const p of points) {
    lines.push(`${p.id},${p.northing},${p.easting},${p.elevation},${p.description || ''}`);
  }
  return lines.join('\n');
}
