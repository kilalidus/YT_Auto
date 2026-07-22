'use client'

/**
 * AuthHero3D
 * ----------
 * A premium 3D animated background for the auth screen, built with
 * React Three Fiber + drei. Renders:
 *   - A central distorted icosahedron ("the AI core") with a wireframe overlay
 *     that slowly rotates and reacts to pointer movement.
 *   - Three smaller orbiting gradient spheres (Torus knots) on different orbits.
 *   - A 600-particle starfield that drifts slowly.
 *   - Soft point-lights tinted with the TubeFlow palette (rose / violet / sky).
 *
 * Performance:
 *   - dpr={[1, 1.6]} clamps pixel ratio for high-DPI screens.
 *   - The scene pauses when the tab is hidden (frameloop="demand" not suitable
 *     here because we always want motion; instead we rely on R3F's built-in
 *     visibility pause via the <Canvas>).
 *   - All geometry is memoized.
 *
 * Styling:
 *   - Color values mirror the oklch palette from globals.css (rose-350,
 *     violet-290, sky-200) so the 3D scene blends with the rest of the UI.
 */

import { useMemo, useRef, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Float,
  Icosahedron,
  TorusKnot,
  Points,
  PointMaterial,
  Sparkles,
  Environment,
  MeshDistortMaterial,
} from '@react-three/drei'
import * as THREE from 'three'

// ---------- Color palette (mirrors globals.css oklch vars) ----------
const COLORS = {
  rose: '#f43f5e',
  violet: '#a855f7',
  sky: '#0ea5e9',
  emerald: '#10b981',
  amber: '#f59e0b',
  white: '#ffffff',
}

// ---------- The AI Core: a distorted icosahedron with a wireframe shell ----------
function AiCore() {
  const groupRef = useRef<THREE.Group>(null)
  const innerRef = useRef<THREE.Mesh>(null)
  const wireRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (!groupRef.current || !innerRef.current || !wireRef.current) return
    // Slow self-rotation
    groupRef.current.rotation.y += delta * 0.18
    groupRef.current.rotation.x += delta * 0.05
    // Subtle pointer parallax
    const px = state.pointer.x * 0.4
    const py = state.pointer.y * 0.4
    groupRef.current.rotation.y += (px - groupRef.current.rotation.y * 0.0) * 0.0
    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      px * 0.6,
      0.04
    )
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      py * 0.6,
      0.04
    )
    // Counter-rotate the wireframe for a "shell" effect
    wireRef.current.rotation.y -= delta * 0.22
    wireRef.current.rotation.z += delta * 0.04
  })

  return (
    <group ref={groupRef}>
      {/* Inner distorted core */}
      <Icosahedron ref={innerRef} args={[1.35, 4]}>
        <MeshDistortMaterial
          color={COLORS.violet}
          emissive={COLORS.rose}
          emissiveIntensity={0.35}
          roughness={0.18}
          metalness={0.7}
          distort={0.38}
          speed={1.8}
        />
      </Icosahedron>
      {/* Wireframe shell */}
      <Icosahedron ref={wireRef} args={[1.95, 1]}>
        <meshBasicMaterial
          color={COLORS.rose}
          wireframe
          transparent
          opacity={0.32}
        />
      </Icosahedron>
    </group>
  )
}

// ---------- Orbiting gradient spheres (TorusKnots) ----------
function OrbitingKnot({
  radius,
  speed,
  offset,
  color,
  size = 0.45,
}: {
  radius: number
  speed: number
  offset: number
  color: string
  size?: number
}) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime * speed + offset
    ref.current.position.x = Math.cos(t) * radius
    ref.current.position.z = Math.sin(t) * radius
    ref.current.position.y = Math.sin(t * 1.7) * radius * 0.32
    ref.current.rotation.x += 0.005
    ref.current.rotation.y += 0.008
  })
  return (
    <TorusKnot ref={ref} args={[size, 0.16, 96, 16]}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.45}
        roughness={0.22}
        metalness={0.65}
      />
    </TorusKnot>
  )
}

// ---------- Drifting particle starfield ----------
function Starfield({ count = 600 }: { count?: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // Distribute in a spherical shell of radius 6–14
      const r = 6 + Math.random() * 8
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    return arr
  }, [count])

  const ref = useRef<THREE.Points>(null)
  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.rotation.y += delta * 0.015
    ref.current.rotation.x += delta * 0.006
  })

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={COLORS.white}
        size={0.045}
        sizeAttenuation
        depthWrite={false}
        opacity={0.7}
      />
    </Points>
  )
}

// ---------- Soft tinted lights ----------
function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[6, 4, 6]} intensity={60} color={COLORS.rose} />
      <pointLight position={[-6, -4, -4]} intensity={50} color={COLORS.violet} />
      <pointLight position={[0, 6, -6]} intensity={40} color={COLORS.sky} />
      <directionalLight position={[2, 4, 2]} intensity={0.7} color={COLORS.white} />
    </>
  )
}

// ---------- Camera subtle parallax on pointer ----------
function CameraRig() {
  const { camera } = useThree()
  useFrame((state) => {
    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      state.pointer.x * 1.4,
      0.03
    )
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      state.pointer.y * 1.0,
      0.03
    )
    camera.lookAt(0, 0, 0)
  })
  return null
}

// ---------- Public component ----------
export function AuthHero3D() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position: [0, 0, 7], fov: 45 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <SceneLights />
          <CameraRig />
          {/* Central AI core with floating animation */}
          <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.6}>
            <AiCore />
          </Float>
          {/* Three orbiting knots on different orbits */}
          <OrbitingKnot radius={3.2} speed={0.45} offset={0} color={COLORS.rose} size={0.42} />
          <OrbitingKnot radius={3.8} speed={-0.32} offset={2.1} color={COLORS.emerald} size={0.34} />
          <OrbitingKnot radius={2.7} speed={0.55} offset={4.2} color={COLORS.amber} size={0.3} />
          {/* Drifting starfield */}
          <Starfield count={600} />
          {/* Subtle drei sparkles for extra twinkle */}
          <Sparkles
            count={50}
            scale={[10, 6, 6]}
            size={3}
            speed={0.4}
            opacity={0.6}
            color={COLORS.violet}
          />
          {/* Environment lighting preset for nice reflections on the metal surfaces */}
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  )
}
