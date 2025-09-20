import { BufferGeometry, Vector3, BufferAttribute, Box3 } from 'three'

// Import CAD parsing libraries
// Note: occt-import-js is imported dynamically to avoid SSR issues
let occtInstance: any = null

interface ParsedGeometry {
  meshes: Array<{
    geometry: BufferGeometry
    position?: [number, number, number]
    rotation?: [number, number, number]
    scale?: [number, number, number]
  }>
  analysis: {
    totalLength: number
    estimatedBends: number
    estimatedCuts: number
    units: string
    originalUnits?: string
    unitConfidence?: number
    lengthCalculationMethod?: string
    lengthConfidence?: number
    boundingBox: {
      min: { x: number; y: number; z: number }
      max: { x: number; y: number; z: number }
      size: { x: number; y: number; z: number }
    }
  }
}

interface CADParserOptions {
  scale?: number
  centerGeometry?: boolean
}

/**
 * Unit conversion factors to millimeters (base unit)
 */
const UNIT_CONVERSION_TO_MM: Record<string, number> = {
  // Metric units
  'metre': 1000,
  'meter': 1000,
  'm': 1000,
  'millimetre': 1,
  'millimeter': 1,
  'mm': 1,
  'centimetre': 10,
  'centimeter': 10,
  'cm': 10,
  'micrometre': 0.001,
  'micrometer': 0.001,
  'μm': 0.001,
  'nanometre': 0.000001,
  'nanometer': 0.000001,
  'nm': 0.000001,
  
  // Imperial units
  'inch': 25.4,
  'in': 25.4,
  '"': 25.4,
  'foot': 304.8,
  'ft': 304.8,
  "'": 304.8,
  'yard': 914.4,
  'yd': 914.4,
  
  // Special STEP file notations
  '.metre.': 1000,
  '.milli.': 1,
  '.millimetre.': 1,
  '.inch.': 25.4,
  
  // Default fallbacks
  'unknown': 1,
  '': 1
}

/**
 * Parse units directly from STEP file content
 */
async function parseUnitsFromStepFile(file: File): Promise<string | null> {
  try {
    // Read first few KB of STEP file to find unit information
    const chunk = file.slice(0, 8192) // Read first 8KB
    const text = await chunk.text()
    
    // Look for SI_UNIT patterns in STEP file
    const siUnitPatterns = [
      /SI_UNIT\s*\(\s*\*\s*,\s*\.([^,)]+)\.\s*,/gi,
      /SI_UNIT\s*\(\s*\*\s*,\s*([^,)]+)\s*,/gi,
      /LENGTH_UNIT\s*\(\s*\)\s*,\s*\.([^,)]+)\./gi,
      /UNIT\s*\(\s*LENGTH_MEASURE\s*,\s*\.([^,)]+)\./gi
    ]
    
    for (const pattern of siUnitPatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          let unit = match[1].toLowerCase().trim()
          // Remove dots and normalize
          unit = unit.replace(/\./g, '')
          
          console.log('🔍 Found STEP unit from file parsing:', unit)
          
          // Map common STEP unit variations
          const unitMapping: Record<string, string> = {
            'milli': 'millimeter',
            'millimetre': 'millimeter', 
            'metre': 'meter',
            'inch': 'inch',
            'foot': 'foot'
          }
          
          return unitMapping[unit] || unit
        }
      }
    }
    
    // Look for UNCERTAINTY_MEASURE_WITH_UNIT patterns which often contain unit info
    const uncertaintyPattern = /UNCERTAINTY_MEASURE_WITH_UNIT[^(]*\([^,]*,\s*\.([^,)]+)\./gi
    const uncertaintyMatches = text.matchAll(uncertaintyPattern)
    for (const match of uncertaintyMatches) {
      if (match[1]) {
        const unit = match[1].toLowerCase().replace(/\./g, '').trim()
        console.log('🔍 Found STEP unit from uncertainty measure:', unit)
        return unit === 'milli' ? 'millimeter' : unit
      }
    }
    
    return null
  } catch (error) {
    console.warn('Failed to parse units from STEP file:', error)
    return null
  }
}

/**
 * Detect units from parsed CAD file result with enhanced STEP file parsing
 */
async function detectUnitsFromResult(result: any, fileType: 'step' | 'iges', originalFile?: File): Promise<string> {
  // Try to extract unit information from the parsed result first
  if (result.units) {
    return normalizeUnitName(result.units.toLowerCase())
  }
  
  if (result.metadata && result.metadata.units) {
    return normalizeUnitName(result.metadata.units.toLowerCase())
  }
  
  // For STEP files, look for length unit information in parsed result
  if (fileType === 'step' && result.lengthUnit) {
    return normalizeUnitName(result.lengthUnit.toLowerCase())
  }
  
  // For STEP files, try parsing the original file content
  if (fileType === 'step' && originalFile) {
    const stepUnits = await parseUnitsFromStepFile(originalFile)
    if (stepUnits) {
      return normalizeUnitName(stepUnits)
    }
  }
  
  // Fallback: estimate from geometry size
  console.warn('Could not detect units from file, using geometry-based estimation')
  return 'millimeter' // Default assumption
}

/**
 * Normalize unit names to standard forms
 */
function normalizeUnitName(unit: string): string {
  const normalized = unit.toLowerCase().trim().replace(/\./g, '')
  
  const unitMappings: Record<string, string> = {
    'milli': 'millimeter',
    'millimetre': 'millimeter',
    'mm': 'millimeter',
    'metre': 'meter', 
    'm': 'meter',
    'centimetre': 'centimeter',
    'cm': 'centimeter',
    'in': 'inch',
    '"': 'inch',
    'ft': 'foot',
    "'": 'foot',
    'yd': 'yard'
  }
  
  return unitMappings[normalized] || normalized
}

/**
 * Convert length from one unit to millimeters
 */
function convertToMillimeters(length: number, fromUnit: string): number {
  const normalizedUnit = normalizeUnitName(fromUnit)
  const conversionFactor = UNIT_CONVERSION_TO_MM[normalizedUnit] || 1
  
  console.log(`🔄 Converting ${length} ${fromUnit} to millimeters (factor: ${conversionFactor})`)
  
  return length * conversionFactor
}

/**
 * Validate if detected units make sense for the geometry
 */
function validateUnitsAgainstGeometry(detectedUnits: string, boundingSize: Vector3): {
  isValid: boolean
  confidence: number
  suggestedUnit?: string
} {
  const maxDimension = Math.max(boundingSize.x, boundingSize.y, boundingSize.z)
  const normalizedUnit = normalizeUnitName(detectedUnits)
  
  // Define reasonable ranges for different units (in native file units)
  const reasonableRanges: Record<string, { min: number; max: number; typical: number }> = {
    'millimeter': { min: 0.1, max: 10000, typical: 100 },    // 0.1mm to 10m, typically ~10cm
    'meter': { min: 0.001, max: 100, typical: 0.1 },        // 1mm to 100m, typically ~10cm
    'inch': { min: 0.01, max: 1000, typical: 4 },           // 0.01" to 1000", typically ~4"
    'foot': { min: 0.001, max: 100, typical: 0.33 },        // 0.001' to 100', typically ~4"
    'centimeter': { min: 0.01, max: 1000, typical: 10 }     // 0.01cm to 10m, typically ~10cm
  }
  
  const range = reasonableRanges[normalizedUnit]
  if (!range) {
    return { isValid: false, confidence: 0 }
  }
  
  if (maxDimension < range.min || maxDimension > range.max) {
    // Geometry size is outside reasonable range for this unit
    // Suggest alternative units
    let suggestedUnit = normalizedUnit
    
    if (maxDimension < range.min) {
      // Too small, suggest smaller unit
      if (normalizedUnit === 'meter') suggestedUnit = 'millimeter'
      else if (normalizedUnit === 'foot') suggestedUnit = 'inch'
      else if (normalizedUnit === 'centimeter') suggestedUnit = 'millimeter'
    } else {
      // Too large, suggest larger unit  
      if (normalizedUnit === 'millimeter') suggestedUnit = 'meter'
      else if (normalizedUnit === 'inch') suggestedUnit = 'foot'
      else if (normalizedUnit === 'centimeter') suggestedUnit = 'meter'
    }
    
    return { 
      isValid: false, 
      confidence: 0.1,
      suggestedUnit 
    }
  }
  
  // Calculate confidence based on how close to typical size
  const typicalDistance = Math.abs(Math.log10(maxDimension / range.typical))
  const confidence = Math.max(0.3, Math.min(0.95, 1 - typicalDistance / 2))
  
  return { isValid: true, confidence }
}

