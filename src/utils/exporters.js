/**
 * Export utilities: DXF and TTM
 */

// ---- DXF Export ----
export function exportDXF(breaklines, boundary, points) {
  const lines = [];
  lines.push('0\nSECTION\n2\nHEADER\n0\nENDSEC');
  lines.push('0\nSECTION\n2\nENTITIES');

  // Breaklines
  for (const bl of breaklines) {
    for (let i = 0; i < bl.length - 1; i++) {
      const a = bl[i];
      const b = bl[i + 1];
      lines.push(`0\nLINE\n8\nBREAKLINES\n10\n${a.easting}\n20\n${a.northing}\n30\n${a.elevation}\n11\n${b.easting}\n21\n${b.northing}\n31\n${b.elevation}`);
    }
  }

  // Boundary
  if (boundary && boundary.length > 1) {
    for (let i = 0; i < boundary.length; i++) {
      const a = boundary[i];
      const b = boundary[(i + 1) % boundary.length];
      lines.push(`0\nLINE\n8\nBOUNDARY\n10\n${a.easting}\n20\n${a.northing}\n30\n${a.elevation || 0}\n11\n${b.easting}\n21\n${b.northing}\n31\n${b.elevation || 0}`);
    }
  }

  lines.push('0\nENDSEC\n0\nEOF');
  return lines.join('\n');
}

// ---- TTM Export ----
// Trimble Terrain Model (.ttm) binary format
// Based on reverse-engineered community documentation
// Header: "TTM\0" magic, version, counts, bounding box
// Points: X(double), Y(double), Z(double)
// Triangles: i0(int32), i1(int32), i2(int32)

export function exportTTM(points, triangles) {
  const pointCount = points.length;
  const triCount = triangles.length;

  // Calculate bounding box
  const minE = Math.min(...points.map(p => p.easting));
  const maxE = Math.max(...points.map(p => p.easting));
  const minN = Math.min(...points.map(p => p.northing));
  const maxN = Math.max(...points.map(p => p.northing));
  const minZ = Math.min(...points.map(p => p.elevation));
  const maxZ = Math.max(...points.map(p => p.elevation));

  // Header: 4 magic + 4 version + 4 pointCount + 4 triCount + 6*8 bbox = 68 bytes
  const headerSize = 68;
  const pointsSize = pointCount * 24; // 3 doubles * 8 bytes
  const trisSize = triCount * 12;     // 3 int32 * 4 bytes
  const totalSize = headerSize + pointsSize + trisSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;

  // Magic bytes "TTM\0"
  view.setUint8(offset++, 0x54); // T
  view.setUint8(offset++, 0x54); // T
  view.setUint8(offset++, 0x4D); // M
  view.setUint8(offset++, 0x00); // null

  // Version 1
  view.setUint32(offset, 1, true); offset += 4;

  // Point and triangle counts
  view.setUint32(offset, pointCount, true); offset += 4;
  view.setUint32(offset, triCount, true); offset += 4;

  // Bounding box (little-endian doubles)
  view.setFloat64(offset, minE, true); offset += 8;
  view.setFloat64(offset, maxE, true); offset += 8;
  view.setFloat64(offset, minN, true); offset += 8;
  view.setFloat64(offset, maxN, true); offset += 8;
  view.setFloat64(offset, minZ, true); offset += 8;
  view.setFloat64(offset, maxZ, true); offset += 8;

  // Points: Easting (X), Northing (Y), Elevation (Z)
  for (const p of points) {
    view.setFloat64(offset, p.easting, true); offset += 8;
    view.setFloat64(offset, p.northing, true); offset += 8;
    view.setFloat64(offset, p.elevation, true); offset += 8;
  }

  // Triangles: three 0-based indices
  for (const tri of triangles) {
    view.setInt32(offset, tri[0], true); offset += 4;
    view.setInt32(offset, tri[1], true); offset += 4;
    view.setInt32(offset, tri[2], true); offset += 4;
  }

  return buffer;
}

// LandXML fallback export
export function exportLandXML(points, triangles) {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<LandXML version="1.2" xmlns="http://www.landxml.org/schema/LandXML-1.2">');
  lines.push('  <Surfaces>');
  lines.push('    <Surface name="WilliamsonSurface">');
  lines.push('      <Definition surfType="TIN">');
  lines.push('        <Pnts>');
  points.forEach((p, i) => {
    lines.push(`          <P id="${i + 1}">${p.northing} ${p.easting} ${p.elevation}</P>`);
  });
  lines.push('        </Pnts>');
  lines.push('        <Faces>');
  triangles.forEach((tri, i) => {
    lines.push(`          <F>${tri[0] + 1} ${tri[1] + 1} ${tri[2] + 1}</F>`);
  });
  lines.push('        </Faces>');
  lines.push('      </Definition>');
  lines.push('    </Surface>');
  lines.push('  </Surfaces>');
  lines.push('</LandXML>');
  return lines.join('\n');
}
