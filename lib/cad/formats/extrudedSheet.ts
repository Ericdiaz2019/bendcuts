import {
  BufferGeometry,
  ExtrudeGeometry,
  Path as ThreePath,
  Shape,
} from 'three'
import type { ParsedCADMesh } from '@/lib/cad/types'

interface Polyline {
  vertices: Array<[number, number, number?] | { x: number; y: number; z?: number }>
}

interface PointXY {
  x: number
  y: number
}

interface ClosedContour {
  points: PointXY[]
  minX: number
  minY: number
  maxX: number
  maxY: number
  /** Signed area: positive = CCW (outer), negative = CW (hole). */
  signedArea: number
}

const CLOSE_TOLERANCE = 1e-3

function pointFrom(vertex: Polyline['vertices'][number]): PointXY {
  if (Array.isArray(vertex)) return { x: vertex[0], y: vertex[1] }
  return { x: vertex.x, y: vertex.y }
}

function pointsClose(a: PointXY, b: PointXY, tolerance: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= tolerance
}

function cleanPointChain(points: PointXY[], tolerance = CLOSE_TOLERANCE): PointXY[] {
  const cleaned: PointXY[] = []
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue
    const last = cleaned[cleaned.length - 1]
    if (last && pointsClose(last, p, tolerance)) continue
    cleaned.push(p)
  }
  return cleaned
}

function signedArea(points: PointXY[]): number {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    area += a.x * b.y - b.x * a.y
  }
  return area / 2
}

function isClosed(points: PointXY[], tolerance = CLOSE_TOLERANCE): boolean {
  if (points.length < 3) return false
  const first = points[0]
  const last = points[points.length - 1]
  return pointsClose(first, last, tolerance)
}

function bboxOf(points: PointXY[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY }
}

function bboxArea(c: ClosedContour) {
  return (c.maxX - c.minX) * (c.maxY - c.minY)
}

function bboxContains(outer: ClosedContour, inner: ClosedContour) {
  return (
    inner.minX >= outer.minX &&
    inner.minY >= outer.minY &&
    inner.maxX <= outer.maxX &&
    inner.maxY <= outer.maxY
  )
}

function stitchTolerance(chains: PointXY[][]): number {
  const allPoints = chains.flat()
  if (allPoints.length === 0) return CLOSE_TOLERANCE
  const bbox = bboxOf(allPoints)
  const diag = Math.hypot(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY)
  return Math.max(CLOSE_TOLERANCE, diag * 1e-5)
}

function stitchOpenChainsToClosedContours(openChains: PointXY[][]): {
  contours: PointXY[][]
  weldedCount: number
} {
  const tolerance = stitchTolerance(openChains)
  const remaining = openChains
    .map((points) => cleanPointChain(points, tolerance))
    .filter((points) => points.length >= 2)
  const closedContours: PointXY[][] = []
  let weldedCount = 0

  while (remaining.length > 0) {
    const current = remaining.shift()
    if (!current) break

    let changed = true
    while (changed && !isClosed(current, tolerance)) {
      changed = false
      const start = current[0]
      const end = current[current.length - 1]

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i]
        const candidateStart = candidate[0]
        const candidateEnd = candidate[candidate.length - 1]

        if (pointsClose(end, candidateStart, tolerance)) {
          current.push(...candidate.slice(1))
        } else if (pointsClose(end, candidateEnd, tolerance)) {
          current.push(...[...candidate].reverse().slice(1))
        } else if (pointsClose(start, candidateEnd, tolerance)) {
          current.unshift(...candidate.slice(0, -1))
        } else if (pointsClose(start, candidateStart, tolerance)) {
          current.unshift(...[...candidate].reverse().slice(0, -1))
        } else {
          continue
        }

        remaining.splice(i, 1)
        changed = true
        break
      }
    }

    if (isClosed(current, tolerance)) {
      current[current.length - 1] = { ...current[0] }
      closedContours.push(current)
      continue
    }

    // Weld nearly-closed contours. Real-world DXF/DWG exports routinely drop or
    // misplace one segment of an outline (we've seen R12 flat patterns arrive
    // missing a single straight edge). If the assembled chain encloses real
    // area, closing it with a straight segment recovers the part instead of
    // discarding the whole profile. The remaining gap is by definition a
    // straight edge between two known-good endpoints.
    if (current.length >= 8) {
      const area = Math.abs(signedArea(current))
      const bbox = bboxOf(current)
      const bboxAreaValue = (bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY)
      if (bboxAreaValue > 0 && area >= bboxAreaValue * 0.05) {
        current.push({ ...current[0] })
        closedContours.push(current)
        weldedCount++
      }
    }
  }

  return { contours: closedContours, weldedCount }
}

function closedContourFromPoints(points: PointXY[]): ClosedContour | null {
  if (points.length < 3 || !isClosed(points)) return null
  // Drop duplicate closing vertex so Shape building doesn't trip on zero-length segments.
  const trimmed = points.slice(0, -1)
  if (trimmed.length < 3) return null
  const area = signedArea(trimmed)
  if (Math.abs(area) < 1e-9) return null
  const bbox = bboxOf(trimmed)
  return {
    points: trimmed,
    ...bbox,
    signedArea: area,
  }
}

function buildClosedContours(polylines: Polyline[]): {
  contours: ClosedContour[]
  weldedCount: number
} {
  const contours: ClosedContour[] = []
  const openChains: PointXY[][] = []

  for (const pl of polylines) {
    if (!pl.vertices || pl.vertices.length < 2) continue
    const points = cleanPointChain(pl.vertices.map(pointFrom))
    if (points.length < 2) continue

    if (isClosed(points)) {
      const contour = closedContourFromPoints(points)
      if (contour) contours.push(contour)
    } else {
      openChains.push(points)
    }
  }

  const stitched = stitchOpenChainsToClosedContours(openChains)
  for (const points of stitched.contours) {
    const contour = closedContourFromPoints(points)
    if (contour) contours.push(contour)
  }

  return { contours, weldedCount: stitched.weldedCount }
}