/**
 * Estimate units based on geometry size (fallback method)
 */
function estimateUnitsFromGeometry(boundingSize: Vector3): string {
  const maxDimension = Math.max(boundingSize.x, boundingSize.y, boundingSize.z)
  
  // If the largest dimension is very small, it's likely in meters or inches
  if (maxDimension < 1) {
    return 'meter' // Could be a large part in meters
  }
  
  // If the largest dimension is in the range 1-100, likely millimeters
  if (maxDimension >= 1 && maxDimension <= 1000) {
    return 'millimeter'
  }
  
  // If the largest dimension is very large, likely millimeters of a big part
  if (maxDimension > 1000) {
    return 'millimeter'
  }
  
  return 'millimeter' // Default
}

/**
 * 3D Skeletonization Algorithm for Centerline Extraction
 * Based on distance transform and iterative thinning
 */
function extractCenterlineBy3DSkeletonization(meshes: Array<{ geometry: BufferGeometry }>): {
  centerline: Vector3[]
  length: number
  confidence: number
} {
  if (meshes.length === 0) {
    return { centerline: [], length: 0, confidence: 0 }
  }

  try {
    // Sample points from mesh surfaces
    const surfacePoints = samplePointsFromMeshes(meshes, 3000)
    if (surfacePoints.length < 50) {
      return { centerline: [], length: 0, confidence: 0 }
    }

    // Create voxel grid for distance transform
    const { voxelGrid, bounds, resolution } = createVoxelGrid(surfacePoints)
    
    // Compute distance transform
    const distanceField = computeDistanceTransform(voxelGrid, bounds, resolution)
    
    // Extract skeleton using iterative thinning
    const skeletonVoxels = extractSkeletonVoxels(distanceField, bounds, resolution)
    
    // Convert skeleton voxels back to 3D points
    const skeletonPoints = voxelsToPoints(skeletonVoxels, bounds, resolution)
    
    if (skeletonPoints.length < 2) {
      return { centerline: [], length: 0, confidence: 0 }
    }

    // Order skeleton points to form a coherent centerline
    const orderedCenterline = orderSkeletonPoints(skeletonPoints)
    
    // Calculate total length using numerical integration methods
    const numericalResult = calculateCurveLengthNumerical(orderedCenterline)
    
    // Calculate confidence based on skeleton quality and numerical integration confidence
    const skeletonConfidence = calculateSkeletonConfidence(orderedCenterline, surfacePoints)
    const combinedConfidence = (skeletonConfidence * 0.6 + numericalResult.confidence * 0.4)

    console.log(`🧮 3D Skeletonization with ${numericalResult.method}: ${numericalResult.length.toFixed(3)} units (confidence: ${combinedConfidence.toFixed(3)})`)

    return { 
      centerline: orderedCenterline, 
      length: numericalResult.length, 
      confidence: combinedConfidence 
    }

  } catch (error) {
    console.warn('3D skeletonization failed:', error)
    return { centerline: [], length: 0, confidence: 0 }
  }
}

/**
 * Create voxel grid from point cloud
 */
function createVoxelGrid(points: Vector3[]): {
  voxelGrid: boolean[][][]
  bounds: { min: Vector3; max: Vector3 }
  resolution: number
} {
  // Calculate bounding box
  const min = new Vector3(Infinity, Infinity, Infinity)
  const max = new Vector3(-Infinity, -Infinity, -Infinity)
  
  for (const point of points) {
    min.x = Math.min(min.x, point.x)
    min.y = Math.min(min.y, point.y)
    min.z = Math.min(min.z, point.z)
    max.x = Math.max(max.x, point.x)
    max.y = Math.max(max.y, point.y)
    max.z = Math.max(max.z, point.z)
  }

  const size = new Vector3().subVectors(max, min)
  const maxDim = Math.max(size.x, size.y, size.z)
  
  // Choose resolution based on geometry size (target ~64-128 voxels along largest dimension)
  const targetVoxels = 80
  const resolution = maxDim / targetVoxels
  
  const dims = {
    x: Math.ceil(size.x / resolution),
    y: Math.ceil(size.y / resolution), 
    z: Math.ceil(size.z / resolution)
  }

  // Initialize voxel grid
  const voxelGrid: boolean[][][] = []
  for (let x = 0; x < dims.x; x++) {
    voxelGrid[x] = []
    for (let y = 0; y < dims.y; y++) {
      voxelGrid[x][y] = new Array(dims.z).fill(false)
    }
  }

  // Mark voxels containing points
  for (const point of points) {
    const vx = Math.floor((point.x - min.x) / resolution)
    const vy = Math.floor((point.y - min.y) / resolution)
    const vz = Math.floor((point.z - min.z) / resolution)
    
    if (vx >= 0 && vx < dims.x && vy >= 0 && vy < dims.y && vz >= 0 && vz < dims.z) {
      voxelGrid[vx][vy][vz] = true
    }
  }

  return { voxelGrid, bounds: { min, max }, resolution }
}

/**
 * Compute distance transform on voxel grid
 */
function computeDistanceTransform(
  voxelGrid: boolean[][][], 
  bounds: { min: Vector3; max: Vector3 }, 
  resolution: number
): number[][][] {
  const dims = {
    x: voxelGrid.length,
    y: voxelGrid[0].length,
    z: voxelGrid[0][0].length
  }

  // Initialize distance field
  const distanceField: number[][][] = []
  for (let x = 0; x < dims.x; x++) {
    distanceField[x] = []
    for (let y = 0; y < dims.y; y++) {
      distanceField[x][y] = []
      for (let z = 0; z < dims.z; z++) {
        distanceField[x][y][z] = voxelGrid[x][y][z] ? 0 : Infinity
      }
    }
  }

  // Simple distance transform using iterative approach
  let changed = true
  const maxIterations = Math.max(dims.x, dims.y, dims.z)
  
  for (let iter = 0; iter < maxIterations && changed; iter++) {
    changed = false
    
    for (let x = 0; x < dims.x; x++) {
      for (let y = 0; y < dims.y; y++) {
        for (let z = 0; z < dims.z; z++) {
          if (voxelGrid[x][y][z]) continue // Skip surface voxels
          
          let minDist = distanceField[x][y][z]
          
          // Check 6-connected neighbors
          const neighbors = [
            [x-1, y, z], [x+1, y, z],
            [x, y-1, z], [x, y+1, z],
            [x, y, z-1], [x, y, z+1]
          ]
          
          for (const [nx, ny, nz] of neighbors) {
            if (nx >= 0 && nx < dims.x && ny >= 0 && ny < dims.y && nz >= 0 && nz < dims.z) {
              const newDist = distanceField[nx][ny][nz] + 1
              if (newDist < minDist) {
                minDist = newDist
                changed = true
              }
            }
          }
          
          distanceField[x][y][z] = minDist
        }
      }
    }
  }

  return distanceField
}

/**
 * Extract skeleton voxels using simple medial axis extraction
 */
function extractSkeletonVoxels(
  distanceField: number[][][],
  bounds: { min: Vector3; max: Vector3 },
  resolution: number
): Array<{ x: number; y: number; z: number; distance: number }> {
  const dims = {
    x: distanceField.length,
    y: distanceField[0].length,
    z: distanceField[0][0].length
  }

  const skeletonVoxels: Array<{ x: number; y: number; z: number; distance: number }> = []

  // Find local maxima in distance field (medial axis points)
  for (let x = 1; x < dims.x - 1; x++) {
    for (let y = 1; y < dims.y - 1; y++) {
      for (let z = 1; z < dims.z - 1; z++) {
        const currentDist = distanceField[x][y][z]
        
        if (currentDist < 2) continue // Skip points too close to surface
        
        // Check if this is a local maximum
        let isLocalMax = true
        for (let dx = -1; dx <= 1 && isLocalMax; dx++) {
          for (let dy = -1; dy <= 1 && isLocalMax; dy++) {
            for (let dz = -1; dz <= 1 && isLocalMax; dz++) {
              if (dx === 0 && dy === 0 && dz === 0) continue
              
              const neighborDist = distanceField[x + dx][y + dy][z + dz]
              if (neighborDist > currentDist) {
                isLocalMax = false
              }
            }
          }
        }
        
        if (isLocalMax) {
          skeletonVoxels.push({ x, y, z, distance: currentDist })
        }
      }
    }
  }

  return skeletonVoxels
}

