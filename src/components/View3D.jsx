import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

export default function View3D({ points, surface, colorMode }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const [exaggeration, setExaggeration] = useState(1);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 1000000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);
    sceneRef.current = { scene, camera, renderer };

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(1, 2, 1);
    scene.add(dir);

    if (points.length > 0) {
      buildScene(scene, camera, points, surface, colorMode, exaggeration);
    }

    // Orbit controls (manual)
    let isDown = false, lastX = 0, lastY = 0, phi = Math.PI / 4, theta = 0, radius = 1000;
    const center = new THREE.Vector3(0, 0, 0);

    const updateCamera = () => {
      camera.position.set(
        center.x + radius * Math.sin(phi) * Math.sin(theta),
        center.y + radius * Math.cos(phi),
        center.z + radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(center);
    };
    updateCamera();

    const onDown = (e) => { isDown = true; lastX = e.clientX; lastY = e.clientY; };
    const onUp = () => { isDown = false; };
    const onMove = (e) => {
      if (!isDown) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      theta -= dx * 0.005;
      phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi + dy * 0.005));
      lastX = e.clientX; lastY = e.clientY;
      updateCamera();
    };
    const onWheel = (e) => {
      radius *= e.deltaY < 0 ? 0.9 : 1.1;
      updateCamera();
    };

    renderer.domElement.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    renderer.domElement.addEventListener('wheel', onWheel);

    // Animate
    let animId;
    const animate = () => { animId = requestAnimationFrame(animate); renderer.render(scene, camera); };
    animate();

    // Resize
    const ro = new ResizeObserver(() => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      renderer.domElement.removeEventListener('wheel', onWheel);
      ro.disconnect();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [points, surface, colorMode, exaggeration]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', bottom: 16, left: 16, background: 'rgba(22,33,62,0.9)', padding: '8px 14px', borderRadius: 8, border: '1px solid #0f3460' }}>
        <label style={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: 8 }}>
          Elevation Exaggeration: {exaggeration}x
          <input type="range" min="1" max="20" value={exaggeration} onChange={e => setExaggeration(+e.target.value)} style={{ width: 100 }} />
        </label>
      </div>
      <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(22,33,62,0.9)', padding: '8px 14px', borderRadius: 8, border: '1px solid #0f3460', fontSize: 12, color: '#888' }}>
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}

function buildScene(scene, camera, points, surface, colorMode, exaggeration) {
  // Clear old mesh
  scene.children.filter(c => c.isMesh || c.isPoints).forEach(c => scene.remove(c));

  if (!points.length) return;

  const es = points.map(p => p.easting);
  const ns = points.map(p => p.northing);
  const zs = points.map(p => p.elevation);
  const cx = (Math.min(...es) + Math.max(...es)) / 2;
  const cy = (Math.min(...ns) + Math.max(...ns)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const minZ = Math.min(...zs), maxZ = Math.max(...zs);

  if (surface && surface.length) {
    const geo = new THREE.BufferGeometry();
    const verts = [];
    const colors = [];

    surface.forEach(tri => {
      tri.forEach(idx => {
        const p = points[idx];
        verts.push(p.easting - cx, (p.elevation - cz) * exaggeration, -(p.northing - cy));
        const t = maxZ > minZ ? (p.elevation - minZ) / (maxZ - minZ) : 0.5;
        if (colorMode === 'elevation') {
          colors.push(...elevColor(t));
        } else {
          colors.push(0.3, 0.6, 1.0);
        }
      });
    });

    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    // Wireframe
    const wf = new THREE.WireframeGeometry(geo);
    const wfMat = new THREE.LineBasicMaterial({ color: 0x4a9eff, opacity: 0.2, transparent: true });
    scene.add(new THREE.LineSegments(wf, wfMat));
  }

  // Points
  const ptGeo = new THREE.BufferGeometry();
  const ptVerts = points.flatMap(p => [p.easting - cx, (p.elevation - cz) * exaggeration, -(p.northing - cy)]);
  ptGeo.setAttribute('position', new THREE.Float32BufferAttribute(ptVerts, 3));
  scene.add(new THREE.Points(ptGeo, new THREE.PointsMaterial({ color: 0xe94560, size: 3 })));

  // Position camera
  const extent = Math.max(Math.max(...es) - Math.min(...es), Math.max(...ns) - Math.min(...ns));
  camera.position.set(0, extent * 0.8, extent);
  camera.lookAt(0, 0, 0);
}

function elevColor(t) {
  if (t < 0.25) { const s = t / 0.25; return [lerp(0, 0, s) / 255, lerp(100, 200, s) / 255, lerp(200, 255, s) / 255]; }
  if (t < 0.5) { const s = (t - 0.25) / 0.25; return [lerp(0, 50, s) / 255, lerp(200, 220, s) / 255, lerp(255, 50, s) / 255]; }
  if (t < 0.75) { const s = (t - 0.5) / 0.25; return [lerp(50, 230, s) / 255, lerp(220, 220, s) / 255, lerp(50, 0, s) / 255]; }
  const s = (t - 0.75) / 0.25; return [lerp(230, 220, s) / 255, lerp(220, 30, s) / 255, 0];
}
function lerp(a, b, t) { return a + (b - a) * t; }
