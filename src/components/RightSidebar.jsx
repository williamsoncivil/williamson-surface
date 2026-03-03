import React from 'react';

export default function RightSidebar({ selected, stats, problems }) {
  return (
    <div style={{ width: 200, background: '#16213e', borderLeft: '1px solid #0f3460', padding: 12, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Surface Stats</div>
        {stats ? (
          <div style={{ fontSize: 12 }}>
            <StatRow label="Min Elevation" value={stats.minElev.toFixed(2)} />
            <StatRow label="Max Elevation" value={stats.maxElev.toFixed(2)} />
            <StatRow label="Avg Elevation" value={stats.avgElev.toFixed(2)} />
            <StatRow label="Relief" value={(stats.maxElev - stats.minElev).toFixed(2)} />
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#555' }}>Build a surface to see stats</div>
        )}
      </div>

      {problems && problems.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#e94560', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            ⚠ {problems.length} Problem Triangle{problems.length > 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.5 }}>
            {problems.slice(0, 10).map((p, i) => (
              <div key={i} style={{ borderBottom: '1px solid #0f3460', padding: '4px 0' }}>
                Triangle #{p.index}: {p.reason}
              </div>
            ))}
            {problems.length > 10 && <div style={{ color: '#666' }}>+{problems.length - 10} more</div>}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 8, lineHeight: 1.5 }}>
            Tip: Add breaklines along edges and grade changes to fix long thin triangles.
          </div>
        </div>
      )}

      {selected && (
        <div>
          <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Selected</div>
          <pre style={{ fontSize: 11, color: '#e0e0e0', whiteSpace: 'pre-wrap' }}>{JSON.stringify(selected, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #0f3460', padding: '5px 0' }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ color: '#e0e0e0', fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}
