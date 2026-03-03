import React, { useState } from 'react';

const btn = (extra = {}) => ({
  background: '#16213e',
  border: '1px solid #0f3460',
  color: '#e0e0e0',
  padding: '6px 14px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  ...extra,
});

export default function Toolbar({ projectName, view, onToggleView, onImportCSV, onBuildSurface, onExport, onSave, onOpen, onNew, pointCount, hasSurface }) {
  const [showExport, setShowExport] = useState(false);

  return (
    <div style={{ background: '#16213e', borderBottom: '1px solid #0f3460', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, WebkitAppRegion: 'drag', minHeight: 48 }}>
      {/* Spacer for macOS traffic lights */}
      <div style={{ width: 70, flexShrink: 0 }} />

      <span style={{ fontWeight: 700, fontSize: 15, color: '#e94560', marginRight: 8, WebkitAppRegion: 'no-drag' }}>
        ⛰ {projectName}
      </span>

      <div style={{ display: 'flex', gap: 6, WebkitAppRegion: 'no-drag' }}>
        <button style={btn()} onClick={onNew}>New</button>
        <button style={btn()} onClick={onOpen}>Open</button>
        <button style={btn()} onClick={onSave}>Save</button>
        <div style={{ width: 1, background: '#0f3460', margin: '0 4px' }} />
        <button style={btn({ background: '#0f3460' })} onClick={onImportCSV}>📥 Import CSV</button>
        <button
          style={btn({ background: pointCount >= 3 ? '#e94560' : '#555', cursor: pointCount >= 3 ? 'pointer' : 'not-allowed' })}
          onClick={onBuildSurface}
          disabled={pointCount < 3}
        >
          🔺 Build Surface
        </button>
        <div style={{ width: 1, background: '#0f3460', margin: '0 4px' }} />
        <div style={{ position: 'relative', WebkitAppRegion: 'no-drag' }}>
          <button style={btn()} onClick={() => setShowExport(v => !v)}>Export ▾</button>
          {showExport && (
            <div style={{ position: 'absolute', top: '100%', left: 0, background: '#16213e', border: '1px solid #0f3460', borderRadius: 6, zIndex: 100, minWidth: 160, marginTop: 4 }}>
              {[
                { key: 'csv', label: '📄 Export CSV (Points)' },
                { key: 'dxf', label: '📐 Export DXF (Linework)' },
                { key: 'ttm', label: '📡 Export TTM (Trimble)', disabled: !hasSurface },
                { key: 'landxml', label: '🗺 Export LandXML', disabled: !hasSurface },
              ].map(item => (
                <div
                  key={item.key}
                  onClick={() => { if (!item.disabled) { onExport(item.key); setShowExport(false); } }}
                  style={{ padding: '10px 14px', cursor: item.disabled ? 'not-allowed' : 'pointer', opacity: item.disabled ? 0.4 : 1, fontSize: 13, borderBottom: '1px solid #0f3460' }}
                  onMouseEnter={e => { if (!item.disabled) e.target.style.background = '#0f3460'; }}
                  onMouseLeave={e => e.target.style.background = 'transparent'}
                >
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 1, background: '#0f3460', margin: '0 4px' }} />
        <button
          style={btn({ background: view === '3d' ? '#e94560' : '#0f3460' })}
          onClick={onToggleView}
        >
          {view === '2d' ? '🧊 3D View' : '🗺 2D View'}
        </button>
      </div>
    </div>
  );
}
