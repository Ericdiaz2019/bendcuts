'use client'

import { useMemo } from 'react'
import { Html, Line } from '@react-three/drei'

import type { CADAnalysis } from '@/lib/types/configuration'
import { formatLength, type DisplayUnit } from '@/lib/configure/displayUnit'

interface DimensionArrowsProps {
  analysis: CADAnalysis
  unit: DisplayUnit
}

const LINE_COLOR = '#475569' // neutral-600
const OFFSET = 0.55 // how far outside the bbox to float the dim lines (display units)
const TICK = 0.18 // half-length of the end ticks

/**
 * Renders L × W × H dimension callouts on the display-space bounding box.
 *
 * Display transform matches `normalizeDisplayMeshes`:
 *  - the rendered model is centered at the origin
 *  - scaled so the largest bbox dim spans 10 units
 *
 * Each axis gets a single straight line offset just outside the bbox, with a
 * frosted Html label at its midpoint showing the real-world length in the
 * active unit. We skip arrowheads — line + end ticks + label reads as a dim
 * callout from any camera angle, and arrowheads cost more to keep camera-aligned.
 */
export default function DimensionArrows({ analysis, unit }: DimensionArrowsProps) {
  const lines = useMemo(() => {
    const { size } = analysis.boundingBox
    const maxSize = Math.max(size.x, size.y, size.z, 1e-6)
    const scale = 10 / maxSize

    // Display-space half extents.
    const hx = (size.x * scale) / 2
    const hy = (size.y * scale) / 2
    const hz = (size.z * scale) / 2

    // mm extents per axis. Display label uses the unit-converted real length.
    return [
      {
        axis: 'x' as const,
        lengthMm: size.x,
        line: [
          [-hx, -hy - OFFSET, -hz - OFFSET],
          [hx, -hy - OFFSET, -hz - OFFSET],
        ] as [number, number, number][],
        tickAxis: 'y' as const,
        labelPos: [0, -hy - OFFSET - 0.25, -hz - OFFSET] as [number, number, number],
      },
      {
        axis: 'y' as const,
        lengthMm: size.y,
        line: [
          [hx + OFFSET, -hy, -hz - OFFSET],
          [hx + OFFSET, hy, -hz - OFFSET],
        ] as [number, number, number][],
        tickAxis: 'x' as const,
        labelPos: [hx + OFFSET + 0.25, 0, -hz - OFFSET] as [number, number, number],
      },
      {
        axis: 'z' as const,
        lengthMm: size.z,
        line: [
          [-hx - OFFSET, -hy - OFFSET, -hz],
          [-hx - OFFSET, -hy - OFFSET, hz],
        ] as [number, number, number][],
        tickAxis: 'y' as const,
        labelPos: [-hx - OFFSET, -hy - OFFSET - 0.25, 0] as [number, number, number],
      },
    ]
  }, [analysis.boundingBox])

  // Skip entirely if the analysis has no real bbox (e.g., manual-review files).
  const { size } = analysis.boundingBox
  if (size.x === 0 && size.y === 0 && size.z === 0) return null

  return (
    <group>
      {lines.map(({ axis, lengthMm, line, tickAxis, labelPos }) => (
        <group key={axis}>
          <Line points={line} color={LINE_COLOR} lineWidth={1.4} dashed={false} />
          {/* End ticks — small perpendicular segments at both ends of the dim line */}
          {[0, 1].map(end => {
            const p = line[end]
            const start: [number, number, number] = [...p]
            const finish: [number, number, number] = [...p]
            if (tickAxis === 'x') {
              start[0] -= TICK
              finish[0] += TICK
            } else if (tickAxis === 'y') {
              start[1] -= TICK
              finish[1] += TICK
            } else {
              start[2] -= TICK
              finish[2] += TICK
            }
            return (
              <Line
                key={end}
                points={[start, finish]}
                color={LINE_COLOR}
                lineWidth={1.4}
              />
            )
          })}
          <Html
            center
            distanceFactor={9}
            position={labelPos}
            style={{ pointerEvents: 'none' }}
          >
            <div className="pointer-events-none whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-neutral-800 shadow-sm ring-1 ring-neutral-200">
              {formatLength(lengthMm, unit)}
            </div>
          </Html>
        </group>
      ))}
    </group>
  )
}
