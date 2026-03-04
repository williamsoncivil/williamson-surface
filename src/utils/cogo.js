/**
 * COGO - Coordinate Geometry calculations
 */

// Convert degrees to radians
export const toRad = d => d * Math.PI / 180;
export const toDeg = r => r * 180 / Math.PI;

/**
 * Inverse - distance, bearing, slope between two points
 */
export function inverse(p1, p2) {
  const dE = p2.easting - p1.easting;
  const dN = p2.northing - p1.northing;
  const dZ = p2.elevation - p1.elevation;
  const horizDist = Math.sqrt(dE * dE + dN * dN);
  const slopeDist = Math.sqrt(horizDist * horizDist + dZ * dZ);

  // Bearing: azimuth from north, clockwise
  let bearing = toDeg(Math.atan2(dE, dN));
  if (bearing < 0) bearing += 360;

  const slopePct = horizDist > 0 ? (dZ / horizDist) * 100 : 0;
  const slopeDeg = toDeg(Math.atan2(dZ, horizDist));

  return {
    horizDist,
    slopeDist,
    bearing,
    dE,
    dN,
    dZ,
    slopePct,
    slopeDeg,
  };
}

/**
 * Point at bearing and distance from a start point,
 * with a turn angle applied from a reference bearing.
 * 
 * @param {object} startPt - { easting, northing, elevation }
 * @param {number} refBearing - reference bearing in decimal degrees (0-360)
 * @param {number} turnAngle - turn angle in decimal degrees (positive = right/CW, negative = left/CCW)
 * @param {number} distance - horizontal distance
 * @param {object} elevOption - { mode: 'fixed'|'slope'|'manual', value: number }
 *   fixed: add value to start elevation
 *   slope: apply % slope over distance (value = %)
 *   manual: set elevation directly (value = elevation)
 * @returns {object} new point { easting, northing, elevation, bearing }
 */
export function pointAtAngleDistance(startPt, refBearing, turnAngle, distance, elevOption) {
  const newBearing = (refBearing + turnAngle + 360) % 360;
  const newEasting = startPt.easting + distance * Math.sin(toRad(newBearing));
  const newNorthing = startPt.northing + distance * Math.cos(toRad(newBearing));

  let newElevation = startPt.elevation;
  if (elevOption.mode === 'fixed') {
    newElevation = startPt.elevation + elevOption.value;
  } else if (elevOption.mode === 'slope') {
    // slope% = rise/run * 100
    newElevation = startPt.elevation + (elevOption.value / 100) * distance;
  } else if (elevOption.mode === 'manual') {
    newElevation = elevOption.value;
  }

  return {
    easting: newEasting,
    northing: newNorthing,
    elevation: newElevation,
    bearing: newBearing,
  };
}

/**
 * Calculate area of a polygon (array of { easting, northing }) using shoelace formula.
 * Returns area in square units (same units as coordinates).
 */
export function polygonArea(points) {
  const n = points.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].easting * points[j].northing;
    area -= points[j].easting * points[i].northing;
  }
  return Math.abs(area) / 2;
}

/**
 * Offset a line by a horizontal distance and elevation adjustment.
 * @param {Array} linePoints - array of { easting, northing, elevation }
 * @param {number} horizOffset - horizontal offset distance (positive = right of direction of travel)
 * @param {object} elevOption - { mode: 'fixed'|'slope', value: number }
 * @returns {Array} new line points
 */
export function offsetLine(linePoints, horizOffset, elevOption) {
  const result = [];
  for (let i = 0; i < linePoints.length; i++) {
    const p = linePoints[i];
    let bearing;
    if (i < linePoints.length - 1) {
      const inv = inverse(p, linePoints[i + 1]);
      bearing = inv.bearing;
    } else {
      const inv = inverse(linePoints[i - 1], p);
      bearing = inv.bearing;
    }

    // Perpendicular bearing (right = +90°)
    const perpBearing = (bearing + 90 + 360) % 360;
    const newE = p.easting + horizOffset * Math.sin(toRad(perpBearing));
    const newN = p.northing + horizOffset * Math.cos(toRad(perpBearing));

    let newZ = p.elevation;
    if (elevOption.mode === 'fixed') {
      newZ = p.elevation + elevOption.value;
    } else if (elevOption.mode === 'slope') {
      // slope% applied over horizontal offset distance
      newZ = p.elevation + (elevOption.value / 100) * Math.abs(horizOffset);
    }

    result.push({ easting: newE, northing: newN, elevation: newZ });
  }
  return result;
}

/**
 * Closure check - distance from last traverse point back to start point.
 */
export function closureCheck(startPt, lastPt) {
  return inverse(lastPt, startPt);
}

/**
 * Format bearing as degrees/minutes/seconds string
 */
export function formatBearing(deg) {
  const d = Math.floor(deg);
  const mFull = (deg - d) * 60;
  const m = Math.floor(mFull);
  const s = ((mFull - m) * 60).toFixed(1);
  return `${d}°${m}'${s}"`;
}

/**
 * Format slope as string
 */
export function formatSlope(pct) {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

/**
 * Generate a unique point ID
 */
export function nextPointId(points) {
  const nums = points.map(p => parseInt(p.id)).filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return String(max + 1);
}
