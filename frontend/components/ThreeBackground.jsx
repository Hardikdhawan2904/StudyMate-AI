/**
 * ThreeBackground
 * Full-screen React Three Fiber scene:
 *   - 450 floating particles (purple/blue palette)
 *   - 40-node neural network with connecting lines
 *   - Wireframe AI orb in the background
 *   - Mouse-reactive parallax on the entire network group
 */

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Floating particle field ──────────────────────────────────────────────────
function ParticleField({ count = 450 }) {
  const ref = useRef();

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Scatter across a wide volume
      positions[i * 3]     = (Math.random() - 0.5) * 28;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14;

      // Purple / blue / indigo mix
      const t = Math.random();
      if (t < 0.45) {          // purple
        colors[i*3]   = 0.48 + Math.random()*0.2;
        colors[i*3+1] = 0.12 + Math.random()*0.1;
        colors[i*3+2] = 0.9  + Math.random()*0.1;
      } else if (t < 0.8) {   // blue
        colors[i*3]   = 0.2  + Math.random()*0.15;
        colors[i*3+1] = 0.45 + Math.random()*0.2;
        colors[i*3+2] = 0.95 + Math.random()*0.05;
      } else {                  // dim white
        const w = 0.5 + Math.random()*0.3;
        colors[i*3]   = w;
        colors[i*3+1] = w;
        colors[i*3+2] = w + 0.1;
      }
    }
    return { positions, colors };
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.012;
    ref.current.rotation.x = clock.elapsedTime * 0.006;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        vertexColors
        transparent
        opacity={0.75}
        sizeAttenuation
      />
    </points>
  );
}

// ── Neural network ───────────────────────────────────────────────────────────
function NeuralNetwork({ mouseRef }) {
  const groupRef = useRef();
  const pulseRef = useRef(0);

  // 40 randomly placed nodes
  const nodes = useMemo(
    () =>
      Array.from({ length: 40 }, () => ({
        pos: [
          (Math.random() - 0.5) * 16,
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 7 - 1,
        ],
        col: Math.random() > 0.5 ? "#a78bfa" : Math.random() > 0.5 ? "#60a5fa" : "#818cf8",
        size: 0.04 + Math.random() * 0.07,
      })),
    []
  );

  // Build LineSegments geometry for all connections whose distance < 3.5
  const lineGeo = useMemo(() => {
    const MAX_DIST = 3.5;
    const verts = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = Math.hypot(
          nodes[i].pos[0] - nodes[j].pos[0],
          nodes[i].pos[1] - nodes[j].pos[1],
          nodes[i].pos[2] - nodes[j].pos[2]
        );
        if (d < MAX_DIST) {
          verts.push(...nodes[i].pos, ...nodes[j].pos);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array(verts), 3)
    );
    return geo;
  }, [nodes]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    // Slow auto-rotation + mouse parallax
    const targetX = -mouseRef.current.y * 0.22;
    const targetY =  t * 0.022 + mouseRef.current.x * 0.28;

    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.04;
    groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.04;

    // Pulse the line opacity via material
    pulseRef.current += 0.02;
    const mat = groupRef.current.children[0]?.material;
    if (mat) mat.opacity = 0.15 + Math.sin(pulseRef.current) * 0.08;
  });

  return (
    <group ref={groupRef}>
      {/* Connection lines */}
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial color="#6d28d9" transparent opacity={0.2} />
      </lineSegments>

      {/* Nodes */}
      {nodes.map((n, i) => (
        <mesh key={i} position={n.pos}>
          <sphereGeometry args={[n.size, 10, 10]} />
          <meshBasicMaterial color={n.col} />
        </mesh>
      ))}
    </group>
  );
}

// ── Central AI orb ───────────────────────────────────────────────────────────
function AIOrb() {
  const orbRef  = useRef();
  const ringRef = useRef();
  const ring2Ref = useRef();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (orbRef.current)  orbRef.current.rotation.y  = t * 0.2;
    if (orbRef.current)  orbRef.current.rotation.z  = t * 0.12;
    if (ringRef.current) ringRef.current.rotation.x = t * 0.3;
    if (ring2Ref.current) ring2Ref.current.rotation.z = -t * 0.25;
  });

  return (
    <group position={[3, -1.5, -9]}>
      {/* Outer wireframe sphere */}
      <mesh ref={orbRef}>
        <sphereGeometry args={[2.8, 24, 24]} />
        <meshBasicMaterial color="#7c3aed" wireframe transparent opacity={0.07} />
      </mesh>
      {/* Torus rings */}
      <mesh ref={ringRef}>
        <torusGeometry args={[3.2, 0.018, 8, 80]} />
        <meshBasicMaterial color="#6d28d9" transparent opacity={0.25} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[3.8, 0.012, 8, 80]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

// ── Scene ────────────────────────────────────────────────────────────────────
function Scene({ mouseRef }) {
  return (
    <>
      <color attach="background" args={["#030014"]} />
      <fog attach="fog" args={["#030014", 16, 32]} />
      <ParticleField />
      <NeuralNetwork mouseRef={mouseRef} />
      <AIOrb />
    </>
  );
}

// ── Export ───────────────────────────────────────────────────────────────────
export default function ThreeBackground() {
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth)  * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      };
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 58 }}
      dpr={[1, 1.5]}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
      gl={{ antialias: false, alpha: false }}
    >
      <Scene mouseRef={mouseRef} />
    </Canvas>
  );
}
