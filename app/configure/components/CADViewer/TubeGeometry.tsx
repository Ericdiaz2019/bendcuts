'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, TubeGeometry as ThreeTubeGeometry, CatmullRomCurve3, Vector3 } from 'three'
import type { Material } from '@/lib/types/configuration'

interface BendPoint {
  id: string
  position: Vector3
  angle: number // in degrees
  radius: number // bend radius
}


interface TubeGeometryProps {
  diameter?: number
  wallThickness?: number
  length?: number
  material?: Material
  bends?: BendPoint[]
  wireframe?: boolean
  animated?: boolean
  interactive?: boolean
  onBendChange?: (bends: BendPoint[]) => void
  onBendSelect?: (bendId: string | null) => void
}

function generateTubePath(length: number, bends: BendPoint[] = []): CatmullRomCurve3 {
  const points: Vector3[] = []
  
  if (bends.length === 0) {
    // Straight tube
    points.push(new Vector3(0, 0, 0))
    points.push(new Vector3(length, 0, 0))
  } else {
    // Start point
    points.push(new Vector3(0, 0, 0))
    
    let currentPos = new Vector3(0, 0, 0)
    let currentDirection = new Vector3(1, 0, 0) // Initially pointing in X direction
    
    bends.forEach((bend, index) => {
      // Add a point before the bend
      const preBendPos = currentPos.clone().add(
        currentDirection.clone().multiplyScalar(length / (bends.length + 1) * 0.8)
      )
      points.push(preBendPos)
      
      // Calculate bend geometry
      const angleRad = (bend.angle * Math.PI) / 180
      const bendCenter = preBendPos.clone().add(
        new Vector3(-currentDirection.z, 0, currentDirection.x).multiplyScalar(bend.radius)
      )
      
      // Add points along the bend arc
      const numBendPoints = 5
      for (let i = 1; i <= numBendPoints; i++) {
        const t = i / numBendPoints
        const currentAngle = angleRad * t
        const bendPoint = bendCenter.clone().add(
          new Vector3(
            Math.cos(currentAngle) * bend.radius,
            Math.sin(currentAngle) * bend.radius * 0.3, // slight vertical component
            Math.sin(currentAngle) * bend.radius
          )
        )
        points.push(bendPoint)
      }
      
      // Update current position and direction
      currentPos = points[points.length - 1].clone()
      currentDirection = new Vector3(
        Math.cos(angleRad),
        0,
        Math.sin(angleRad)
      )
    })
    
    // Add final straight section
    const finalPos = currentPos.clone().add(
      currentDirection.clone().multiplyScalar(length / (bends.length + 1) * 0.5)
    )
    points.push(finalPos)
  }
  
  return new CatmullRomCurve3(points)
}

function getMaterialProperties(material: Material) {
  return {
    color: material.properties.color,
    metalness: material.id.includes('steel') || material.id.includes('stainless') ? 0.8 : 0.2,
    roughness: material.id.includes('copper') ? 0.3 : 0.4
  }
}



export default function TubeGeometry({
  diameter = 25.4,
  wallThickness = 2,
  length = 1000,
  material,
  bends = [],
  wireframe = false,
  animated = false,
  interactive = false,
  onBendChange,
  onBendSelect
}: TubeGeometryProps) {
  const meshRef = useRef<Mesh>(null)
  // Show static bends for display purposes only
  const displayBends = bends

  
  // Generate tube geometry
  const { curve, geometry } = useMemo(() => {
    // Convert mm to meters for Three.js (scale down)
    const scaledLength = length / 1000
    const scaledDiameter = diameter / 1000
    
    const tubePath = generateTubePath(scaledLength, displayBends)
    
    // Create tube geometry
    const tubeGeometry = new ThreeTubeGeometry(
      tubePath,
      64, // path segments
      scaledDiameter / 2, // radius
      16, // radial segments
      false // closed
    )
    
    return {
      curve: tubePath,
      geometry: tubeGeometry
    }
  }, [length, diameter, displayBends])
  
  // Animation
  useFrame((state) => {
    if (animated && meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2
    }
  })
  
  const materialProps = material ? getMaterialProperties(material) : {
    color: '#8C8C8C',
    metalness: 0.8,
    roughness: 0.4
  }
  
  return (
    <group>
      {/* Main tube */}
      <mesh 
        ref={meshRef} 
        geometry={geometry} 
        castShadow 
        receiveShadow
      >
        <meshStandardMaterial 
          color={materialProps.color}
          metalness={materialProps.metalness}
          roughness={materialProps.roughness}
          wireframe={wireframe}
        />
      </mesh>
      
      {/* Inner tube (to show wall thickness) */}
      {wallThickness > 0 && !wireframe && (
        <mesh geometry={geometry} castShadow>
          <meshStandardMaterial 
            color={materialProps.color}
            metalness={materialProps.metalness}
            roughness={materialProps.roughness}
            transparent
            opacity={0.3}
          />
        </mesh>
      )}
      
      {/* Simple bend point indicators for display only */}
      {displayBends.map((bend, index) => (
        <mesh 
          key={index} 
          position={bend.position}
        >
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#4444ff" />
        </mesh>
      ))}
      
      {/* Centerline helper */}
      {process.env.NODE_ENV === 'development' && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={curve.points.length}
              array={new Float32Array(curve.points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#00ff00" linewidth={2} />
        </line>
      )}

    </group>
  )
}

// Example tube configurations
export const SAMPLE_TUBES = {
  straight: {
    diameter: 1,
    length: 10,
    bends: []
  },
  simpleBend: {
    diameter: 1,
    length: 12,
    bends: [
      {
        position: new Vector3(6, 0, 0),
        angle: 90,
        radius: 2
      }
    ]
  },
  complexBend: {
    diameter: 0.75,
    length: 15,
    bends: [
      {
        position: new Vector3(4, 0, 0),
        angle: 45,
        radius: 1.5
      },
      {
        position: new Vector3(10, 0, 0),
        angle: -60,
        radius: 2
      }
    ]
  }
}