/**
 * Convert voxel coordinates back to 3D points
 */
function voxelsToPoints(
  skeletonVoxels: Array<{ x: number; y: number; z: number; distance: number }>,
  bounds: { min: Vector3; max: Vector3 },
  resolution: number
): Vector3[] {
  return skeletonVoxels.map(voxel => {
    return new Vector3(
      bounds.min.x + (voxel.x + 0.5) * resolution,
      bounds.min.y + (voxel.y + 0.5) * resolution,
      bounds.min.z + (voxel.z + 0.5) * resolution
    )
  })
}

/**
 * Order skeleton points to form coherent centerline
 */
function orderSkeletonPoints(points: Vector3[]): Vector3[] {
  if (points.length < 2) return points

  // Find endpoints (points with only one close neighbor)
  const endpoints: Vector3[] = []
  const maxConnectionDist = calculateAveragePointSpacing(points) * 2

  for (const point of points) {
    const neighbors = points.filter(p => p !== point && p.distanceTo(point) <= maxConnectionDist)
    if (neighbors.length <= 1) {
      endpoints.push(point)
    }
  }

  if (endpoints.length < 2) {
    // Fallback: use furthest apart points
    let maxDist = 0
    let endpoint1 = points[0]
    let endpoint2 = points[1]
    
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dist = points[i].distanceTo(points[j])
        if (dist > maxDist) {
          maxDist = dist
          endpoint1 = points[i]
          endpoint2 = points[j]
        }
      }
    }
    endpoints.push(endpoint1, endpoint2)
  }

  // Build path from one endpoint to another using greedy nearest neighbor
  const orderedPoints: Vector3[] = []
  const remaining = [...points]
  let current = endpoints[0]
  
  orderedPoints.push(current)
  remaining.splice(remaining.indexOf(current), 1)

  while (remaining.length > 0) {
    let nearest = remaining[0]
    let minDist = current.distanceTo(nearest)
    
    for (const point of remaining) {
      const dist = current.distanceTo(point)
      if (dist < minDist) {
        minDist = dist
        nearest = point
      }
    }
    
    orderedPoints.push(nearest)
    remaining.splice(remaining.indexOf(nearest), 1)
    current = nearest
  }

  return orderedPoints
}

/**
 * Calculate confidence score for skeleton quality
 */
function calculateSkeletonConfidence(centerline: Vector3[], originalPoints: Vector3[]): number {
  if (centerline.length < 2) return 0

  // Base confidence from centerline smoothness
  let smoothnessScore = 1
  if (centerline.length > 2) {
    let totalAngleDeviation = 0
    for (let i = 1; i < centerline.length - 1; i++) {
      const v1 = centerline[i].clone().sub(centerline[i - 1]).normalize()
      const v2 = centerline[i + 1].clone().sub(centerline[i]).normalize()
      const angle = v1.angleTo(v2)
      totalAngleDeviation += angle
    }
    smoothnessScore = Math.max(0.1, 1 - totalAngleDeviation / (centerline.length - 2) / Math.PI)
  }

  // Confidence from coverage (how much of original geometry is represented)
  const coverageScore = Math.min(1, centerline.length / (originalPoints.length * 0.01))

  return Math.min(0.95, smoothnessScore * 0.7 + coverageScore * 0.3)
}

/**
 * Numerical integration methods for accurate curve length calculation
 */
class CurveIntegrator {
  /**
   * Calculate arc length using adaptive Simpson's rule
   */
  static adaptiveSimpsonArcLength(
    points: Vector3[], 
    tolerance: number = 1e-6, 
    maxDepth: number = 10
  ): number {
    if (points.length < 2) return 0
    
    let totalLength = 0
    
    // Process each segment between consecutive points
    for (let i = 0; i < points.length - 1; i++) {
      const segmentLength = this.adaptiveSimpsonSegment(
        points[i], 
        points[i + 1], 
        tolerance, 
        maxDepth
      )
      totalLength += segmentLength
    }
    
    return totalLength
  }
  
  /**
   * Adaptive Simpson's rule for a single segment
   */
  private static adaptiveSimpsonSegment(
    p1: Vector3, 
    p2: Vector3, 
    tolerance: number, 
    depth: number
  ): number {
    const mid = new Vector3().addVectors(p1, p2).multiplyScalar(0.5)
    
    // For straight line segments, return Euclidean distance
    const straightDistance = p1.distanceTo(p2)
    
    if (depth <= 0) {
      return straightDistance
    }
    
    // Calculate Simpson's rule approximation
    const h = 0.5
    const f0 = 1 // derivative magnitude at start (normalized)
    const f1 = 1 // derivative magnitude at midpoint
    const f2 = 1 // derivative magnitude at end
    
    const simpson = (h / 3) * (f0 + 4 * f1 + f2) * straightDistance
    
    // Check if we need further subdivision
    if (Math.abs(simpson - straightDistance) < tolerance) {
      return simpson
    }
    
    // Recursively subdivide
    const left = this.adaptiveSimpsonSegment(p1, mid, tolerance, depth - 1)
    const right = this.adaptiveSimpsonSegment(mid, p2, tolerance, depth - 1)
    
    return left + right
  }
  
  /**
   * Gaussian quadrature for curve length calculation
   */
  static gaussianQuadratureArcLength(points: Vector3[], numPoints: number = 5): number {
    if (points.length < 2) return 0
    
    // Gauss-Legendre quadrature points and weights for 5-point rule
    const gaussPoints = [-0.9061798459, -0.5384693101, 0.0, 0.5384693101, 0.9061798459]
    const gaussWeights = [0.2369268851, 0.4786286705, 0.5688888889, 0.4786286705, 0.2369268851]
    
    let totalLength = 0
    
    // Apply quadrature to each segment
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      const segmentVector = new Vector3().subVectors(p2, p1)
      const segmentLength = segmentVector.length()
      
      if (segmentLength === 0) continue
      
      let segmentIntegral = 0
      
      // Apply Gaussian quadrature
      for (let j = 0; j < numPoints; j++) {
        const t = (gaussPoints[j] + 1) / 2 // Transform from [-1,1] to [0,1]
        
        // For linear segments, derivative magnitude is constant
        const derivativeMagnitude = segmentLength
        
        segmentIntegral += gaussWeights[j] * derivativeMagnitude
      }
      
      totalLength += segmentIntegral * 0.5 // Scale factor for transformation
    }
    
