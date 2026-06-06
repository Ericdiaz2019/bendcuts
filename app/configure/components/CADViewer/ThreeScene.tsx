'use client'

import { Suspense } from 'react'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import {
  Bounds,
  OrbitControls,
  Grid,
  Stats,
  GizmoHelper,
  GizmoViewcube,
} from '@react-three/drei'
import { Loader2 } from 'lucide-react'

interface ThreeSceneProps {
  children?: React.ReactNode
  showGrid?: boolean
  showStats?: boolean
  showViewCube?: boolean
  cameraPosition?: [number, number, number]
  autoRotate?: boolean
}

function SceneContent({
  children,
  showGrid = true,
  showViewCube = false,
  autoRotate = false
}: {
  children?: React.ReactNode;
  showGrid?: boolean;
  showViewCube?: boolean;
  autoRotate?: boolean;
}) {
  // Double-click anywhere on geometry → re-target the orbit pivot to that point.
  // This is the missing half of zoomToCursor: zoom focuses the wheel on the
  // pointer, but rotation still revolves around the bbox center. Re-targeting
  // means after the dbl-click, both orbit AND zoom revolve around what the
  // user actually wants to inspect.
  const controls = useThree(state => state.controls) as
    | { target: { copy: (p: { x: number; y: number; z: number }) => void }; update: () => void }
    | null
  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!controls || !e.point) return
    e.stopPropagation()
    controls.target.copy(e.point)
    controls.update()
  }

  return (
    <>
      {/* Simple lighting for clean look */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={0.8}
      />
      <directionalLight
        position={[-10, -10, -10]}
        intensity={0.3}
      />

      {/* Camera controls — display geometry is normalized to a ~10-unit cube,
          so zoom limits and speeds are tuned against that fixed scale.
          zoomToCursor focuses the wheel zoom around the pointer, which is the
          single biggest inspection UX win when chasing a small feature.
          makeDefault lets nested components read `state.controls` from useThree. */}
      <OrbitControls
        makeDefault
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={autoRotate}
        autoRotateSpeed={1.4}
        enableDamping={true}
        dampingFactor={0.08}
        zoomSpeed={0.55}
        rotateSpeed={0.85}
        panSpeed={0.85}
        minDistance={0.6}
        maxDistance={60}
        maxPolarAngle={Math.PI}
        zoomToCursor
      />

      {/* Scene content — tight margin so the part fills the frame */}
      <Bounds fit clip observe margin={1.05}>
        <group onDoubleClick={handleDoubleClick}>{children}</group>
      </Bounds>
      {showGrid && <Grid infiniteGrid fadeDistance={30} fadeStrength={5} />}

      {/* Orientation cube — bottom-right so it does not collide with the
          viewer toolbar. Click a face/edge/corner to snap to that view. */}
      {showViewCube && (
        <GizmoHelper alignment="bottom-right" margin={[24, 24]}>
          <GizmoViewcube
            faces={['Right', 'Left', 'Top', 'Bottom', 'Front', 'Back']}
            color="#f1f5f9"
            opacity={0.95}
            strokeColor="#94a3b8"
            textColor="#0f172a"
            hoverColor="#dbeafe"
          />
        </GizmoHelper>
      )}
    </>
  )
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-600">Loading 3D scene...</p>
      </div>
    </div>
  )
}

export default function ThreeScene({
  children,
  showGrid = true,
  showStats = false,
  showViewCube = false,
  cameraPosition = [15, 15, 15],
  autoRotate = false
}: ThreeSceneProps) {
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{
          position: cameraPosition,
          fov: 45,
          near: 0.1,
          far: 5000,
        }}
        shadows
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
        }}
        className="bg-transparent"
      >
        <Suspense fallback={null}>
          <SceneContent showGrid={showGrid} showViewCube={showViewCube} autoRotate={autoRotate}>
            {children}
          </SceneContent>
        </Suspense>
        
        {/* Performance stats (dev only) */}
        {showStats && process.env.NODE_ENV === 'development' && <Stats />}
      </Canvas>
      
      {/* Loading overlay */}
      <Suspense fallback={<LoadingFallback />}>
        <div />
      </Suspense>
    </div>
  )
}
