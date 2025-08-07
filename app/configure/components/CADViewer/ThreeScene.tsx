'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Grid, Stats } from '@react-three/drei'
import { Loader2 } from 'lucide-react'

interface ThreeSceneProps {
  children?: React.ReactNode
  showGrid?: boolean
  showStats?: boolean
  cameraPosition?: [number, number, number]
  autoRotate?: boolean
  showBounds?: boolean
}

function SceneContent({ 
  children, 
  showGrid = true, 
  autoRotate = false 
}: { 
  children?: React.ReactNode; 
  showGrid?: boolean;
  autoRotate?: boolean;
}) {
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

      {/* Camera controls */}
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={autoRotate}
        autoRotateSpeed={2}
        minDistance={1}
        maxDistance={100}
        maxPolarAngle={Math.PI}
      />

      {/* Scene content */}
      {children}
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
  cameraPosition = [15, 15, 15],
  autoRotate = false,
  showBounds = false
}: ThreeSceneProps) {
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ 
          position: cameraPosition, 
          fov: 75,
          near: 0.1,
          far: 1000
        }}
        shadows
        gl={{ 
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true
        }}
        className="bg-white"
      >
        <Suspense fallback={null}>
          <SceneContent showGrid={showGrid} autoRotate={autoRotate}>
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