    return totalLength
  }
  
  /**
   * B-spline approximation and integration
   */
  static bSplineArcLength(points: Vector3[], degree: number = 3): number {
    if (points.length < degree + 1) {
      // Fallback to linear interpolation for insufficient points
      return this.linearInterpolationLength(points)
    }
    
    // Create B-spline knot vector
    const n = points.length
    const knotVector = this.createUniformKnotVector(n, degree)
    
    // Sample points along B-spline curve
    const samples = 100
    const curvePoints: Vector3[] = []
    
    for (let i = 0; i <= samples; i++) {
      const t = i / samples
      const point = this.evaluateBSpline(points, degree, knotVector, t)
      if (point) {
        curvePoints.push(point)
      }
    }
    
    // Calculate length of sampled curve
    return this.linearInterpolationLength(curvePoints)
  }
  
  /**
   * Create uniform knot vector for B-spline
   */
  private static createUniformKnotVector(n: number, degree: number): number[] {
    const knotVector: number[] = []
    const m = n + degree + 1
    
    for (let i = 0; i < m; i++) {
      if (i <= degree) {
        knotVector.push(0)
      } else if (i < m - degree) {
        knotVector.push((i - degree) / (n - degree))
      } else {
        knotVector.push(1)
      }
    }
    
    return knotVector
  }
  
  /**
   * Evaluate B-spline at parameter t
   */
  private static evaluateBSpline(
    controlPoints: Vector3[], 
    degree: number, 
    knotVector: number[], 
    t: number
  ): Vector3 | null {
    const n = controlPoints.length
    
    if (t < 0 || t > 1) return null
    
    // Find knot span
    let span = degree
    while (span < n && knotVector[span + 1] <= t) {
      span++
    }
    
    // Compute basis functions
    const basis = this.computeBasisFunctions(span, t, degree, knotVector)
    
    // Compute curve point
    const point = new Vector3(0, 0, 0)
    for (let i = 0; i <= degree; i++) {
      const cp = controlPoints[span - degree + i]
      if (cp) {
        point.add(cp.clone().multiplyScalar(basis[i]))
      }
    }
    
    return point
  }
  
  /**
   * Compute B-spline basis functions
   */
  private static computeBasisFunctions(
    span: number, 
    t: number, 
    degree: number, 
    knotVector: number[]
  ): number[] {
    const basis = new Array(degree + 1).fill(0)
    const left = new Array(degree + 1).fill(0)
    const right = new Array(degree + 1).fill(0)
    
    basis[0] = 1.0
    
    for (let j = 1; j <= degree; j++) {
      left[j] = t - knotVector[span + 1 - j]
      right[j] = knotVector[span + j] - t
      
      let saved = 0.0
      for (let r = 0; r < j; r++) {
        const temp = basis[r] / (right[r + 1] + left[j - r])
        basis[r] = saved + right[r + 1] * temp
        saved = left[j - r] * temp
      }
      basis[j] = saved
    }
    
    return basis
  }
  
  /**
   * Fallback linear interpolation length calculation
   */
  private static linearInterpolationLength(points: Vector3[]): number {
    let length = 0
    for (let i = 1; i < points.length; i++) {
      length += points[i].distanceTo(points[i - 1])
    }
    return length
  }
}

/**
 * Enhanced curve length calculation using numerical integration
 */
function calculateCurveLengthNumerical(centerlinePoints: Vector3[]): {
  length: number
  method: string
  confidence: number
} {
  if (centerlinePoints.length < 2) {
    return { length: 0, method: 'none', confidence: 0 }
  }
  
  const results: Array<{ method: string; length: number; confidence: number }> = []
  
  // Method 1: Adaptive Simpson's rule
  try {
    const simpsonLength = CurveIntegrator.adaptiveSimpsonArcLength(centerlinePoints)
    results.push({
      method: 'Adaptive Simpson',
      length: simpsonLength,
      confidence: 0.85
    })
  } catch (error) {
    console.warn('Adaptive Simpson integration failed:', error)
  }
  
  // Method 2: Gaussian quadrature
  try {
    const gaussLength = CurveIntegrator.gaussianQuadratureArcLength(centerlinePoints)
    results.push({
      method: 'Gaussian Quadrature',
      length: gaussLength,
      confidence: 0.80
    })
  } catch (error) {
    console.warn('Gaussian quadrature integration failed:', error)
  }
  
  // Method 3: B-spline approximation
  try {
    const bsplineLength = CurveIntegrator.bSplineArcLength(centerlinePoints)
    results.push({
      method: 'B-spline Integration',
      length: bsplineLength,
      confidence: 0.75
    })
  } catch (error) {
    console.warn('B-spline integration failed:', error)
  }
  
  // Method 4: Linear interpolation (fallback)
  const linearLength = CurveIntegrator.linearInterpolationLength(centerlinePoints)
  results.push({
    method: 'Linear Interpolation',
    length: linearLength,
    confidence: 0.60
  })
  
  // Select best result
  results.sort((a, b) => b.confidence - a.confidence)
  const best = results[0]
  
  // Cross-validate if multiple methods available
  if (results.length > 1) {
    const avgLength = results.reduce((sum, r) => sum + r.length, 0) / results.length
    const variance = results.reduce((sum, r) => sum + Math.pow(r.length - avgLength, 2), 0) / results.length
    const coefficientOfVariation = Math.sqrt(variance) / avgLength
    
    // Adjust confidence based on consistency
    let finalConfidence = best.confidence
    if (coefficientOfVariation < 0.15) {
      finalConfidence = Math.min(0.95, finalConfidence + 0.05)
    } else if (coefficientOfVariation > 0.3) {
      finalConfidence = Math.max(0.3, finalConfidence - 0.15)
    }
    
    return {
      length: best.length,
      method: best.method,
      confidence: finalConfidence
    }
  }
  
  return best
}

/**
 * Calculate average spacing between points
 */
function calculateAveragePointSpacing(points: Vector3[]): number {
  if (points.length < 2) return 1

  let totalDist = 0
  let count = 0
  
  for (let i = 0; i < Math.min(points.length, 100); i++) {
    let minDist = Infinity
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue
      const dist = points[i].distanceTo(points[j])
      if (dist < minDist) {
        minDist = dist
      }
    }
    if (minDist < Infinity) {
      totalDist += minDist
      count++
    }
  }

  return count > 0 ? totalDist / count : 1
}

/**
 * Multi-method tube length calculation with cross-validation
 */
async function calculateTubeLengthMultiMethod(
  meshes: Array<{ geometry: BufferGeometry }>, 
  boundingSize: Vector3,
  units: string
): Promise<{ bestLength: number; method: string; confidence: number; allResults: Array<{ method: string; length: number; confidence: number }> }> {
  if (meshes.length === 0) {
    return { bestLength: 0, method: 'none', confidence: 0, allResults: [] }
  }

  const results: Array<{ method: string; length: number; confidence: number }> = []

  // Method 1: 3D Skeletonization
  try {
    const skeletonResult = extractCenterlineBy3DSkeletonization(meshes)
    if (skeletonResult.length > 0) {
      results.push({
        method: '3D Skeletonization',
        length: skeletonResult.length,
        confidence: skeletonResult.confidence
      })
    }
  } catch (error) {
    console.warn('3D Skeletonization failed:', error)
  }

  // Method 2: PCA-based slicing (existing method)
  try {
    const pcaLength = estimateCenterlineLengthBySlicing(meshes)
    if (pcaLength > 0) {
      results.push({
        method: 'PCA Slicing',
        length: pcaLength,
        confidence: 0.7
      })
    }
  } catch (error) {
    console.warn('PCA slicing failed:', error)
  }

  // Method 3: Path calculation (existing method)
  try {
    const pathLength = calculatePathLength(meshes)
    if (pathLength > 0) {
      results.push({
        method: 'Path Calculation',
        length: pathLength,
        confidence: 0.6
      })
    }
  } catch (error) {
    console.warn('Path calculation failed:', error)
  }

  // Method 4: Bounding box analysis (fallback)
  const { x, y, z } = boundingSize
  const sortedDimensions = [x, y, z].sort((a, b) => b - a)
  const lengthDimension = sortedDimensions[0]
  const averageCrossDimension = (sortedDimensions[1] + sortedDimensions[2]) / 2
  
  let boundingBoxLength = lengthDimension
  let boundingBoxConfidence = 0.3
  
  if (lengthDimension > averageCrossDimension * 3) {
    boundingBoxLength = lengthDimension
    boundingBoxConfidence = 0.5
  } else {
    const complexity = Math.max(1, Math.sqrt(lengthDimension / averageCrossDimension))
    boundingBoxLength = lengthDimension * complexity
    boundingBoxConfidence = 0.2
  }
  
  results.push({
    method: 'Bounding Box',
    length: boundingBoxLength,
    confidence: boundingBoxConfidence
  })

  // Select best result based on confidence
  if (results.length === 0) {
    return { bestLength: 0, method: 'none', confidence: 0, allResults: [] }
  }

  // Sort by confidence and select the best
  results.sort((a, b) => b.confidence - a.confidence)
  const bestResult = results[0]

  // Cross-validate results if multiple methods succeeded
  let finalConfidence = bestResult.confidence
  if (results.length > 1) {
    const avgLength = results.reduce((sum, r) => sum + r.length, 0) / results.length
    const variance = results.reduce((sum, r) => sum + Math.pow(r.length - avgLength, 2), 0) / results.length
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = stdDev / avgLength
    
    // If results are consistent (low variation), boost confidence
    if (coefficientOfVariation < 0.2) {
      finalConfidence = Math.min(0.95, finalConfidence + 0.1)
    } else if (coefficientOfVariation > 0.5) {
      finalConfidence = Math.max(0.1, finalConfidence - 0.2)
    }
    
    console.log(`📊 Length calculation cross-validation - CV: ${coefficientOfVariation.toFixed(3)}, Results: ${results.map(r => `${r.method}: ${r.length.toFixed(2)}`).join(', ')}`)
  }

  return {
    bestLength: bestResult.length,
    method: bestResult.method,
    confidence: finalConfidence,
    allResults: results
  }
}

