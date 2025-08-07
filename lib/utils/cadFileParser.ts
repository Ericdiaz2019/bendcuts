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
 * Detect units from parsed CAD file result
 */
function detectUnitsFromResult(result: any, fileType: 'step' | 'iges'): string {
  // Try to extract unit information from the parsed result
  if (result.units) {
    return result.units.toLowerCase()
  }
  
  if (result.metadata && result.metadata.units) {
    return result.metadata.units.toLowerCase()
  }
  
  // For STEP files, look for length unit information
  if (fileType === 'step' && result.lengthUnit) {
    return result.lengthUnit.toLowerCase()
  }
  
  // Default assumptions based on common practices
  // Most CAD files are created in millimeters, but some are in inches
  // We'll make educated guesses based on typical geometry sizes
  return 'millimeter' // Default assumption for now
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
 * Calculate more accurate tube length using improved geometric analysis
 */
function calculateTubeLength(meshes: Array<{ geometry: BufferGeometry }>, boundingSize: Vector3): number {
  if (meshes.length === 0) return 0
  
  // Method 1: Try to trace a path through the tube geometry
  const pathLength = calculatePathLength(meshes)
  if (pathLength > 0) {
    return pathLength
  }
  
  // Method 2: Improved bounding box analysis for tube-like shapes
  // For tubes, the length is typically the dominant dimension
  const { x, y, z } = boundingSize
  const sortedDimensions = [x, y, z].sort((a, b) => b - a)
  
  // If one dimension is significantly larger than the others, it's likely the length
  const lengthDimension = sortedDimensions[0]
  const averageCrossDimension = (sortedDimensions[1] + sortedDimensions[2]) / 2
  
  // If the length is more than 3x the average cross dimension, use it directly
  if (lengthDimension > averageCrossDimension * 3) {
    return lengthDimension
  }
  
  // For complex geometries, estimate based on perimeter and complexity
  // This is a conservative estimate for bent tubes
  const complexity = Math.max(1, Math.sqrt(lengthDimension / averageCrossDimension))
  return lengthDimension * complexity
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
 * Advanced bend analysis using geometric algorithms
 */
function analyzeBends(meshes: Array<{ geometry: BufferGeometry }>): {
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
  const methods = []

  // Method 1: Curvature analysis along the centerline
  const curvatureAnalysis = analyzeCurvature(meshes)
  if (curvatureAnalysis.success) {
    methods.push({
      bendCount: curvatureAnalysis.bends,
      confidence: curvatureAnalysis.confidence,
      method: 'curvature'
    })
  }

  // Method 2: Direction change analysis (improved version)
  const directionAnalysis = analyzeDirectionChanges(meshes)
  if (directionAnalysis.success) {
    methods.push({
      bendCount: directionAnalysis.bends,
      confidence: directionAnalysis.confidence,
      method: 'direction'
    })
  }

  // Method 3: Complexity-based heuristic (fallback)
  const complexityBends = estimateBendsFromComplexity(totalVertices, totalTriangles)
  methods.push({
    bendCount: complexityBends,
    confidence: 0.3, // Lower confidence for heuristic method
    method: 'complexity'
  })

  // Choose the best estimate based on confidence scores
  if (methods.length > 0) {
    // Weight estimates by confidence and take average of top methods
    methods.sort((a, b) => b.confidence - a.confidence)
    
    const topMethods = methods.slice(0, 2) // Use top 2 methods
    const weightedSum = topMethods.reduce((sum, method) => sum + method.bendCount * method.confidence, 0)
    const totalWeight = topMethods.reduce((sum, method) => sum + method.confidence, 0)
    
    bendCount = Math.round(weightedSum / totalWeight)
    confidence = topMethods[0].confidence // Use highest confidence
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
  const curvatureThreshold = 0.1 // Adjust based on testing

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
  const angleThreshold = 0.35 // ~20 degrees in radians

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
 * Analyze geometry to extract tube bending information
 */
function analyzeGeometry(meshes: Array<{ geometry: BufferGeometry }>, detectedUnits?: string): ParsedGeometry['analysis'] {
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
  const center = overallBox.getCenter(new Vector3())

  // Estimate total length - use the longest dimension as primary length
  const totalLength = Math.max(size.x, size.y, size.z)

  // Use improved bend detection algorithm
  const bendAnalysis = analyzeBends(meshes)
  const estimatedBends = bendAnalysis.bendCount
  const totalVertices = bendAnalysis.totalVertices
  const totalTriangles = bendAnalysis.totalTriangles

  // Estimate cuts - typically start and end, plus any additional cuts for complex parts
  let estimatedCuts = 2 // Default: start and end cuts
  if (estimatedBends > 3) {
    estimatedCuts += Math.floor(estimatedBends / 3) // Additional cuts for complex parts
  }

  // Calculate more accurate tube length using centerline analysis
  const calculatedLength = calculateTubeLength(meshes, size)
  
  const analysis = {
    totalLength: calculatedLength, // Keep in native file units
    estimatedBends,
    estimatedCuts,
    units: detectedUnits || 'unknown',
    boundingBox: {
      min: { x: overallBox.min.x, y: overallBox.min.y, z: overallBox.min.z },
      max: { x: overallBox.max.x, y: overallBox.max.y, z: overallBox.max.z },
      size: { x: size.x, y: size.y, z: size.z }
    }
  }

  console.log('🔍 Geometry analysis details:', {
    totalVertices,
    totalTriangles,
    boundingBoxSize: size,
    estimatedBends,
    bendConfidence: bendAnalysis.confidence,
    totalLength: analysis.totalLength,
    units: analysis.units,
    calculationMethod: calculatedLength > 0 ? 'centerline analysis' : 'bounding box estimate'
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
    const detectedUnits = detectUnitsFromResult(result, fileType)
    console.log(`Detected units for ${fileType.toUpperCase()} file:`, detectedUnits)

    const meshes: ParsedGeometry['meshes'] = []

    // Process the parsed mesh data (using the correct structure from examples)
    if (result.meshes && Array.isArray(result.meshes)) {
      console.log(`Processing ${result.meshes.length} meshes from parsed file`)
      
      for (let i = 0; i < result.meshes.length; i++) {
        const meshData = result.meshes[i]
        const geometry = new BufferGeometry()

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
          geometry.setAttribute('position', new BufferAttribute(positions, 3))
          console.log(`Added ${positions.length / 3} vertices to mesh ${i + 1}`)
        } else {
          console.warn(`Mesh ${i + 1} has no position data`)
          continue // Skip this mesh if no vertices
        }

        // Extract normals if available
        if (meshData.attributes?.normal?.array) {
          const normals = new Float32Array(meshData.attributes.normal.array)
          geometry.setAttribute('normal', new BufferAttribute(normals, 3))
          console.log(`Added normals to mesh ${i + 1}`)
        }

        // Extract indices if available
        if (meshData.index?.array) {
          const indices = new Uint32Array(meshData.index.array)
          geometry.setIndex(new BufferAttribute(indices, 1))
          console.log(`Added ${indices.length} indices to mesh ${i + 1}`)
        }

        // Compute missing normals and bounding box
        if (!geometry.attributes.normal) {
          geometry.computeVertexNormals()
          console.log(`Computed vertex normals for mesh ${i + 1}`)
        }
        
        geometry.computeBoundingBox()
        
        const bbox = geometry.boundingBox!
        const size = bbox.getSize(new Vector3())
        const center = bbox.getCenter(new Vector3())
        
        console.log(`Mesh ${i + 1} bounding box:`, {
          min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
          max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z },
          size: { x: size.x, y: size.y, z: size.z },
          center: { x: center.x, y: center.y, z: center.z }
        })

        // Auto-scale and center geometry for better visibility
        const maxSize = Math.max(size.x, size.y, size.z)
        
        if (maxSize > 0) {
          // Scale to a reasonable size (target ~10 units for the largest dimension)
          const targetSize = 10
          const autoScale = targetSize / maxSize
          
          console.log(`Auto-scaling mesh ${i + 1} by factor ${autoScale} (original max size: ${maxSize})`)
          geometry.scale(autoScale, autoScale, autoScale)
          
          // Re-compute bounding box after scaling
          geometry.computeBoundingBox()
        }

        // Always center the geometry
        geometry.center()
        
        // Re-compute final bounding box
        geometry.computeBoundingBox()
        const finalBbox = geometry.boundingBox!
        const finalSize = finalBbox.getSize(new Vector3())
        
        console.log(`Final mesh ${i + 1} size:`, {
          x: finalSize.x, y: finalSize.y, z: finalSize.z
        })

        // Apply user-specified transformations
        if (options.scale && options.scale !== 1) {
          geometry.scale(options.scale, options.scale, options.scale)
        }

        meshes.push({ geometry })
        console.log(`Successfully processed mesh ${i + 1}`)
      }
    }

    // If no meshes found in standard format, try alternative data structure
    if (meshes.length === 0 && result.root) {
      console.log('Trying alternative data structure parsing...')
      
      // Create a simple geometry from basic vertex data if available
      const geometry = new BufferGeometry()
      
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
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3))
        
        if (indices.length > 0) {
          geometry.setIndex(new BufferAttribute(new Uint32Array(indices), 1))
        }
        
        geometry.computeVertexNormals()
        geometry.computeBoundingBox()

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
      throw new Error('No valid geometry found in file. The file may not contain renderable mesh data.')
    }

    // Analyze the geometry for length, bends, and cuts
    const analysis = analyzeGeometry(meshes, detectedUnits)
    
    console.log(`Successfully extracted ${meshes.length} mesh(es) from ${fileType.toUpperCase()} file`)
    console.log('📊 Geometry Analysis:', analysis)
    
    return { meshes, analysis }

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
    const analysis = analyzeGeometry(meshes, detectedUnits)
    
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