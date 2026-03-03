import React from 'react';

const tools = [
  { id: 'select', label: '↖ Select', hint: 'Click to select objects' },
  { id: 'breakline', label: '〰 Breakline', hint: 'Click to add vertices, double-click to finish' },
  { id: 'boundary', label: '⬡ Boundary', hint: 'Draw the surface boundary' },
  { id: 'delete', label: '✕ Delete', hint: 'Click to delete objects' },
];

export default function LeftSidebar({ activeTool, onToolChange, showTIN, onToggleTIN, showLabels, onToggleLabels, colorMode, onColorMode, pointCount, breaklineCount }) {
  return (
    <div style={{ width: 180, background: '#16213e', borderRight: '1px solid #0f3460', display: 'flex', flexDirection: 'column', padding: 12, gap: 16, overflow: 'auto' }}>
      {/* Tools */}
      <div>
        <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Tools</div>
        {tools.map(tool => (
          <button
            key={tool.id}
            title={tool.hint}
            onClick={() => onToolChange(tool.id)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 10px', marginBottom: 4,
              background: activeTool === tool.id ? '#e94560' : '#1a1a2e',
              border: '1px solid ' + (activeTool === tool.id ? '#e94560' : '#0f3460'),
              color: '#e0e0e0', borderRadius: 6, cursor: 'pointer', fontSize: 13,
            }}
          >
            {tool.label}
          </button>
        ))}
      </div>

      {/* Layers */}
      <div>
        <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Layers</div>
        <LayerRow label={`Points (${pointCount})`} visible={true} />
        <LayerRow label={`Breaklines (${breaklineCount})`} visible={true} />
        <LayerRow
          label="TIN Surface"
          visible={showTIN}
          onToggle={onToggleTIN}
        />
        <LayerRow
          label="Point Labels"
          visible={showLabels}
          onToggle={onToggleLabels}
        />
      </div>

      {/* Color Mode */}
      <div>
        <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Surface Color</div>
        {['none', 'elevation', 'slope'].map(mode => (
          <button
            key={mode}
            onClick={() => onColorMode(mode)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '6px 10px', marginBottom: 4,
              background: colorMode === mode ? '#0f3460' : 'transparent',
              border: '1px solid ' + (colorMode === mode ? '#e94560' : '#0f3460'),
              color: colorMode === mode ? '#fff' : '#aaa',
              borderRadius: 6, cursor: 'pointer', fontSize: 12,
            }}
          >
            {mode === 'none' ? '⬜ None' : mode === 'elevation' ? '🌈 By Elevation' : '📐 By Slope'}
          </button>
        ))}
      </div>
    </div>
  );
}

function LayerRow({ label, visible, onToggle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #0f3460' }}>
      <span style={{ fontSize: 12, color: visible ? '#e0e0e0' : '#666' }}>{label}</span>
      {onToggle && (
        <button
          onClick={onToggle}
          style={{ background: 'none', border: 'none', color: visible ? '#e94560' : '#555', cursor: 'pointer', fontSize: 14, padding: 0 }}
        >
          {visible ? '👁' : '○'}
        </button>
      )}
    </div>
  );
}