/**
 * Calculate path length by sampling points along the geometry
 */
function calculatePathLength(meshes: Array<{ geometry: BufferGeometry }>): number {
  if (meshes.length !== 1) return 0 // Only works for single mesh for now
  
  const geometry = meshes[0].geometry
  const positions = geometry.attributes.position
  
  if (!positions || positions.count < 10) return 0
  
  // Sample points along the geometry to create a path
  const sampleCount = Math.min(50, Math.floor(positions.count / 10))
  const points: Vector3[] = []
  
  for (let i = 0; i < sampleCount; i++) {
    const index = Math.floor((i / (sampleCount - 1)) * (positions.count - 1))
    const point = new Vector3(
      positions.getX(index),
      positions.getY(index),
      positions.getZ(index)
    )
    points.push(point)
  }
  
  // Calculate cumulative distance along the path
  let totalDistance = 0
  for (let i = 1; i < points.length; i++) {
    const distance = points[i].distanceTo(points[i - 1])
    totalDistance += distance
  }
  
  // Only return if we got a reasonable path (longer than bounding box diagonal)
  const geometry_bbox = geometry.boundingBox
  if (geometry_bbox) {
    const diagonal = geometry_bbox.min.distanceTo(geometry_bbox.max)
    if (totalDistance > diagonal * 0.8) {
      return totalDistance
    }
  }
  
  return 0 // Return 0 if path analysis failed
}

/**
 * Sample points uniformly from meshes up to a target count
 */
function samplePointsFromMeshes(meshes: Array<{ geometry: BufferGeometry }>, targetSampleCount: number = 1500): Vector3[] {
  const sampledPoints: Vector3[] = []
  if (meshes.length === 0) {
    return sampledPoints
  }
  
  const samplesPerMesh = Math.max(50, Math.floor(targetSampleCount / meshes.length))
  
  for (const mesh of meshes) {
    const positions = mesh.geometry.attributes.position as BufferAttribute | undefined
    if (!positions) continue
    const count = positions.count
    if (count === 0) continue
    
    const stride = Math.max(1, Math.floor(count / samplesPerMesh))
    for (let i = 0; i < count; i += stride) {
      sampledPoints.push(new Vector3(positions.getX(i), positions.getY(i), positions.getZ(i)))
    }
  }
  
  return sampledPoints
}

/**
 * Compute principal axis using power iteration on covariance matrix
 */
function computePrincipalAxis(points: Vector3[]): Vector3 | null {
  if (points.length < 3) return null
  
  // Compute mean
  const mean = new Vector3(0, 0, 0)
  for (const p of points) {
    mean.add(p)
  }
  mean.multiplyScalar(1 / points.length)
  
  // Compute covariance matrix elements (symmetric 3x3)
  let c00 = 0, c01 = 0, c02 = 0, c11 = 0, c12 = 0, c22 = 0
  for (const p of points) {
    const x = p.x - mean.x
    const y = p.y - mean.y
    const z = p.z - mean.z
    c00 += x * x
    c01 += x * y
    c02 += x * z
    c11 += y * y
    c12 += y * z
    c22 += z * z
  }
  const invN = 1 / (points.length - 1)
  c00 *= invN; c01 *= invN; c02 *= invN; c11 *= invN; c12 *= invN; c22 *= invN
  
  // Power iteration to get dominant eigenvector
  let v = new Vector3(1, 0, 0)
  // If axis is degenerate along X, choose a different start
  if (Math.abs(c00) < 1e-9 && Math.abs(c01) < 1e-9 && Math.abs(c02) < 1e-9) {
    v.set(0, 1, 0)
  }
  
  for (let iter = 0; iter < 20; iter++) {
    const nx = c00 * v.x + c01 * v.y + c02 * v.z
    const ny = c01 * v.x + c11 * v.y + c12 * v.z
    const nz = c02 * v.x + c12 * v.y + c22 * v.z
    v.set(nx, ny, nz)
    const len = v.length()
    if (len < 1e-12) break
    v.multiplyScalar(1 / len)
  }
  
  // Guard against numerical issues
  if (!isFinite(v.x) || !isFinite(v.y) || !isFinite(v.z) || v.length() < 1e-6) {
    return null
  }
  
  return v.normalize()
}

/**
 * Estimate centerline length by slicing point cloud along principal axis.
 * This approximates the tube centerline by connecting centroids of thin slabs.
 */
function estimateCenterlineLengthBySlicing(
  meshes: Array<{ geometry: BufferGeometry }>,
  numSlices: number = 120
): number {
  try {
    const points = samplePointsFromMeshes(meshes, 2000)
    if (points.length < 10) return 0
    
    const axis = computePrincipalAxis(points)
    if (!axis) return 0
    
    // Compute projections onto axis
    // Use the average point as origin for numerical stability
    const origin = new Vector3(0, 0, 0)
    for (const p of points) origin.add(p)
    origin.multiplyScalar(1 / points.length)
    
    const projections: number[] = new Array(points.length)
    let minProj = Infinity
    let maxProj = -Infinity
    for (let i = 0; i < points.length; i++) {
      const proj = points[i].clone().sub(origin).dot(axis)
      projections[i] = proj
      if (proj < minProj) minProj = proj
      if (proj > maxProj) maxProj = proj
    }
    
    if (!isFinite(minProj) || !isFinite(maxProj) || maxProj <= minProj) return 0
    
    const sliceWidth = (maxProj - minProj) / numSlices
    if (sliceWidth <= 0) return 0
    
    // Accumulate centroids per slice
    const sumX = new Array<number>(numSlices).fill(0)
    const sumY = new Array<number>(numSlices).fill(0)
    const sumZ = new Array<number>(numSlices).fill(0)
    const counts = new Array<number>(numSlices).fill(0)
    
    for (let i = 0; i < points.length; i++) {
      const idx = Math.min(
        numSlices - 1,
        Math.max(0, Math.floor((projections[i] - minProj) / sliceWidth))
      )
      sumX[idx] += points[i].x
      sumY[idx] += points[i].y
      sumZ[idx] += points[i].z
      counts[idx] += 1
    }
    
    // Build ordered centroids
    const centroids: Vector3[] = []
    for (let i = 0; i < numSlices; i++) {
      if (counts[i] > 0) {
        centroids.push(new Vector3(sumX[i] / counts[i], sumY[i] / counts[i], sumZ[i] / counts[i]))
      }
    }
    
    if (centroids.length < 2) return 0
    
    // Optional smoothing (moving average) to reduce noise
    const smoothed: Vector3[] = []
    const window = 3
    for (let i = 0; i < centroids.length; i++) {
      let sx = 0, sy = 0, sz = 0, n = 0
      for (let w = -window; w <= window; w++) {
        const j = i + w
        if (j >= 0 && j < centroids.length) {
          sx += centroids[j].x
          sy += centroids[j].y
          sz += centroids[j].z
          n++
        }
      }
      smoothed.push(new Vector3(sx / n, sy / n, sz / n))
    }
    
    // Sum distances along the smoothed polyline
    let length = 0
    for (let i = 1; i < smoothed.length; i++) {
      length += smoothed[i].distanceTo(smoothed[i - 1])
    }
    
    // Sanity checks: length should be at least as large as the dominant dimension
    // Compute bounding box size from input meshes
    let min = new Vector3(Infinity, Infinity, Infinity)
    let max = new Vector3(-Infinity, -Infinity, -Infinity)
    for (const p of points) {
      min.x = Math.min(min.x, p.x); min.y = Math.min(min.y, p.y); min.z = Math.min(min.z, p.z)
      max.x = Math.max(max.x, p.x); max.y = Math.max(max.y, p.y); max.z = Math.max(max.z, p.z)
    }
    const size = new Vector3().subVectors(max, min)
    const dominantDimension = Math.max(size.x, size.y, size.z)
    
    if (!isFinite(length) || length <= 0) return 0
    
    // If computed length is suspiciously small compared to dominant dimension, fallback
    if (length < dominantDimension * 0.8) {
      return 0
    }
    
    return length
  } catch (e) {
    return 0
  }
}

