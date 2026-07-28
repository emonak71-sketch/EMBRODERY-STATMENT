import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Party, TransactionEntry } from '../types';
import { Eye, RotateCw, Sparkles, Box, BarChart3, Layers, Maximize2, RefreshCw } from 'lucide-react';

interface Ledger3DProps {
  parties: Party[];
  transactions: TransactionEntry[];
  selectedPartyId: string | null;
  onSelectParty: (partyId: string) => void;
  onOpenNewTransactionModal: (partyName?: string) => void;
}

export const Ledger3DVisualizer: React.FC<Ledger3DProps> = ({
  parties,
  transactions,
  selectedPartyId,
  onSelectParty,
  onOpenNewTransactionModal,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredParty, setHoveredParty] = useState<Party | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [viewStyle, setViewStyle] = useState<'3d-pillars' | '3d-orbit' | '3d-memos'>('3d-pillars');

  // Three.js internal refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshesGroupRef = useRef<THREE.Group | null>(null);
  const particlesMeshRef = useRef<THREE.Points | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rotationGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 500;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Dark slate elegant background
    scene.fog = new THREE.FogExp2(0x0f172a, 0.018);
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 18, 32);
    camera.lookAt(0, 4, 0);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5ea, 1.2);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x3b82f6, 2, 50);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // 5. Grid / Floor reflection setup
    const gridHelper = new THREE.GridHelper(60, 30, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Circular base glow ring
    const ringGeo = new THREE.RingGeometry(1, 25, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide, transparent: true, opacity: 0.08 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.01;
    scene.add(ringMesh);

    // 6. Master rotation group
    const rotationGroup = new THREE.Group();
    scene.add(rotationGroup);
    rotationGroupRef.current = rotationGroup;

    const meshesGroup = new THREE.Group();
    rotationGroup.add(meshesGroup);
    meshesGroupRef.current = meshesGroup;

    // 7. Floating particles (3D currency/gold dots)
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 50;
      particlePositions[i + 1] = Math.random() * 25;
      particlePositions[i + 2] = (Math.random() - 0.5) * 50;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.4,
      transparent: true,
      opacity: 0.6,
    });
    const particlesMesh = new THREE.Points(particleGeo, particleMat);
    scene.add(particlesMesh);
    particlesMeshRef.current = particlesMesh;

    // Resize handling via ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (!entry.contentBoxSize) continue;
        const newWidth = entry.contentRect.width;
        const newHeight = entry.contentRect.height || 500;
        if (rendererRef.current && cameraRef.current) {
          cameraRef.current.aspect = newWidth / newHeight;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newWidth, newHeight);
        }
      }
    });
    resizeObserver.observe(mountRef.current);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (rotationGroupRef.current && autoRotate && !isDraggingRef.current) {
        rotationGroupRef.current.rotation.y += 0.003;
      }

      if (particlesMeshRef.current) {
        particlesMeshRef.current.rotation.y += 0.0008;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update 3D Meshes when parties data, selected party, or view style changes
  useEffect(() => {
    if (!meshesGroupRef.current) return;
    const group = meshesGroupRef.current;

    // Clear previous children
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }

    if (parties.length === 0) return;

    const maxBalance = Math.max(...parties.map((p) => p.current_balance), 10000);
    const radius = Math.min(14, 4 + parties.length * 2.2);

    parties.forEach((party, index) => {
      const angle = (index / parties.length) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Height proportional to balance
      const heightFactor = party.current_balance / maxBalance;
      const columnHeight = Math.max(1.2, heightFactor * 12);

      const isSelected = party.id === selectedPartyId;

      // Color scheme based on balance depth
      let colorHex = 0x10b981; // Green for low balance
      if (party.current_balance > 100000) {
        colorHex = 0xef4444; // Red for heavy debt
      } else if (party.current_balance > 40000) {
        colorHex = 0xf59e0b; // Gold for medium
      }

      if (isSelected) {
        colorHex = 0x3b82f6; // Bright blue for selected
      }

      // Geometry selection
      let geo: THREE.BufferGeometry;
      if (viewStyle === '3d-pillars') {
        geo = new THREE.CylinderGeometry(1.2, 1.4, columnHeight, 16);
      } else if (viewStyle === '3d-memos') {
        geo = new THREE.BoxGeometry(2.2, columnHeight, 2.2);
      } else {
        geo = new THREE.SphereGeometry(1.5 + heightFactor * 1.5, 24, 24);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.2,
        metalness: 0.6,
        emissive: isSelected ? 0x1d4ed8 : colorHex,
        emissiveIntensity: isSelected ? 0.4 : 0.15,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (viewStyle === '3d-orbit') {
        mesh.position.set(x, 4 + Math.sin(angle * 2) * 2, z);
      } else {
        mesh.position.set(x, columnHeight / 2, z);
      }

      // Store party metadata on mesh userData for Raycasting
      mesh.userData = { partyId: party.id, party };

      // Add floating text balance badge block on top of column
      const capGeo = new THREE.BoxGeometry(1.8, 0.6, 1.8);
      const capMat = new THREE.MeshStandardMaterial({ color: isSelected ? 0x60a5fa : 0xffffff, roughness: 0.1 });
      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.position.y = columnHeight / 2 + 0.5;
      mesh.add(capMesh);

      group.add(mesh);
    });
  }, [parties, selectedPartyId, viewStyle]);

  // Handle Mouse Click & Drag for 3D Camera Controls & Raycasting
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mountRef.current || !cameraRef.current || !meshesGroupRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast to detect hovered party
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

    const intersects = raycaster.intersectObjects(meshesGroupRef.current.children, true);
    if (intersects.length > 0) {
      let topObject: THREE.Object3D | null = intersects[0].object;
      while (topObject && !topObject.userData?.party) {
        topObject = topObject.parent;
      }
      if (topObject && topObject.userData?.party) {
        setHoveredParty(topObject.userData.party);
      }
    } else {
      setHoveredParty(null);
    }

    // Drag to rotate 3D scene
    if (isDraggingRef.current && rotationGroupRef.current) {
      const deltaX = e.clientX - previousMousePosition.current.x;
      rotationGroupRef.current.rotation.y += deltaX * 0.008;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    // Detect click selection if mouse didn't drag far
    if (!mountRef.current || !cameraRef.current || !meshesGroupRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

    const intersects = raycaster.intersectObjects(meshesGroupRef.current.children, true);
    if (intersects.length > 0) {
      let topObject: THREE.Object3D | null = intersects[0].object;
      while (topObject && !topObject.userData?.party) {
        topObject = topObject.parent;
      }
      if (topObject && topObject.userData?.party) {
        onSelectParty(topObject.userData.party.id);
      }
    }
  };

  return (
    <div className="relative w-full rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden">
      {/* Top Header Bar inside 3D Visualizer */}
      <div className="absolute top-0 left-0 right-0 z-10 flex flex-wrap items-center justify-between p-4 bg-slate-950/70 backdrop-blur-md border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-primary-500/20 text-primary-400 border border-primary-500/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <span>হিসাব খাতা 3D Ledger Visualizer</span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                LIVE 3D ENGINE
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              কাস্টমার বাকি ব্যালেন্সের ৩ডি ডিজিটাল রিপ্রেজেন্টেশন (Three.js Powered)
            </p>
          </div>
        </div>

        {/* 3D Control Buttons */}
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
            <button
              onClick={() => setViewStyle('3d-pillars')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center space-x-1 ${
                viewStyle === '3d-pillars'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>3D Pillars</span>
            </button>
            <button
              onClick={() => setViewStyle('3d-memos')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center space-x-1 ${
                viewStyle === '3d-memos'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Memo Blocks</span>
            </button>
            <button
              onClick={() => setViewStyle('3d-orbit')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center space-x-1 ${
                viewStyle === '3d-orbit'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Orbit Nodes</span>
            </button>
          </div>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-2 rounded-xl border text-xs font-medium transition-all ${
              autoRotate
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle 3D Auto Rotation"
          >
            <RotateCw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3D Canvas Mount Point */}
      <div
        ref={mountRef}
        className="w-full h-[420px] cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {/* Hover Info Floating Card */}
      {hoveredParty && (
        <div className="absolute bottom-4 left-4 z-20 p-3 rounded-xl bg-slate-900/95 border border-slate-700 shadow-xl backdrop-blur-md max-w-xs transition-all animate-in fade-in">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-100">{hoveredParty.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {hoveredParty.business_type || 'পার্টি'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-2">মব: {hoveredParty.mobile} | {hoveredParty.address}</p>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="text-xs text-slate-400">বর্তমান মোট বাকি:</span>
            <span className="text-sm font-bold text-amber-400">
              ৳ {hoveredParty.current_balance.toLocaleString('bn-BD')}
            </span>
          </div>
          <button
            onClick={() => onSelectParty(hoveredParty.id)}
            className="w-full mt-2 py-1 px-2 text-xs font-semibold rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-all flex items-center justify-center space-x-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>লেজার দেখুন</span>
          </button>
        </div>
      )}

      {/* Bottom Floating Legend Bar */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center space-x-3 text-[11px] bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800/80 backdrop-blur-md text-slate-300">
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          <span>কম বাকি (&lt;৪০ হাজার)</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
          <span>মাঝারি বাকি</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
          <span>বেশি বাকি (&gt;১ লাখ)</span>
        </div>
      </div>
    </div>
  );
};
