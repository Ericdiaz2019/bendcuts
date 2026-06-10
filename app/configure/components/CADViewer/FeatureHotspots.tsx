'use client'

import { useMemo, useState } from 'react'
import { Html } from '@react-three/drei'
import { ThreeEvent } from '@react-three/fiber'

import type { CADAnalysis, Feature, FeatureConfigMap } from '@/lib/types/configuration'
import { formatDiameter, type DisplayUnit } from '@/lib/configure/displayUnit'

interface FeatureHotspotsProps {
  features: Feature[]
  configs: FeatureConfigMap
  boundingBox: CADAnalysis['boundingBox']
  selectedFeatureId: string | null
  unit: DisplayUnit
  onHover: (featureId: string | null) => void
  onSelect: (featureId: string) => void
}

/**
 * Renders one clickable sphere + label per feature, positioned in display space.
 *
 * Display transform mirrors what `normalizeDisplayMeshes` does to the source meshes:
 *  - translate by -center(boundingBox)
 *  - scale by 10 / max(boundingBox.size)
 *
 * Feature positions arrive in mm (same space as analysis.boundingBox), so
 * applying the same transform places them at the right spot on the rendered model.
 */
export default function FeatureHotspots({
  features,
  configs,
  boundingBox,
  selectedFeatureId,
  unit,
  onHover,
  onSelect,
}: FeatureHotspotsProps) {
  // Local hover (3D pointer) distinct from `selectedFeatureId` (panel-driven
  // highlight). Both can independently make the label show — and both make the
  // dot scale up — but only `selectedFeatureId` flips the tone to "sky".
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const transform = useMemo(() => {
    const cx = (boundingBox.min.x + boundingBox.max.x) / 2
    const cy = (boundingBox.min.y + boundingBox.max.y) / 2
    const cz = (boundingBox.min.z + boundingBox.max.z) / 2
    const maxSize = Math.max(
      boundingBox.size.x,
      boundingBox.size.y,
      boundingBox.size.z,
      1e-6,
    )
    const scale = 10 / maxSize
    return { center: [cx, cy, cz] as [number, number, number], scale }
  }, [boundingBox])

  if (!features?.length) return null

  return (
    <group>
      {features.map(feature => {
        const isSelected = selectedFeatureId === feature.id
        const isHovered = hoveredId === feature.id
        const isActive = isSelected || isHovered
        const isConfigured = Boolean(configs[feature.id])
        const tone = isSelected
          ? '#171717' // neutral-900
          : isConfigured
            ? '#404040' // neutral-700
            : '#a3a3a3' // neutral-400

        const x = (feature.position[0] - transform.center[0]) * transform.scale
        const y = (feature.position[1] - transform.center[1]) * transform.scale
        const z = (feature.position[2] - transform.center[2]) * transform.scale

        const handleClick = (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          onSelect(feature.id)
        }
        const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setHoveredId(feature.id)
          onHover(feature.id)
          document.body.style.cursor = 'pointer'
        }
        const handlePointerOut = () => {
          setHoveredId(prev => (prev === feature.id ? null : prev))
          onHover(null)
          document.body.style.cursor = ''
        }

        const dotScale = isActive ? 1.35 : 1
        return (
          <group key={feature.id} position={[x, y, z]}>
            <mesh
              onClick={handleClick}
              onPointerOver={handlePointerOver}
              onPointerOut={handlePointerOut}
              scale={dotScale}
            >
              <sphereGeometry args={[0.18, 16, 16]} />
              <meshStandardMaterial
                color={tone}
                emissive={tone}
                emissiveIntensity={isActive ? 0.55 : 0.2}
                metalness={0.2}
                roughness={0.4}
              />
            </mesh>
            {isActive && (
              <Html
                center
                distanceFactor={8}
                style={{ pointerEvents: 'none' }}
                position={[0, 0.4, 0]}
              >
                <div
                  className={`pointer-events-none whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-md ${
                    isSelected
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white/95 text-neutral-800 ring-1 ring-neutral-200'
                  }`}
                >
                  {kindLabel(feature, unit)}
                </div>
              </Html>
            )}
          </group>
        )
      })}
    </group>
  )
}

function kindLabel(feature: Feature, unit: DisplayUnit): string {
  switch (feature.kind) {
    case 'bend':
      return `${feature.angleDeg}° · R ${formatDiameter(feature.centerlineRadiusMm, unit)}`
    case 'hole':
      return `Ø ${formatDiameter(feature.diameterMm, unit)}`
    case 'end-cut':
      return feature.endIndex === 0 ? 'Start cut' : 'Finish cut'
  }
}