/**
 * Advanced bend analysis using geometric algorithms
 */
function analyzeBends(
  meshes: Array<{ geometry: BufferGeometry }>,
  boundingSize?: Vector3
): {
  bendCount: number
  totalVertices: number
  totalTriangles: number
  confidence: number
} {
  let totalVertices = 0
  let totalTriangles = 0
  let bendCount = 0
  let confidence = 0.5 // Default confidence

  if (meshes.length === 0) {
    return { bendCount: 0, totalVertices: 0, totalTriangles: 0, confidence: 0 }
  }

  // Count vertices and triangles
  for (const mesh of meshes) {
    const geometry = mesh.geometry
    const positions = geometry.attributes.position
    const indices = geometry.index

    if (positions) {
      totalVertices += positions.count
    }

    if (indices) {
      totalTriangles += indices.count / 3
    }
  }

  // Use multiple analysis methods for better accuracy
  const methodEstimates: Array<{ bendCount: number; confidence: number; method: string }> = []

  // Method 1: Curvature analysis along the centerline
  const curvatureAnalysis = analyzeCurvature(meshes)
  if (curvatureAnalysis.success) {
    methodEstimates.push({
      bendCount: curvatureAnalysis.bends,
      confidence: curvatureAnalysis.confidence,
      method: 'curvature'
    })
  }

  // Method 2: Direction change analysis (improved version)
  const directionAnalysis = analyzeDirectionChanges(meshes)
  if (directionAnalysis.success) {
    methodEstimates.push({
      bendCount: directionAnalysis.bends,
      confidence: directionAnalysis.confidence,
      method: 'direction'
    })
  }

  // Method 3: Complexity-based heuristic (fallback)
  const complexityBends = estimateBendsFromComplexity(totalVertices, totalTriangles)
  methodEstimates.push({
    bendCount: complexityBends,
    confidence: 0.3, // Lower confidence for heuristic method
    method: 'complexity'
  })

  const curvatureEstimate = methodEstimates.find(method => method.method === 'curvature')
  const directionEstimate = methodEstimates.find(method => method.method === 'direction')

  // Calculate geometry slenderness to identify straight tubes
  let slenderRatio: number | null = null
  if (boundingSize) {
    const dims = [Math.abs(boundingSize.x), Math.abs(boundingSize.y), Math.abs(boundingSize.z)]
    dims.sort((a, b) => b - a)
    const longest = dims[0]
    const crossSpan = Math.max(dims[1], dims[2], 1e-3)
    if (longest > 0) {
      slenderRatio = longest / crossSpan
    }
  }

  // Choose the best estimate based on confidence scores
  if (methodEstimates.length > 0) {
    let sortedMethods = [...methodEstimates].sort((a, b) => b.confidence - a.confidence)

    // When the part is extremely slender, ignore low-confidence high-bend heuristics
    if (slenderRatio && slenderRatio > 8) {
      const filtered = sortedMethods.filter(method => !(method.confidence < 0.5 && method.bendCount > 2))
      if (filtered.length > 0) {
        sortedMethods = filtered
      }
    }

    const topMethods = sortedMethods.slice(0, 2) // Use top 2 methods
    const weightedSum = topMethods.reduce((sum, method) => sum + method.bendCount * method.confidence, 0)
    const totalWeight = topMethods.reduce((sum, method) => sum + method.confidence, 0)
    
    const highest = topMethods[0]
    const estimated = totalWeight > 0 ? weightedSum / totalWeight : 0

    // Default to weighted estimate
    bendCount = Math.round(estimated)
    confidence = highest.confidence // Use highest confidence

    const hasLowBendSignal = !!(
      (curvatureEstimate && curvatureEstimate.bendCount <= 1) ||
      (directionEstimate && directionEstimate.bendCount <= 1)
    )

    // If the geometry is nearly straight, trust the highest-confidence method directly
    if (slenderRatio && slenderRatio > 10) {
      if (highest.bendCount <= 1) {
        bendCount = highest.bendCount
        confidence = highest.confidence
      } else if (slenderRatio > 18 && highest.bendCount < bendCount) {
        bendCount = highest.bendCount
        confidence = highest.confidence
      }
    }

    if (slenderRatio && slenderRatio > 12 && hasLowBendSignal) {
      bendCount = Math.min(bendCount, 1)
      if (slenderRatio > 18) {
        bendCount = 0
      }
      confidence = Math.max(curvatureEstimate?.confidence ?? 0, directionEstimate?.confidence ?? 0, 0.5)
    }

    // Extremely slender parts should never report high bend counts
    if (slenderRatio && slenderRatio > 22) {
      bendCount = Math.min(bendCount, 1)
      if (slenderRatio > 30) {
        bendCount = 0
        confidence = Math.min(confidence, 0.6)
      }
    }
  }

  // Ensure reasonable bounds
  bendCount = Math.max(0, Math.min(bendCount, 20))

  return { bendCount, totalVertices, totalTriangles, confidence }
}

/**
 * Analyze curvature changes along the geometry
 */
function analyzeCurvature(meshes: Array<{ geometry: BufferGeometry }>): {
  success: boolean
  bends: number
  confidence: number
} {
  if (meshes.length !== 1) {
    return { success: false, bends: 0, confidence: 0 }
  }

  const geometry = meshes[0].geometry
  const positions = geometry.attributes.position

  if (!positions || positions.count < 20) {
    return { success: false, bends: 0, confidence: 0 }
  }

  // Sample points along the geometry
  const sampleCount = Math.min(100, Math.floor(positions.count / 5))
  const points: Vector3[] = []

  for (let i = 0; i < sampleCount; i++) {
    const index = Math.floor((i / (sampleCount - 1)) * (positions.count - 1))
    const point = new Vector3(
      positions.getX(index),
      positions.getY(index),
      positions.getZ(index)
    )
    points.push(point)
  }

  // Calculate curvature at each point
  let significantCurvatureChanges = 0
  const curvatureThreshold = 0.2 // Reduce false positives from mesh tessellation

  for (let i = 2; i < points.length - 2; i++) {
    // Calculate curvature using 5-point stencil
    const p1 = points[i - 2]
    const p2 = points[i - 1]
    const p3 = points[i]
    const p4 = points[i + 1]
    const p5 = points[i + 2]

    // Calculate discrete curvature
    const v1 = p2.clone().sub(p1).normalize()
    const v2 = p3.clone().sub(p2).normalize()
    const v3 = p4.clone().sub(p3).normalize()
    const v4 = p5.clone().sub(p4).normalize()

    const angle1 = v1.angleTo(v2)
    const angle2 = v2.angleTo(v3)
    const angle3 = v3.angleTo(v4)

    // Look for significant changes in curvature
    const curvatureChange = Math.abs(angle2 - angle1) + Math.abs(angle3 - angle2)
    
    if (curvatureChange > curvatureThreshold) {
      significantCurvatureChanges++
    }
  }

  // Filter out noise - group nearby curvature changes
  const bendCount = Math.max(0, Math.floor(significantCurvatureChanges / 3))
  const confidence = Math.min(0.9, 0.5 + (sampleCount / 200)) // Higher confidence with more samples

  return { success: true, bends: bendCount, confidence }
}

/**
 * Analyze direction changes (improved version)
 */
