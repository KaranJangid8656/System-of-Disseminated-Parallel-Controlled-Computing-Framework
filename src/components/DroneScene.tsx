'use client';

import React, { useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';

/** Normalize GLTF materials and mesh flags so the hero model reads as one solid form (not scattered fragments). */
function prepareDroneScene(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;

    const applyMat = (m: THREE.Material) => {
      m.side = THREE.DoubleSide;
      m.depthWrite = true;
      m.needsUpdate = true;
    };

    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach(applyMat);
    else applyMat(mat);
  });
}

function DroneModel({ onLoaded }: { onLoaded: () => void }) {
  const { scene } = useGLTF('/models/drone.glb');
  const modelRef = useRef<THREE.Group>(null);
  const hasNotified = useRef(false);

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    prepareDroneScene(c);
    return c;
  }, [scene]);

  useEffect(() => {
    if (!hasNotified.current) {
      hasNotified.current = true;
      onLoaded();
    }
  }, [cloned, onLoaded]);

  useFrame((_, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={modelRef} position={[0, 0.15, 0]} scale={4.8}>
      <primitive object={cloned} />
    </group>
  );
}

function CameraRig() {
  const { camera } = useThree();
  const angle = useRef(0);

  useFrame((_, delta) => {
    angle.current += delta * 0.12;
    const radius = 3.35;
    camera.position.x = Math.sin(angle.current) * radius;
    camera.position.z = Math.cos(angle.current) * radius;
    camera.position.y = 1.85 + Math.sin(angle.current * 0.45) * 0.35;
    camera.lookAt(0, 0.2, 0);
  });

  return null;
}

function LoadingFallback() {
  return (
    <Html center>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(99, 179, 237, 0.2)',
          borderTop: '3px solid #63b3ed',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <span style={{
          color: '#94a3b8',
          fontSize: '14px',
          fontFamily: 'monospace',
          letterSpacing: '2px',
        }}>
          LOADING ASSETS...
        </span>
      </div>
    </Html>
  );
}

export default function DroneScene({ onModelLoaded }: { onModelLoaded: () => void }) {
  return (
    <Canvas
      camera={{ position: [3.4, 1.9, 3.4], fov: 40 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#050a18']} />
      
      {/* Lighting */}
      <ambientLight intensity={0.45} />
      <directionalLight position={[8, 12, 6]} intensity={1.35} color="#dbeafe" />
      <directionalLight position={[-6, 6, -4]} intensity={0.55} color="#c4b5fd" />
      <pointLight position={[0, 4, 2]} intensity={0.85} color="#60a5fa" />
      <spotLight
        position={[0, 7, 0]}
        angle={0.55}
        penumbra={1}
        intensity={1}
        color="#93c5fd"
        castShadow
      />

      <Suspense fallback={<LoadingFallback />}>
        <DroneModel onLoaded={onModelLoaded} />
        <Environment preset="city" environmentIntensity={0.35} />
        <ContactShadows
          position={[0, -1.35, 0]}
          opacity={0.35}
          scale={12}
          blur={2.5}
          far={5}
          color="#2563eb"
        />
      </Suspense>

      {/* Ground grid effect */}
      <gridHelper
        args={[30, 30, '#1e3a5f', '#0d1b2a']}
        position={[0, -1.35, 0]}
      />

      <CameraRig />
      <fog attach="fog" args={['#050a18', 14, 38]} />
    </Canvas>
  );
}
