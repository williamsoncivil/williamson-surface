import { Delaunay } from 'd3-delaunay';

/**
 * Build a TIN surface from survey points.
 * Returns { triangles, points } where triangles is array of [i0, i1, i2] index triples.
 */
export function buildTIN(surveyPoints) {
  if (surveyPoints.length < 3) return { triangles: [], points: surveyPoints };

  // d3-delaunay uses [x, y] — we use easting as X, northing as Y
  const coords = surveyPoints.map(p => [p.easting, p.northing]);
  const delaunay = Delaunay.from(coords);
  const { triangles } = delaunay;

  const tris = [];
  for (let i = 0; i < triangles.length; i += 3) {
    tris.push([triangles[i], triangles[i + 1], triangles[i + 2]]);
  }

  return { triangles: tris, points: surveyPoints };
}

/**
 * Analyze triangles for quality issues.
 * Returns array of { index, reason } for problem triangles.
 */
export function analyzeTriangles(triangles, points) {
  const problems = [];

  triangles.forEach((tri, idx) => {
    const [a, b, c] = tri.map(i => points[i]);
    if (!a || !b || !c) return;

    const ab = dist2D(a, b);
    const bc = dist2D(b, c);
    const ca = dist2D(c, a);
    const sides = [ab, bc, ca].sort((x, y) => x - y);
    const longest = sides[2];
    const shortest = sides[0];

    // Long thin triangle
    if (shortest > 0 && longest / shortest > 10) {
      problems.push({ index: idx, reason: 'Long thin triangle' });
    }
  });

  return problems;
}

function dist2D(a, b) {
  return Math.sqrt((a.easting - b.easting) ** 2 + (a.northing - b.northing) ** 2);
}

/**
 * Get elevation stats for a surface.
 */
export function getSurfaceStats(points) {
  if (!points.length) return { minElev: 0, maxElev: 0, avgElev: 0 };
  const elevs = points.map(p => p.elevation);
  const minElev = Math.min(...elevs);
  const maxElev = Math.max(...elevs);
  const avgElev = elevs.reduce((a, b) => a + b, 0) / elevs.length;
  return { minElev, maxElev, avgElev };
}

/**
 * Get triangle centroid elevation (average of 3 vertices).
 */
export function triangleElevation(tri, points) {
  return (points[tri[0]].elevation + points[tri[1]].elevation + points[tri[2]].elevation) / 3;
}

/**
 * Get triangle slope in degrees.
 */
export function triangleSlope(tri, points) {
  const [a, b, c] = tri.map(i => points[i]);
  // Normal vector from cross product
  const v1 = { x: b.easting - a.easting, y: b.northing - a.northing, z: b.elevation - a.elevation };
  const v2 = { x: c.easting - a.easting, y: c.northing - a.northing, z: c.elevation - a.elevation };
  const nx = v1.y * v2.z - v1.z * v2.y;
  const ny = v1.z * v2.x - v1.x * v2.z;
  const nz = v1.x * v2.y - v1.y * v2.x;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len === 0) return 0;
  const cosAngle = Math.abs(nz) / len;
  return (Math.acos(Math.min(cosAngle, 1)) * 180) / Math.PI;
}
