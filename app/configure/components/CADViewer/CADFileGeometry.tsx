'use client'

import React, { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, BufferGeometry, Material as ThreeMaterial, Group } from 'three'
import type { Material } from '@/lib/types/configuration'

interface CADFileGeometryProps {
  parsedGeometry?: {
    meshes: Array<{
      geometry: BufferGeometry
      material?: ThreeMaterial
      position?: [number, number, number]
      rotation?: [number, number, number]
      scale?: [number, number, number]
    }>
  }
  material?: Material
  wireframe?: boolean
  animated?: boolean
  color?: string
}

function getMaterialProperties(material?: Material) {
  if (!material) {
    return {
      color: '#8C8C8C',
      metalness: 0.8,
      roughness: 0.4
    }
  }
  
  return {
    color: material.properties.color,
    metalness: material.id.includes('steel') || material.id.includes('stainless') ? 0.8 : 0.2,
    roughness: material.id.includes('copper') ? 0.3 : 0.4
  }
}

export default function CADFileGeometry({
  parsedGeometry,
  material,
  wireframe = false,
  animated = false,
  color
}: CADFileGeometryProps) {
  const groupRef = useRef<Group>(null)
  const [hasGeometry, setHasGeometry] = useState(false)

  useEffect(() => {
    setHasGeometry(!!parsedGeometry?.meshes && parsedGeometry.meshes.length > 0)
  }, [parsedGeometry])

  // Animation
  useFrame((state) => {
    if (animated && groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.2
    }
  })

  const materialProps = useMemo(() => {
    const props = getMaterialProperties(material)
    return {
      ...props,
      color: color || props.color
    }
  }, [material, color])

  if (!hasGeometry) {
    // Show placeholder tube geometry while loading or if no geometry is available
    return (
      <group ref={groupRef}>
        {/* Simple tube placeholder */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1, 1, 10, 16]} />
          <meshStandardMaterial 
            color="#808080"
            metalness={0.1}
            roughness={0.8}
            wireframe={wireframe}
          />
        </mesh>
        
        {/* Simple bend representation */}
        <mesh position={[5, 2, 0]} rotation={[0, 0, Math.PI/4]} castShadow receiveShadow>
          <cylinderGeometry args={[1, 1, 5, 16]} />
          <meshStandardMaterial 
            color="#808080"
            metalness={0.1}
            roughness={0.8}
            wireframe={wireframe}
          />
        </mesh>
      </group>
    )
  }

  return (
    <group ref={groupRef}>
      {parsedGeometry!.meshes.map((meshData, index) => (
        <mesh
          key={index}
          geometry={meshData.geometry}
          position={meshData.position || [0, 0, 0]}
          rotation={meshData.rotation || [0, 0, 0]}
          scale={meshData.scale || [1, 1, 1]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial 
            color="#808080"
            metalness={0.1}
            roughness={0.8}
            wireframe={wireframe}
          />
        </mesh>
      ))}
    </group>
  )
}