/**
 * Group closed contours into outer/hole pairings. A contour is a hole of the
 * smallest containing contour. Returns an array of { outer, holes[] } groups —
 * one extruded mesh per outer profile.
 */
function groupOutersAndHoles(contours: ClosedContour[]) {
  // Sort by bbox area descending — outers are processed first, holes assigned to
  // the smallest valid parent.
  const sorted = [...contours].sort((a, b) => bboxArea(b) - bboxArea(a))
  const parentIndex = new Map<ClosedContour, number>()

  sorted.forEach((c, idx) => {
    let bestParent = -1
    let bestArea = Infinity
    for (let j = 0; j < idx; j++) {
      const candidate = sorted[j]
      if (!bboxContains(candidate, c)) continue
      const area = bboxArea(candidate)
      if (area < bestArea) {
        bestArea = area
        bestParent = j
      }
    }
    parentIndex.set(c, bestParent)
  })

  // Nesting depth: even → outer, odd → hole, even → island (own outer), etc.
  function depthOf(idx: number): number {
    let depth = 0
    let cur = idx
    while (cur >= 0) {
      const parent = parentIndex.get(sorted[cur])
      if (parent === undefined || parent < 0) break
      depth++
      cur = parent
    }
    return depth
  }

  const groups: Array<{ outer: ClosedContour; holes: ClosedContour[] }> = []
  const indexInGroups = new Map<ClosedContour, number>()

  sorted.forEach((c, idx) => {
    if (depthOf(idx) % 2 === 0) {
      indexInGroups.set(c, groups.length)
      groups.push({ outer: c, holes: [] })
    }
  })

  sorted.forEach((c, idx) => {
    if (depthOf(idx) % 2 === 0) return
    // Find nearest even-depth ancestor (outer) — that's where this hole belongs.
    let cur = parentIndex.get(c)
    while (cur !== undefined && cur >= 0 && depthOf(cur) % 2 !== 0) {
      cur = parentIndex.get(sorted[cur])
    }
    if (cur === undefined || cur < 0) return
    const groupIdx = indexInGroups.get(sorted[cur])
    if (groupIdx !== undefined) groups[groupIdx].holes.push(c)
  })

  return groups
}

function makeShape(group: { outer: ClosedContour; holes: ClosedContour[] }): Shape {
  // Shape expects CCW outer winding; flip if signed area is negative.
  const outerPts = group.outer.signedArea < 0 ? [...group.outer.points].reverse() : group.outer.points
  const shape = new Shape()
  shape.moveTo(outerPts[0].x, outerPts[0].y)
  for (let i = 1; i < outerPts.length; i++) {
    shape.lineTo(outerPts[i].x, outerPts[i].y)
  }
  shape.closePath()

  for (const hole of group.holes) {
    // Holes should be CW relative to outer; flip if positive area.
    const holePts = hole.signedArea > 0 ? [...hole.points].reverse() : hole.points
    const path = new ThreePath()
    path.moveTo(holePts[0].x, holePts[0].y)
    for (let i = 1; i < holePts.length; i++) {
      path.lineTo(holePts[i].x, holePts[i].y)
    }
    path.closePath()
    shape.holes.push(path)
  }

  return shape
}

export interface ExtrudeResult {
  meshes: ParsedCADMesh[]
  /** Sum of outer-shape bounding-box footprint area, in source units squared. */
  footprintArea: number
  /** Outer profile count — used to confirm we actually got something extrudable. */
  shapeCount: number
  /** Interior cutout count across all outer profiles (laser pierce features). */
  holeCount: number
  /** Contours that had to be force-closed across a gap — surface as a warning. */
  weldedContourCount: number
}

/**
 * Convert DXF-style polylines into extruded sheet-metal meshes.
 *
 * `thickness` is in the same units as the source polylines (millimeters for
 * typical DXF). Center the extrusion so it sits balanced on z=0.
 */
export function buildExtrudedSheetMeshes(
  polylines: Polyline[],
  thickness: number,
): ExtrudeResult {
  const { contours, weldedCount } = buildClosedContours(polylines)
  if (contours.length === 0) {
    return { meshes: [], footprintArea: 0, shapeCount: 0, holeCount: 0, weldedContourCount: weldedCount }
  }

  const groups = groupOutersAndHoles(contours)
  const meshes: ParsedCADMesh[] = []
  let footprintArea = 0
  let holeCount = 0

  for (const group of groups) {
    try {
      const shape = makeShape(group)
      const geometry: BufferGeometry = new ExtrudeGeometry(shape, {
        depth: thickness,
        bevelEnabled: false,
        curveSegments: 24,
      })
      // Center the extrusion on z so the part sits centered on the ground plane.
      geometry.translate(0, 0, -thickness / 2)
      geometry.computeVertexNormals()
      geometry.computeBoundingBox()
      meshes.push({ geometry, renderMode: 'mesh' })
      footprintArea += Math.abs(group.outer.signedArea)
      holeCount += group.holes.length
    } catch {
      // A single broken shape shouldn't kill the whole preview.
    }
  }

  return { meshes, footprintArea, shapeCount: meshes.length, holeCount, weldedContourCount: weldedCount }
}

/** Bounding-box helper for the unit-confirm overlay. */
export function boundingBoxOfPolylines(polylines: Polyline[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const pl of polylines) {
    for (const v of pl.vertices) {
      const p = pointFrom(v)
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    }
  }
  if (!Number.isFinite(minX)) return null
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}
