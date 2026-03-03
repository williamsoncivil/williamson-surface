import React from 'react';

export default function StatusBar({ mouseCoords, pointCount, triCount, problemCount, activeTool }) {
  const toolHints = {
    select: 'Click to select · Drag to pan',
    breakline: 'Click to add vertices · Double-click to finish breakline',
    boundary: 'Click to add vertices · Double-click to close boundary',
    delete: 'Click to delete',
  };

  return (
    <div style={{ background: '#0f3460', borderTop: '1px solid #1a1a2e', padding: '4px 14px', display: 'flex', alignItems: 'center', gap: 24, fontSize: 11, color: '#aaa', height: 28 }}>
      <span>E: {mouseCoords.e} | N: {mouseCoords.n}</span>
      <span>Points: {pointCount}</span>
      <span>Triangles: {triCount}</span>
      {problemCount > 0 && <span style={{ color: '#e94560' }}>⚠ {problemCount} problem triangles</span>}
      <span style={{ marginLeft: 'auto', color: '#e94560' }}>{toolHints[activeTool] || ''}</span>
    </div>
  );
}
