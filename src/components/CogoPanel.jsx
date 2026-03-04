import React, { useState } from 'react';
import { inverse, pointAtAngleDistance, polygonArea, offsetLine, closureCheck, formatBearing, formatSlope, nextPointId } from '../utils/cogo.js';

const input = (extra = {}) => ({
  background: '#1a1a2e',
  border: '1px solid #0f3460',
  color: '#e0e0e0',
  padding: '5px 8px',
  borderRadius: 4,
  fontSize: 12,
  width: '100%',
  marginTop: 2,
  ...extra,
});

const label = { fontSize: 11, color: '#888', marginTop: 6, display: 'block' };
const btn = (color = '#e94560') => ({
  background: color,
  border: 'none',
  color: '#fff',
  padding: '7px 10px',
  borderRadius: 5,
  cursor: 'pointer',
  fontSize: 12,
  width: '100%',
  marginTop: 8,
  fontWeight: 600,
});
const section = { borderBottom: '1px solid #0f3460', paddingBottom: 12, marginBottom: 12 };
const result = { background: '#0f3460', borderRadius: 6, padding: '8px 10px', fontSize: 12, marginTop: 8 };
const resultRow = { display: 'flex', justifyContent: 'space-between', padding: '2px 0' };

export default function CogoPanel({ points, lines, onAddPoint, onAddLine, onDeletePoint, onDeleteLine, onReplacePoints }) {
  const [activeTab, setActiveTab] = useState('create');
  const [traverseState, setTraverseState] = useState({
    startId: '', dirId: '', turnAngle: '', distance: '', elevMode: 'same', elevValue: '',
    chain: [], // array of placed points in this traverse session
    refBearing: null,
    lastPt: null,
  });
  const [inverseState, setInverseState] = useState({ p1Id: '', p2Id: '', result: null });
  const [createState, setCreateState] = useState({ id: '', easting: '', northing: '', elevation: '' });
  const [offsetState, setOffsetState] = useState({ lineIdx: '', horizDist: '', elevMode: 'same', elevValue: '', side: 'right' });
  const [areaState, setAreaState] = useState({ pointIds: '', result: null });
  const [editState, setEditState] = useState({ id: '', easting: '', northing: '', elevation: '' });

  const findPt = id => points.find(p => p.id === id);

  // ---- CREATE POINT ----
  const handleCreate = () => {
    const id = createState.id || nextPointId(points);
    const pt = {
      id,
      easting: parseFloat(createState.easting),
      northing: parseFloat(createState.northing),
      elevation: parseFloat(createState.elevation) || 0,
      description: 'COGO',
    };
    if (isNaN(pt.easting) || isNaN(pt.northing)) return alert('Enter valid Easting and Northing');
    onAddPoint(pt);
    setCreateState({ id: '', easting: '', northing: '', elevation: '' });
  };

  // ---- INVERSE ----
  const handleInverse = () => {
    const p1 = findPt(inverseState.p1Id);
    const p2 = findPt(inverseState.p2Id);
    if (!p1 || !p2) return alert('Point not found');
    setInverseState(s => ({ ...s, result: inverse(p1, p2) }));
  };

  // ---- TRAVERSE ----
  const handleTraverseStart = () => {
    const startPt = findPt(traverseState.startId);
    const dirPt = findPt(traverseState.dirId);
    if (!startPt || !dirPt) return alert('Select valid start and direction points');
    const inv = inverse(startPt, dirPt);
    setTraverseState(s => ({
      ...s,
      refBearing: inv.bearing,
      lastPt: startPt,
      chain: [startPt],
    }));
  };

  const handleTraverseAdd = () => {
    const { lastPt, refBearing, chain } = traverseState;
    if (lastPt === null || refBearing === null) return alert('Set start and direction points first');
    const turn = parseFloat(traverseState.turnAngle) || 0;
    const dist = parseFloat(traverseState.distance);
    if (isNaN(dist) || dist <= 0) return alert('Enter a valid distance');

    let elevOption = { mode: 'same', value: 0 };
    if (traverseState.elevMode === 'fixed') elevOption = { mode: 'fixed', value: parseFloat(traverseState.elevValue) || 0 };
    else if (traverseState.elevMode === 'slope') elevOption = { mode: 'slope', value: parseFloat(traverseState.elevValue) || 0 };
    else if (traverseState.elevMode === 'manual') elevOption = { mode: 'manual', value: parseFloat(traverseState.elevValue) || 0 };
    else elevOption = { mode: 'fixed', value: 0 }; // same elevation

    const newPtData = pointAtAngleDistance(lastPt, refBearing, turn, dist, elevOption);
    const newId = nextPointId([...points, ...chain.slice(1)]);
    const newPt = { id: newId, easting: newPtData.easting, northing: newPtData.northing, elevation: newPtData.elevation, description: 'TRAV' };

    onAddPoint(newPt);
    if (chain.length >= 1) {
      onAddLine([lastPt, newPt]);
    }

    setTraverseState(s => ({
      ...s,
      refBearing: newPtData.bearing,
      lastPt: newPt,
      chain: [...s.chain, newPt],
      turnAngle: '',
      distance: '',
      elevValue: '',
    }));
  };

  const handleClosureCheck = () => {
    const { chain, lastPt } = traverseState;
    if (chain.length < 2) return;
    const startPt = chain[0];
    const cl = closureCheck(startPt, lastPt);
    alert(`Closure: ${cl.horizDist.toFixed(4)} ft\nBearing to close: ${formatBearing(cl.bearing)}\nElevation difference: ${cl.dZ.toFixed(4)} ft`);
  };

  const handleTraverseReset = () => {
    setTraverseState({ startId: '', dirId: '', turnAngle: '', distance: '', elevMode: 'same', elevValue: '', chain: [], refBearing: null, lastPt: null });
  };

  // ---- LINE OFFSET ----
  const handleOffset = () => {
    const idx = parseInt(offsetState.lineIdx);
    if (isNaN(idx) || !lines[idx]) return alert('Select a valid line number');
    const line = lines[idx];
    const dist = parseFloat(offsetState.horizDist) * (offsetState.side === 'left' ? -1 : 1);
    let elevOption = { mode: 'same', value: 0 };
    if (offsetState.elevMode === 'fixed') elevOption = { mode: 'fixed', value: parseFloat(offsetState.elevValue) || 0 };
    else if (offsetState.elevMode === 'slope') elevOption = { mode: 'slope', value: parseFloat(offsetState.elevValue) || 0 };

    const newLinePts = offsetLine(line, dist, elevOption);
    const newPts = newLinePts.map((p, i) => ({
      id: nextPointId(points) + '_off' + i,
      easting: p.easting,
      northing: p.northing,
      elevation: p.elevation,
      description: 'OFFSET',
    }));
    newPts.forEach(p => onAddPoint(p));
    onAddLine(newPts);
  };

  // ---- AREA ----
  const handleArea = () => {
    const ids = areaState.pointIds.split(',').map(s => s.trim());
    const pts = ids.map(id => findPt(id)).filter(Boolean);
    if (pts.length < 3) return alert('Need at least 3 valid point IDs');
    const sqFt = polygonArea(pts);
    const acres = sqFt / 43560;
    setAreaState(s => ({ ...s, result: { sqFt, acres } }));
  };

  // ---- EDIT POINT ----
  const handleEditLoad = () => {
    const pt = findPt(editState.id);
    if (!pt) return alert('Point not found');
    setEditState({ id: pt.id, easting: pt.easting, northing: pt.northing, elevation: pt.elevation });
  };
  const handleEditSave = () => {
    const updated = points.map(p => p.id === editState.id ? {
      ...p,
      easting: parseFloat(editState.easting),
      northing: parseFloat(editState.northing),
      elevation: parseFloat(editState.elevation),
    } : p);
    onReplacePoints(updated);
  };
  const handleDeletePoint = () => {
    if (!editState.id) return;
    if (confirm(`Delete point ${editState.id}?`)) {
      onDeletePoint(editState.id);
      setEditState({ id: '', easting: '', northing: '', elevation: '' });
    }
  };

  const tabs = ['create', 'traverse', 'inverse', 'offset', 'area', 'edit'];
  const tabLabels = { create: '+ Point', traverse: 'Traverse', inverse: 'Inverse', offset: 'Offset', area: 'Area', edit: 'Edit' };

  return (
    <div style={{ width: 220, background: '#16213e', borderLeft: '1px solid #0f3460', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '1px solid #0f3460', gap: 1, padding: 4 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            background: activeTab === t ? '#e94560' : 'transparent',
            border: 'none', color: activeTab === t ? '#fff' : '#888',
            padding: '4px 7px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600,
          }}>{tabLabels[t]}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>

        {/* CREATE POINT */}
        {activeTab === 'create' && (
          <div>
            <div style={{ fontSize: 12, color: '#e94560', fontWeight: 700, marginBottom: 8 }}>Create Point</div>
            <span style={label}>Point ID (optional)</span>
            <input style={input()} value={createState.id} onChange={e => setCreateState(s => ({ ...s, id: e.target.value }))} placeholder="auto" />
            <span style={label}>Easting *</span>
            <input style={input()} value={createState.easting} onChange={e => setCreateState(s => ({ ...s, easting: e.target.value }))} placeholder="0.00" type="number" />
            <span style={label}>Northing *</span>
            <input style={input()} value={createState.northing} onChange={e => setCreateState(s => ({ ...s, northing: e.target.value }))} placeholder="0.00" type="number" />
            <span style={label}>Elevation</span>
            <input style={input()} value={createState.elevation} onChange={e => setCreateState(s => ({ ...s, elevation: e.target.value }))} placeholder="0.00" type="number" />
            <button style={btn()} onClick={handleCreate}>Place Point</button>
          </div>
        )}

        {/* TRAVERSE */}
        {activeTab === 'traverse' && (
          <div>
            <div style={{ fontSize: 12, color: '#e94560', fontWeight: 700, marginBottom: 8 }}>Traverse</div>
            {traverseState.chain.length === 0 ? (
              <>
                <span style={label}>Start Point ID</span>
                <input style={input()} value={traverseState.startId} onChange={e => setTraverseState(s => ({ ...s, startId: e.target.value }))} placeholder="e.g. 1" />
                <span style={label}>Direction Point ID</span>
                <input style={input()} value={traverseState.dirId} onChange={e => setTraverseState(s => ({ ...s, dirId: e.target.value }))} placeholder="e.g. 2" />
                <button style={btn()} onClick={handleTraverseStart}>Set Start & Direction</button>
              </>
            ) : (
              <>
                <div style={{ ...result, marginBottom: 8 }}>
                  <div style={{ color: '#aaa', fontSize: 11 }}>Current position: Pt {traverseState.lastPt?.id}</div>
                  <div style={{ color: '#aaa', fontSize: 11 }}>Ref bearing: {formatBearing(traverseState.refBearing)}</div>
                  <div style={{ color: '#aaa', fontSize: 11 }}>Points placed: {traverseState.chain.length - 1}</div>
                </div>
                <span style={label}>Turn Angle (°) — right=+, left=-</span>
                <input style={input()} value={traverseState.turnAngle} onChange={e => setTraverseState(s => ({ ...s, turnAngle: e.target.value }))} placeholder="e.g. 90 or -45" type="number" />
                <span style={label}>Distance (ft)</span>
                <input style={input()} value={traverseState.distance} onChange={e => setTraverseState(s => ({ ...s, distance: e.target.value }))} placeholder="0.00" type="number" />
                <span style={label}>Elevation</span>
                <select style={input()} value={traverseState.elevMode} onChange={e => setTraverseState(s => ({ ...s, elevMode: e.target.value }))}>
                  <option value="same">Same as last point</option>
                  <option value="fixed">Add fixed amount</option>
                  <option value="slope">Apply slope %</option>
                  <option value="manual">Enter manually</option>
                </select>
                {traverseState.elevMode !== 'same' && (
                  <input style={input({ marginTop: 4 })} value={traverseState.elevValue} onChange={e => setTraverseState(s => ({ ...s, elevValue: e.target.value }))}
                    placeholder={traverseState.elevMode === 'slope' ? '% grade e.g. -2' : traverseState.elevMode === 'manual' ? 'elevation' : '± ft'} type="number" />
                )}
                <button style={btn()} onClick={handleTraverseAdd}>Place Point →</button>
                <button style={btn('#0f3460')} onClick={handleClosureCheck}>Check Closure</button>
                <button style={btn('#555')} onClick={handleTraverseReset}>Reset</button>
              </>
            )}
          </div>
        )}

        {/* INVERSE */}
        {activeTab === 'inverse' && (
          <div>
            <div style={{ fontSize: 12, color: '#e94560', fontWeight: 700, marginBottom: 8 }}>Inverse</div>
            <span style={label}>From Point ID</span>
            <input style={input()} value={inverseState.p1Id} onChange={e => setInverseState(s => ({ ...s, p1Id: e.target.value, result: null }))} placeholder="e.g. 1" />
            <span style={label}>To Point ID</span>
            <input style={input()} value={inverseState.p2Id} onChange={e => setInverseState(s => ({ ...s, p2Id: e.target.value, result: null }))} placeholder="e.g. 2" />
            <button style={btn()} onClick={handleInverse}>Calculate</button>
            {inverseState.result && (
              <div style={result}>
                <div style={resultRow}><span style={{ color: '#888' }}>Horiz Dist</span><span>{inverseState.result.horizDist.toFixed(3)} ft</span></div>
                <div style={resultRow}><span style={{ color: '#888' }}>Slope Dist</span><span>{inverseState.result.slopeDist.toFixed(3)} ft</span></div>
                <div style={resultRow}><span style={{ color: '#888' }}>Bearing</span><span>{formatBearing(inverseState.result.bearing)}</span></div>
                <div style={resultRow}><span style={{ color: '#888' }}>Slope</span><span>{formatSlope(inverseState.result.slopePct)}</span></div>
                <div style={resultRow}><span style={{ color: '#888' }}>Slope Deg</span><span>{inverseState.result.slopeDeg.toFixed(2)}°</span></div>
                <div style={resultRow}><span style={{ color: '#888' }}>ΔElev</span><span>{inverseState.result.dZ.toFixed(3)} ft</span></div>
              </div>
            )}
          </div>
        )}

        {/* OFFSET */}
        {activeTab === 'offset' && (
          <div>
            <div style={{ fontSize: 12, color: '#e94560', fontWeight: 700, marginBottom: 8 }}>Line Offset</div>
            <span style={label}>Line # (0-based index)</span>
            <input style={input()} value={offsetState.lineIdx} onChange={e => setOffsetState(s => ({ ...s, lineIdx: e.target.value }))} placeholder="0" type="number" />
            <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
              {lines.map((l, i) => <div key={i}>Line {i}: {l.length} pts</div>)}
            </div>
            <span style={label}>Horizontal Distance (ft)</span>
            <input style={input()} value={offsetState.horizDist} onChange={e => setOffsetState(s => ({ ...s, horizDist: e.target.value }))} placeholder="0.00" type="number" />
            <span style={label}>Side</span>
            <select style={input()} value={offsetState.side} onChange={e => setOffsetState(s => ({ ...s, side: e.target.value }))}>
              <option value="right">Right</option>
              <option value="left">Left</option>
            </select>
            <span style={label}>Elevation</span>
            <select style={input()} value={offsetState.elevMode} onChange={e => setOffsetState(s => ({ ...s, elevMode: e.target.value }))}>
              <option value="same">Same as original</option>
              <option value="fixed">Add fixed amount</option>
              <option value="slope">Apply slope %</option>
            </select>
            {offsetState.elevMode !== 'same' && (
              <input style={input({ marginTop: 4 })} value={offsetState.elevValue} onChange={e => setOffsetState(s => ({ ...s, elevValue: e.target.value }))}
                placeholder={offsetState.elevMode === 'slope' ? '% e.g. -2' : '± ft'} type="number" />
            )}
            <button style={btn()} onClick={handleOffset}>Create Offset Line</button>
          </div>
        )}

        {/* AREA */}
        {activeTab === 'area' && (
          <div>
            <div style={{ fontSize: 12, color: '#e94560', fontWeight: 700, marginBottom: 8 }}>Area Calculation</div>
            <span style={label}>Point IDs (comma separated, in order)</span>
            <input style={input()} value={areaState.pointIds} onChange={e => setAreaState(s => ({ ...s, pointIds: e.target.value, result: null }))} placeholder="e.g. 1,2,3,4" />
            <button style={btn()} onClick={handleArea}>Calculate Area</button>
            {areaState.result && (
              <div style={result}>
                <div style={resultRow}><span style={{ color: '#888' }}>Square Feet</span><span>{areaState.result.sqFt.toFixed(1)}</span></div>
                <div style={resultRow}><span style={{ color: '#888' }}>Acres</span><span>{areaState.result.acres.toFixed(4)}</span></div>
              </div>
            )}
          </div>
        )}

        {/* EDIT / DELETE */}
        {activeTab === 'edit' && (
          <div>
            <div style={{ fontSize: 12, color: '#e94560', fontWeight: 700, marginBottom: 8 }}>Edit / Delete Point</div>
            <span style={label}>Point ID</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <input style={input({ flex: 1 })} value={editState.id} onChange={e => setEditState(s => ({ ...s, id: e.target.value }))} placeholder="e.g. 5" />
              <button onClick={handleEditLoad} style={{ ...btn('#0f3460'), width: 'auto', padding: '5px 8px', marginTop: 2 }}>Load</button>
            </div>
            <span style={label}>Easting</span>
            <input style={input()} value={editState.easting} onChange={e => setEditState(s => ({ ...s, easting: e.target.value }))} type="number" />
            <span style={label}>Northing</span>
            <input style={input()} value={editState.northing} onChange={e => setEditState(s => ({ ...s, northing: e.target.value }))} type="number" />
            <span style={label}>Elevation</span>
            <input style={input()} value={editState.elevation} onChange={e => setEditState(s => ({ ...s, elevation: e.target.value }))} type="number" />
            <button style={btn('#0f3460')} onClick={handleEditSave}>Save Changes</button>
            <button style={btn('#c0392b')} onClick={handleDeletePoint}>Delete Point</button>
          </div>
        )}

      </div>
    </div>
  );
}
