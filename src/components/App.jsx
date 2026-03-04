import React, { useState, useCallback, useEffect } from 'react';
import Toolbar from './Toolbar.jsx';
import LeftSidebar from './LeftSidebar.jsx';
import Canvas2D from './Canvas2D.jsx';
import View3D from './View3D.jsx';
import RightSidebar from './RightSidebar.jsx';
import StatusBar from './StatusBar.jsx';
import CogoPanel from './CogoPanel.jsx';
import { parseCSV, pointsToCSV } from '../utils/csvParser.js';
import { buildTIN, analyzeTriangles, getSurfaceStats } from '../utils/tinBuilder.js';
import { exportDXF, exportTTM, exportLandXML } from '../utils/exporters.js';

const defaultProject = {
  name: 'Untitled Project',
  points: [],
  breaklines: [],
  boundary: [],
  surface: null,
  problems: [],
};

export default function App() {
  const [project, setProject] = useState(defaultProject);
  const [activeTool, setActiveTool] = useState('select');
  const [view, setView] = useState('2d'); // '2d' | '3d'
  const [colorMode, setColorMode] = useState('elevation'); // 'elevation' | 'slope' | 'none'
  const [showTIN, setShowTIN] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [selected, setSelected] = useState(null);
  const [clickedPoint, setClickedPoint] = useState(null);

  const handlePointSelect = useCallback((data) => {
    if (!data) { setSelected(null); setClickedPoint(null); return; }
    if (data.type === 'select') { setSelected(data.point); setClickedPoint(data.point); }
    if (data.type === 'info') { setSelected(data.point); setClickedPoint(data.point); }
  }, []);
  const [mouseCoords, setMouseCoords] = useState({ e: 0, n: 0 });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onMenu((event) => {
        if (event === 'importCSV') handleImportCSV();
        if (event === 'save') handleSaveProject();
        if (event === 'open') handleOpenProject();
        if (event === 'new') setProject(defaultProject);
      });
    }
  }, []);

  const handleImportCSV = useCallback(async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.openFile([{ name: 'CSV Files', extensions: ['csv', 'txt'] }]);
    if (result.canceled || !result.filePaths.length) return;
    const text = await window.electronAPI.readFile(result.filePaths[0]);
    const newPoints = parseCSV(text);
    setProject(p => ({ ...p, points: [...p.points, ...newPoints], surface: null }));
  }, []);

  const handleBuildSurface = useCallback(() => {
    if (project.points.length < 3) return;
    const { triangles, points } = buildTIN(project.points);
    const problems = analyzeTriangles(triangles, points);
    const surfaceStats = getSurfaceStats(points);
    setStats(surfaceStats);
    setProject(p => ({ ...p, surface: triangles, problems }));
  }, [project.points]);

  const handleSaveProject = useCallback(async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.saveFile({
      defaultPath: `${project.name}.wsproject`,
      filters: [{ name: 'Williamson Surface Project', extensions: ['wsproject'] }],
    });
    if (result.canceled) return;
    await window.electronAPI.writeFile(result.filePath, JSON.stringify(project, null, 2));
  }, [project]);

  const handleOpenProject = useCallback(async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.openFile([{ name: 'Williamson Surface Project', extensions: ['wsproject'] }]);
    if (result.canceled || !result.filePaths.length) return;
    const text = await window.electronAPI.readFile(result.filePaths[0]);
    setProject(JSON.parse(text));
  }, []);

  const handleExport = useCallback(async (format) => {
    if (!window.electronAPI) return;
    if (format === 'csv') {
      const result = await window.electronAPI.saveFile({ defaultPath: 'points.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] });
      if (!result.canceled) await window.electronAPI.writeFile(result.filePath, pointsToCSV(project.points));
    } else if (format === 'dxf') {
      const result = await window.electronAPI.saveFile({ defaultPath: 'linework.dxf', filters: [{ name: 'DXF', extensions: ['dxf'] }] });
      if (!result.canceled) await window.electronAPI.writeFile(result.filePath, exportDXF(project.breaklines, project.boundary, project.points));
    } else if (format === 'ttm') {
      if (!project.surface) { alert('Build the surface first.'); return; }
      const result = await window.electronAPI.saveFile({ defaultPath: 'surface.ttm', filters: [{ name: 'Trimble TTM', extensions: ['ttm'] }] });
      if (!result.canceled) {
        const buf = exportTTM(project.points, project.surface);
        await window.electronAPI.writeBinaryFile(result.filePath, buf);
      }
    } else if (format === 'landxml') {
      if (!project.surface) { alert('Build the surface first.'); return; }
      const result = await window.electronAPI.saveFile({ defaultPath: 'surface.xml', filters: [{ name: 'LandXML', extensions: ['xml'] }] });
      if (!result.canceled) await window.electronAPI.writeFile(result.filePath, exportLandXML(project.points, project.surface));
    }
  }, [project]);

  const addBreaklinePoint = useCallback((point) => {
    // Used by Canvas2D when breakline tool is active
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a2e' }}>
      <Toolbar
        projectName={project.name}
        view={view}
        onToggleView={() => setView(v => v === '2d' ? '3d' : '2d')}
        onImportCSV={handleImportCSV}
        onBuildSurface={handleBuildSurface}
        onExport={handleExport}
        onSave={handleSaveProject}
        onOpen={handleOpenProject}
        onNew={() => setProject(defaultProject)}
        pointCount={project.points.length}
        hasSurface={!!project.surface}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <LeftSidebar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          showTIN={showTIN}
          onToggleTIN={() => setShowTIN(v => !v)}
          showLabels={showLabels}
          onToggleLabels={() => setShowLabels(v => !v)}
          colorMode={colorMode}
          onColorMode={setColorMode}
          pointCount={project.points.length}
          breaklineCount={project.breaklines.length}
        />
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {view === '2d' ? (
            <Canvas2D
              points={project.points}
              breaklines={project.breaklines}
              boundary={project.boundary}
              surface={project.surface}
              problems={project.problems}
              activeTool={activeTool}
              showTIN={showTIN}
              showLabels={showLabels}
              colorMode={colorMode}
              onMouseCoords={setMouseCoords}
              onSelected={handlePointSelect}
              onBreaklineAdd={(bl) => setProject(p => ({ ...p, breaklines: [...p.breaklines, bl] }))}
              onBoundarySet={(b) => setProject(p => ({ ...p, boundary: b }))}
            />
          ) : (
            <View3D
              points={project.points}
              surface={project.surface}
              colorMode={colorMode}
            />
          )}
        </div>
        <RightSidebar selected={selected?.point || selected} stats={stats} problems={project.problems} />
        <CogoPanel
          points={project.points}
          lines={project.breaklines}
          clickedPoint={clickedPoint}
          onAddPoint={(pt) => setProject(p => ({ ...p, points: [...p.points, pt], surface: null }))}
          onAddLine={(line) => setProject(p => ({ ...p, breaklines: [...p.breaklines, line] }))}
          onDeletePoint={(id) => setProject(p => ({ ...p, points: p.points.filter(pt => pt.id !== id), surface: null }))}
          onDeleteLine={(idx) => setProject(p => ({ ...p, breaklines: p.breaklines.filter((_, i) => i !== idx) }))}
          onReplacePoints={(pts) => setProject(p => ({ ...p, points: pts, surface: null }))}
        />
      </div>
      <StatusBar
        mouseCoords={mouseCoords}
        pointCount={project.points.length}
        triCount={project.surface?.length || 0}
        problemCount={project.problems.length}
        activeTool={activeTool}
      />
    </div>
  );
}
