import React, { useRef, useEffect, useCallback, useState } from 'react';
import { triangleElevation, triangleSlope, getSurfaceStats } from '../utils/tinBuilder.js';

function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function elevationColor(elev, minE, maxE) {
  if (maxE === minE) return '#4a9eff';
  const t = (elev - minE) / (maxE - minE);
  // Blue → Cyan → Green → Yellow → Red
  if (t < 0.25) { const s = t / 0.25; return rgb(lerp(0, 0, s), lerp(100, 200, s), lerp(200, 255, s)); }
  if (t < 0.5) { const s = (t - 0.25) / 0.25; return rgb(lerp(0, 50, s), lerp(200, 220, s), lerp(255, 50, s)); }
  if (t < 0.75) { const s = (t - 0.5) / 0.25; return rgb(lerp(50, 230, s), lerp(220, 220, s), lerp(50, 0, s)); }
  const s = (t - 0.75) / 0.25; return rgb(lerp(230, 220, s), lerp(220, 30, s), lerp(0, 0, s));
}

function slopeColor(slope) {
  // 0° = green, 30°+ = red
  const t = Math.min(slope / 30, 1);
  return rgb(lerp(50, 220, t), lerp(200, 30, t), lerp(50, 30, t));
}

function rgb(r, g, b) { return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`; }
function lerp(a, b, t) { return a + (b - a) * t; }

export default function Canvas2D({ points, breaklines, boundary, surface, problems, activeTool, showTIN, showLabels, colorMode, onMouseCoords, onSelected, onBreaklineAdd, onBoundarySet, traversePreview }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    panX: 0, panY: 0, zoom: 1,
    isPanning: false, lastMouse: null,
    drawingLine: null, // array of world points being drawn
    initialized: false,
  });
  const [, forceUpdate] = useState(0);

  // Fit all points to view on first load
  useEffect(() => {
    if (!points.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    const W = canvas.width, H = canvas.height;

    const es = points.map(p => p.easting);
    const ns = points.map(p => p.northing);
    const minE = Math.min(...es), maxE = Math.max(...es);
    const minN = Math.min(...ns), maxN = Math.max(...ns);
    const dE = maxE - minE || 1, dN = maxN - minN || 1;

    const scaleX = (W * 0.8) / dE;
    const scaleY = (H * 0.8) / dN;
    s.zoom = Math.min(scaleX, scaleY);
    s.panX = W / 2 - ((minE + maxE) / 2) * s.zoom;
    s.panY = H / 2 + ((minN + maxN) / 2) * s.zoom;
    s.initialized = true;
    forceUpdate(v => v + 1);
  }, [points.length > 0 && !stateRef.current.initialized]);

  const toCanvas = (e, n) => {
    const s = stateRef.current;
    return [e * s.zoom + s.panX, -n * s.zoom + s.panY];
  };
  const toWorld = (cx, cy) => {
    const s = stateRef.current;
    return [(cx - s.panX) / s.zoom, -(cy - s.panY) / s.zoom];
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    const stats = points.length ? getSurfaceStats(points) : { minElev: 0, maxElev: 0 };
    const problemSet = new Set((problems || []).map(p => p.index));

    // Draw TIN
    if (showTIN && surface && surface.length) {
      surface.forEach((tri, idx) => {
        const [a, b, c] = tri.map(i => points[i]);
        if (!a || !b || !c) return;
        const [ax, ay] = toCanvas(a.easting, a.northing);
        const [bx, by] = toCanvas(b.easting, b.northing);
        const [cx2, cy2] = toCanvas(c.easting, c.northing);

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(cx2, cy2);
        ctx.closePath();

        if (problemSet.has(idx)) {
          ctx.fillStyle = 'rgba(255,80,80,0.4)';
        } else if (colorMode === 'elevation') {
          const elev = triangleElevation(tri, points);
          ctx.fillStyle = elevationColor(elev, stats.minElev, stats.maxElev) + '99';
        } else if (colorMode === 'slope') {
          const slope = triangleSlope(tri, points);
          ctx.fillStyle = slopeColor(slope) + '99';
        } else {
          ctx.fillStyle = 'rgba(74, 158, 255, 0.15)';
        }
        ctx.fill();
        ctx.strokeStyle = 'rgba(74, 158, 255, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });
    }

    // Draw boundary
    if (boundary && boundary.length > 1) {
      ctx.beginPath();
      boundary.forEach((p, i) => {
        const [x, y] = toCanvas(p.easting, p.northing);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw breaklines (support both old array format and new {pts, name} format)
    if (breaklines && breaklines.length) {
      const selectedLine = stateRef.current.selectedLine;
      breaklines.forEach((bl, idx) => {
        const pts = bl.pts || bl;
        const isSelected = selectedLine === idx;
        ctx.strokeStyle = isSelected ? '#ffd700' : '#ff9f43';
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.beginPath();
        pts.forEach((p, i) => {
          const [x, y] = toCanvas(p.easting, p.northing);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
        // Draw line name label at midpoint
        const name = bl.name;
        if (name && pts.length >= 2) {
          const mid = Math.floor(pts.length / 2);
          const [mx, my] = toCanvas(pts[mid].easting, pts[mid].northing);
          ctx.fillStyle = isSelected ? '#ffd700' : '#ff9f43';
          ctx.font = '10px sans-serif';
          ctx.fillText(name, mx + 4, my - 4);
        }
      });
    }

    // Draw traverse preview point
    if (traversePreview && traversePreview.lastPt && traversePreview.previewPt) {
      const [lx, ly] = toCanvas(traversePreview.lastPt.easting, traversePreview.lastPt.northing);
      const [px2, py2] = toCanvas(traversePreview.previewPt.easting, traversePreview.previewPt.northing);
      // Dashed line from last point to preview
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(px2, py2);
      ctx.stroke();
      ctx.setLineDash([]);
      // Preview point circle
      ctx.beginPath();
      ctx.arc(px2, py2, 7, 0, Math.PI * 2);
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,255,136,0.3)';
      ctx.fill();
      // Label with coords and elevation
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`E:${traversePreview.previewPt.easting.toFixed(1)} N:${traversePreview.previewPt.northing.toFixed(1)} Z:${traversePreview.previewPt.elevation.toFixed(1)}`, px2 + 10, py2 - 6);
    }

    // Draw active drawing line
    const s = stateRef.current;
    if (s.drawingLine && s.drawingLine.length > 0) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      s.drawingLine.forEach((p, i) => {
        const [x, y] = toCanvas(p.easting, p.northing);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw points
    const dotSize = Math.max(2, Math.min(6, stateRef.current.zoom * 0.3));
    const selectedPt = stateRef.current.selectedPt;
    points.forEach(p => {
      const [x, y] = toCanvas(p.easting, p.northing);
      if (x < -10 || x > W + 10 || y < -10 || y > H + 10) return;
      const isSelected = selectedPt && selectedPt.id === p.id;
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? dotSize * 2 : dotSize, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#ffd700' : '#e94560';
      ctx.fill();
      if (isSelected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      if (showLabels || isSelected) {
        ctx.fillStyle = isSelected ? '#ffd700' : '#fff';
        ctx.font = isSelected ? 'bold 12px sans-serif' : '10px sans-serif';
        ctx.fillText(p.id, x + dotSize * 2 + 2, y - 2);
      }
    });
  }, [points, surface, breaklines, boundary, problems, showTIN, showLabels, colorMode, traversePreview]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  const snapToPoint = useCallback((e, n, radius = 10) => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    let closest = null, minD = Infinity;
    for (const p of points) {
      const [cx, cy] = toCanvas(p.easting, p.northing);
      const [wx, wy] = toCanvas(e * s.zoom + s.panX, n);
      const d = Math.hypot(cx - (e * s.zoom + s.panX), cy - (-n * s.zoom + s.panY));
      if (d < radius && d < minD) { minD = d; closest = p; }
    }
    return closest;
  }, [points]);

  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const [we, wn] = toWorld(cx, cy);
    const s = stateRef.current;

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      s.isPanning = true;
      s.lastMouse = { x: e.clientX, y: e.clientY };
      return;
    }

    // Single click near a point — select it (highlight), notify parent
    if (activeTool === 'select') {
      let closest = null, minD = Infinity;
      for (const p of points) {
        const [px, py] = toCanvas(p.easting, p.northing);
        const d = Math.hypot(px - cx, py - cy);
        if (d < 16 && d < minD) { minD = d; closest = p; }
      }
      if (closest) {
        stateRef.current.selectedPt = closest;
        stateRef.current.selectedLine = null;
        onSelected({ type: 'select', point: closest });
        draw();
        return;
      }
      // Check if clicking near a line
      let closestLine = null, minLineDist = 8;
      breaklines.forEach((bl, idx) => {
        const pts = bl.pts || bl;
        for (let i = 0; i < pts.length - 1; i++) {
          const [ax, ay] = toCanvas(pts[i].easting, pts[i].northing);
          const [bx, by] = toCanvas(pts[i+1].easting, pts[i+1].northing);
          const d = pointToSegmentDist(cx, cy, ax, ay, bx, by);
          if (d < minLineDist) { minLineDist = d; closestLine = idx; }
        }
      });
      if (closestLine !== null) {
        stateRef.current.selectedLine = closestLine;
        stateRef.current.selectedPt = null;
        onSelected({ type: 'line', index: closestLine, line: breaklines[closestLine] });
        draw();
        return;
      }
      stateRef.current.selectedPt = null;
      stateRef.current.selectedLine = null;
      onSelected(null);
      s.isPanning = true;
      s.lastMouse = { x: e.clientX, y: e.clientY };
      return;
    }

    if (activeTool === 'delete') {
      s.isPanning = true;
      s.lastMouse = { x: e.clientX, y: e.clientY };
    }

    if (activeTool === 'breakline' || activeTool === 'boundary') {
      // Find snap target
      let snapPt = null;
      let minD = Infinity;
      for (const p of points) {
        const [px, py] = toCanvas(p.easting, p.northing);
        const d = Math.hypot(px - cx, py - cy);
        if (d < 15 && d < minD) { minD = d; snapPt = p; }
      }
      const worldPt = snapPt || { easting: we, northing: wn, elevation: 0 };

      if (!s.drawingLine) s.drawingLine = [];
      s.drawingLine.push(worldPt);
      forceUpdate(v => v + 1);
    }
  }, [activeTool, points]);

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const [we, wn] = toWorld(cx, cy);
    onMouseCoords({ e: we.toFixed(2), n: wn.toFixed(2) });

    const s = stateRef.current;
    if (s.isPanning && s.lastMouse) {
      const dx = e.clientX - s.lastMouse.x;
      const dy = e.clientY - s.lastMouse.y;
      s.panX += dx;
      s.panY += dy;
      s.lastMouse = { x: e.clientX, y: e.clientY };
      draw();
    }
  }, [draw, onMouseCoords]);

  const handleMouseUp = useCallback((e) => {
    stateRef.current.isPanning = false;
    stateRef.current.lastMouse = null;
  }, []);

  const handleDoubleClick = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const s = stateRef.current;

    // Double click in select mode = show point info
    if (activeTool === 'select') {
      let closest = null, minD = Infinity;
      for (const p of points) {
        const [px, py] = toCanvas(p.easting, p.northing);
        const d = Math.hypot(px - cx, py - cy);
        if (d < 16 && d < minD) { minD = d; closest = p; }
      }
      if (closest) {
        onSelected({ type: 'info', point: closest });
      }
      return;
    }

    if (!s.drawingLine || s.drawingLine.length < 2) {
      s.drawingLine = null;
      forceUpdate(v => v + 1);
      return;
    }
    if (activeTool === 'breakline') onBreaklineAdd([...s.drawingLine]);
    if (activeTool === 'boundary') onBoundarySet([...s.drawingLine]);
    s.drawingLine = null;
    forceUpdate(v => v + 1);
  }, [activeTool, points, onBreaklineAdd, onBoundarySet, onSelected]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const s = stateRef.current;
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    const newZoom = Math.max(0.0001, Math.min(100000, s.zoom * factor));
    s.panX = cx - (cx - s.panX) * (newZoom / s.zoom);
    s.panY = cy - (cy - s.panY) * (newZoom / s.zoom);
    s.zoom = newZoom;
    draw();
  }, [draw]);

  const cursorMap = { select: 'default', breakline: 'crosshair', boundary: 'crosshair', delete: 'not-allowed' };

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', cursor: cursorMap[activeTool] || 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
    />
  );
}
