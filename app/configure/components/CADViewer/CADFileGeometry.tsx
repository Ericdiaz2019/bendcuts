'use client'

import React, { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Material as ThreeMaterial, Group } from 'three'
import type { Material } from '@/lib/types/configuration'

interface CADFileGeometryProps {
  parsedGeometry?: {
    meshes: Array<{
      geometry: BufferGeometry
      material?: ThreeMaterial
      position?: [number, number, number]
      rotation?: [number, number, number]
      scale?: [number, number, number]
      renderMode?: 'mesh' | 'lines'
    }>
  }
  material?: Material
  wireframe?: boolean
  animated?: boolean
  color?: string
}

// Light shop-floor grey — keeps the model readable on the soft slate background
// regardless of which material the user picks. Tuned to read as bead-blasted
// aluminum: low metalness so highlights stay soft, mid-high roughness for a
// matte CAD-preview feel rather than chrome.
const NEUTRAL_GREY = '#D8DCE2'

function getMaterialProperties(material?: Material) {
  // Subtly vary surface response per material family for a hint of differentiation,
  // but always render in the same light grey so the viewer reads as a CAD preview.
  if (!material) {
    return { color: NEUTRAL_GREY, metalness: 0.32, roughness: 0.62 }
  }

  const id = material.id
  if (id.includes('stainless')) return { color: NEUTRAL_GREY, metalness: 0.45, roughness: 0.5 }
  if (id.includes('steel')) return { color: NEUTRAL_GREY, metalness: 0.35, roughness: 0.6 }
  if (id.includes('copper')) return { color: NEUTRAL_GREY, metalness: 0.4, roughness: 0.55 }
  if (id.includes('aluminum')) return { color: NEUTRAL_GREY, metalness: 0.3, roughness: 0.65 }
  if (id.includes('print') || id.includes('polymer')) {
    return { color: NEUTRAL_GREY, metalness: 0.05, roughness: 0.8 }
  }
  return { color: NEUTRAL_GREY, metalness: 0.32, roughness: 0.62 }
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
    return <group ref={groupRef} />
  }

  return (
    <group ref={groupRef}>
      {parsedGeometry!.meshes.map((meshData, index) => (
        meshData.renderMode === 'lines' ? (
          <lineSegments
            key={index}
            geometry={meshData.geometry}
            position={meshData.position || [0, 0, 0]}
            rotation={meshData.rotation || [0, 0, 0]}
            scale={meshData.scale || [1, 1, 1]}
          >
            <lineBasicMaterial color={materialProps.color} />
          </lineSegments>
        ) : (
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
              color={materialProps.color}
              metalness={materialProps.metalness}
              roughness={materialProps.roughness}
              wireframe={wireframe}
            />
          </mesh>
        )
      ))}
    </group>
  )
}