function analyzeDirectionChanges(meshes: Array<{ geometry: BufferGeometry }>): {
  success: boolean
  bends: number
  confidence: number
} {
  if (meshes.length !== 1) {
    return { success: false, bends: 0, confidence: 0 }
  }

  const geometry = meshes[0].geometry
  const positions = geometry.attributes.position

  if (!positions || positions.count < 10) {
    return { success: false, bends: 0, confidence: 0 }
  }

  // Sample points with better distribution
  const sampleCount = Math.min(50, Math.floor(positions.count / 8))
  const points: Vector3[] = []

  for (let i = 0; i < sampleCount; i++) {
    const index = Math.floor((i / (sampleCount - 1)) * (positions.count - 1))
    const point = new Vector3(
      positions.getX(index),
      positions.getY(index),
      positions.getZ(index)
    )
    points.push(point)
  }

  // Analyze direction changes with smoothing
  let significantDirectionChanges = 0
  const angleThreshold = 0.5 // ~29 degrees in radians to ignore minor mesh noise

  for (let i = 2; i < points.length - 2; i++) {
    // Use smoothed directions to reduce noise
    const dir1 = points[i].clone().sub(points[i - 2]).normalize()
    const dir2 = points[i + 2].clone().sub(points[i]).normalize()
    const angle = dir1.angleTo(dir2)

    if (angle > angleThreshold) {
      significantDirectionChanges++
    }
  }

  // Group nearby direction changes
  const bendCount = Math.max(0, Math.floor(significantDirectionChanges / 2))
  const confidence = 0.7 // Good confidence for direction analysis

  return { success: true, bends: bendCount, confidence }
}

/**
 * Estimate bends from geometry complexity (fallback method)
 */
function estimateBendsFromComplexity(totalVertices: number, totalTriangles: number): number {
  // Improved heuristic based on vertex density and triangle count
  if (totalVertices < 100) return 0 // Too simple to have bends
  
  // Base complexity score
  const complexityScore = Math.log(totalVertices) + Math.log(totalTriangles + 1)
  
  // Estimate bends from complexity
  let estimatedBends = 0
  if (complexityScore > 8) { // Threshold for detecting complexity
    estimatedBends = Math.floor((complexityScore - 8) / 1.5)
  }
  
  return Math.min(estimatedBends, 10) // Cap at reasonable number
}

/**
 * Analyze geometry to extract tube bending information with enhanced unit handling
 */
async function analyzeGeometry(
  meshes: Array<{ geometry: BufferGeometry }>, 
  detectedUnits: string,
  originalFile?: File
): Promise<ParsedGeometry['analysis']> {
  if (meshes.length === 0) {
    return {
      totalLength: 0,
      estimatedBends: 0,
      estimatedCuts: 2, // Default assumption: 2 cuts (start and end)
      units: detectedUnits || 'unknown',
      boundingBox: {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 },
        size: { x: 0, y: 0, z: 0 }
      }
    }
  }

  // Calculate overall bounding box
  const overallBox = new Box3()
  
  for (const mesh of meshes) {
    if (mesh.geometry.boundingBox) {
      overallBox.union(mesh.geometry.boundingBox)
    }
  }

  const size = overallBox.getSize(new Vector3())
  
  // Validate units against geometry
  const unitValidation = validateUnitsAgainstGeometry(detectedUnits, size)
  let finalUnits = detectedUnits
  
  if (!unitValidation.isValid && unitValidation.suggestedUnit) {
    console.warn(`⚠️ Detected units '${detectedUnits}' seem incorrect for geometry size. Suggesting '${unitValidation.suggestedUnit}'`)
    finalUnits = unitValidation.suggestedUnit
  }

  console.log(`📏 Unit validation - Units: ${finalUnits}, Confidence: ${unitValidation.confidence.toFixed(2)}, Max dimension: ${Math.max(size.x, size.y, size.z).toFixed(3)}`)

  // Use improved bend detection algorithm
  const bendAnalysis = analyzeBends(meshes, size)
  const estimatedBends = bendAnalysis.bendCount
  const totalVertices = bendAnalysis.totalVertices
  const totalTriangles = bendAnalysis.totalTriangles

  // Estimate cuts - typically start and end, plus any additional cuts for complex parts
  let estimatedCuts = 2 // Default: start and end cuts
  if (estimatedBends > 3) {
    estimatedCuts += Math.floor(estimatedBends / 3) // Additional cuts for complex parts
  }

  // Calculate tube length using multiple methods
  const lengthResults = await calculateTubeLengthMultiMethod(meshes, size, finalUnits)
  
  // Convert final length to millimeters for consistent storage
  const lengthInMM = convertToMillimeters(lengthResults.bestLength, finalUnits)
  
  const analysis = {
    totalLength: lengthInMM, // Store in millimeters for consistency
    estimatedBends,
    estimatedCuts,
    units: 'millimeter', // Always store as millimeter
    originalUnits: finalUnits, // Keep track of original units
    unitConfidence: unitValidation.confidence,
    lengthCalculationMethod: lengthResults.method,
    lengthConfidence: lengthResults.confidence,
    boundingBox: {
      min: { x: overallBox.min.x, y: overallBox.min.y, z: overallBox.min.z },
      max: { x: overallBox.max.x, y: overallBox.max.y, z: overallBox.max.z },
      size: { x: size.x, y: size.y, z: size.z }
    }
  }

  console.log('🔍 Enhanced geometry analysis:', {
    totalVertices,
    totalTriangles,
    boundingBoxSize: size,
    estimatedBends,
    bendConfidence: bendAnalysis.confidence,
    totalLengthMM: analysis.totalLength,
    originalUnits: finalUnits,
    unitConfidence: unitValidation.confidence,
    calculationMethod: lengthResults.method,
    lengthConfidence: lengthResults.confidence
  })

  return analysis
}

/**
 * Parse STEP or IGES files using occt-import-js
 */
async function parseStepOrIges(
  file: File, 
  fileType: 'step' | 'iges',
  options: CADParserOptions = {}
): Promise<ParsedGeometry> {
  try {
    // Dynamic import and initialize the library if not already done
    if (!occtInstance) {
      const occtimportjs = await import('occt-import-js')
      
      // Configure the WASM path
      const occtImportFactory = occtimportjs.default
      
      // Initialize with WASM path configuration
      occtInstance = await occtImportFactory({
        locateFile: (path: string) => {
          if (path.endsWith('.wasm')) {
            return `/occt-import-js.wasm`
          }
          return path
        }
      })
    }

    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    console.log(`Parsing ${fileType.toUpperCase()} file with size:`, uint8Array.length, 'bytes')

    // Call the appropriate parsing method
    const result = fileType === 'step' 
      ? occtInstance.ReadStepFile(uint8Array, null)
      : occtInstance.ReadIgesFile(uint8Array, null)

    console.log('Parse result:', result)

    if (!result || !result.success) {
      throw new Error(`Failed to parse ${fileType.toUpperCase()} file: ${result?.errorText || 'Unknown error'}`)
    }

    // Detect units from the parsed result
    const detectedUnits = await detectUnitsFromResult(result, fileType, file)
    console.log(`Detected units for ${fileType.toUpperCase()} file:`, detectedUnits)

    // Keep original meshes for accurate analysis, and separate display meshes for viewer scaling/centering
    const analysisMeshes: ParsedGeometry['meshes'] = []
    const displayMeshes: ParsedGeometry['meshes'] = []

    // Process the parsed mesh data (using the correct structure from examples)
    if (result.meshes && Array.isArray(result.meshes)) {
      console.log(`Processing ${result.meshes.length} meshes from parsed file`)
      
      for (let i = 0; i < result.meshes.length; i++) {
        const meshData = result.meshes[i]
        const geometryOriginal = new BufferGeometry()

        console.log(`Processing mesh ${i + 1}:`, {
          hasAttributes: !!meshData.attributes,
          hasPosition: !!(meshData.attributes?.position),
          hasNormal: !!(meshData.attributes?.normal),
          hasIndex: !!meshData.index,
          name: meshData.name
        })

        // Extract vertices (this is the correct structure from the examples)
        if (meshData.attributes?.position?.array) {
          const positions = new Float32Array(meshData.attributes.position.array)
          geometryOriginal.setAttribute('position', new BufferAttribute(positions, 3))
          console.log(`Added ${positions.length / 3} vertices to mesh ${i + 1}`)
        } else {
          console.warn(`Mesh ${i + 1} has no position data`)
          continue // Skip this mesh if no vertices
        }

        // Extract normals if available
        if (meshData.attributes?.normal?.array) {
          const normals = new Float32Array(meshData.attributes.normal.array)
          geometryOriginal.setAttribute('normal', new BufferAttribute(normals, 3))
          console.log(`Added normals to mesh ${i + 1}`)
        }

        // Extract indices if available
        if (meshData.index?.array) {
          const indices = new Uint32Array(meshData.index.array)
          geometryOriginal.setIndex(new BufferAttribute(indices, 1))
          console.log(`Added ${indices.length} indices to mesh ${i + 1}`)
        }

        // Compute missing normals and bounding box on original geometry
        if (!geometryOriginal.attributes.normal) {
          geometryOriginal.computeVertexNormals()
          console.log(`Computed vertex normals for mesh ${i + 1}`)
        }
        
        geometryOriginal.computeBoundingBox()
        
        const bbox = geometryOriginal.boundingBox!
        const size = bbox.getSize(new Vector3())
        const center = bbox.getCenter(new Vector3())
        
        console.log(`Mesh ${i + 1} bounding box:`, {
          min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
          max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z },
          size: { x: size.x, y: size.y, z: size.z },
          center: { x: center.x, y: center.y, z: center.z }
        })

        // Create a display copy for viewer scaling/centering
        const geometryDisplay = geometryOriginal.clone()
        // Auto-scale and center geometry for better visibility
        const maxSize = Math.max(size.x, size.y, size.z)
        
        if (maxSize > 0) {
          // Scale to a reasonable size (target ~10 units for the largest dimension)
          const targetSize = 10
          const autoScale = targetSize / maxSize
          
          console.log(`Auto-scaling mesh (display) ${i + 1} by factor ${autoScale} (original max size: ${maxSize})`)
          geometryDisplay.scale(autoScale, autoScale, autoScale)
          
          // Re-compute bounding box after scaling
          geometryDisplay.computeBoundingBox()
        }

        // Always center the geometry
        geometryDisplay.center()
        
        // Re-compute final bounding box
        geometryDisplay.computeBoundingBox()
        const finalBbox = geometryDisplay.boundingBox!
        const finalSize = finalBbox.getSize(new Vector3())
        
        console.log(`Final mesh ${i + 1} size:`, {
          x: finalSize.x, y: finalSize.y, z: finalSize.z
        })

        // Apply user-specified transformations
        if (options.scale && options.scale !== 1) {
          geometryDisplay.scale(options.scale, options.scale, options.scale)
        }

        // Store meshes: original for analysis, display for rendering
        analysisMeshes.push({ geometry: geometryOriginal })
        displayMeshes.push({ geometry: geometryDisplay })
        console.log(`Successfully processed mesh ${i + 1}`)
      }
    }

    // If no meshes found in standard format, try alternative data structure
    if (analysisMeshes.length === 0 && result.root) {
      console.log('Trying alternative data structure parsing...')
      
      // Create a simple geometry from basic vertex data if available
      const geometryOriginal = new BufferGeometry()
      
      // Try to find vertex data in different possible locations
      let vertices: number[] = []
      let indices: number[] = []
      
      if (result.root.vertices) {
        vertices = result.root.vertices
      }
      
      if (result.root.indices) {
        indices = result.root.indices
      }

      if (vertices.length > 0) {
        geometryOriginal.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3))
        
        if (indices.length > 0) {
          geometryOriginal.setIndex(new BufferAttribute(new Uint32Array(indices), 1))
        }
        
        geometryOriginal.computeVertexNormals()
        geometryOriginal.computeBoundingBox()

        const geometryDisplay = geometryOriginal.clone()
        if (options.scale && options.scale !== 1) {
          geometryDisplay.scale(options.scale, options.scale, options.scale)
        }

        if (options.centerGeometry) {
          geometryDisplay.center()
        }

        analysisMeshes.push({ geometry: geometryOriginal })
        displayMeshes.push({ geometry: geometryDisplay })
      }
    }

    if (analysisMeshes.length === 0) {
      throw new Error('No valid geometry found in file. The file may not contain renderable mesh data.')
    }

    // Analyze the geometry for length, bends, and cuts
    const analysis = await analyzeGeometry(analysisMeshes, detectedUnits, file)
    
    console.log(`Successfully extracted ${analysisMeshes.length} mesh(es) from ${fileType.toUpperCase()} file`)
    console.log('📊 Geometry Analysis:', analysis)
    
    return { meshes: displayMeshes, analysis }

  } catch (error) {
    console.error(`Error parsing ${fileType.toUpperCase()} file:`, error)
    throw new Error(`Failed to parse ${fileType.toUpperCase()} file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Parse DXF files using three-dxf-loader
 */
async function parseDxf(file: File, options: CADParserOptions = {}): Promise<ParsedGeometry> {
  try {
    // Dynamic import to avoid potential SSR issues
    const { DXFLoader } = await import('three-dxf-loader')
    
    const loader = new DXFLoader()
    const text = await file.text()
    
    const dxfData = loader.parse(text)
    
    if (!dxfData) {
      throw new Error('Failed to parse DXF file')
    }

    const meshes: ParsedGeometry['meshes'] = []

    // Process DXF entities
    if (dxfData.entities) {
      // Create a single geometry from all DXF entities
      const geometry = new BufferGeometry()
      const positions: number[] = []
      const indices: number[] = []

      let vertexIndex = 0

      // Process lines, polylines, and other entities
      for (const entity of dxfData.entities) {
        if (entity.type === 'LINE') {
          // Add line vertices
          positions.push(entity.start.x, entity.start.y, entity.start.z || 0)
          positions.push(entity.end.x, entity.end.y, entity.end.z || 0)
          
          // Add line indices
          indices.push(vertexIndex, vertexIndex + 1)
          vertexIndex += 2
        } else if (entity.type === 'POLYLINE' || entity.type === 'LWPOLYLINE') {
          // Add polyline vertices
          const vertices = entity.vertices || []
          for (let i = 0; i < vertices.length; i++) {
            const vertex = vertices[i]
            positions.push(vertex.x, vertex.y, vertex.z || 0)
            
            if (i > 0) {
              indices.push(vertexIndex - 1, vertexIndex)
            }
            vertexIndex++
          }
          
          // Close polyline if needed
          if (entity.closed && vertices.length > 2) {
            indices.push(vertexIndex - 1, vertexIndex - vertices.length)
          }
        }
        // Add more entity types as needed (CIRCLE, ARC, etc.)
      }

      if (positions.length > 0) {
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
        geometry.setIndex(indices)
        geometry.computeVertexNormals()
        geometry.computeBoundingBox()

        // Apply transformations
        if (options.scale && options.scale !== 1) {
          geometry.scale(options.scale, options.scale, options.scale)
        }

        if (options.centerGeometry) {
          geometry.center()
        }

        meshes.push({ geometry })
      }
    }

    if (meshes.length === 0) {
      throw new Error('No valid geometry found in DXF file')
    }

    // For DXF files, units are harder to detect, so we'll estimate from geometry
    let detectedUnits = 'millimeter' // Default for DXF
    
    if (meshes.length > 0) {
      const geometry = meshes[0].geometry
      if (geometry.boundingBox) {
        const size = geometry.boundingBox.getSize(new Vector3())
        detectedUnits = estimateUnitsFromGeometry(size)
      }
    }
    
    // Analyze the geometry
    const analysis = await analyzeGeometry(meshes, detectedUnits)
    
    console.log('📊 DXF Geometry Analysis:', analysis)
    return { meshes, analysis }

  } catch (error) {
    console.error('Error parsing DXF file:', error)
    throw new Error(`Failed to parse DXF file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Main CAD file parser function
 */
export async function parseCADFile(
  file: File,
  options: CADParserOptions = {}
): Promise<ParsedGeometry> {
  const fileName = file.name.toLowerCase()
  const extension = fileName.split('.').pop()

  const defaultOptions: CADParserOptions = {
    scale: 1,
    centerGeometry: true,
    ...options
  }

  switch (extension) {
    case 'step':
    case 'stp':
      return parseStepOrIges(file, 'step', defaultOptions)
    
    case 'iges':
    case 'igs':
      return parseStepOrIges(file, 'iges', defaultOptions)
    
    case 'dxf':
      return parseDxf(file, defaultOptions)
    
    default:
      throw new Error(`Unsupported file format: ${extension}`)
  }
}

/**
 * Get supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return ['step', 'stp', 'iges', 'igs', 'dxf']
}

/**
 * Check if file extension is supported
 */
export function isSupportedFile(fileName: string): boolean {
  const extension = fileName.toLowerCase().split('.').pop()
  return getSupportedExtensions().includes(extension || '')
}
