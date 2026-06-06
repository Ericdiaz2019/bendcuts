export interface Material {
  id: string
  name: string
  description: string
  basePrice: number // per foot
  available: boolean
  pricePerLb?: number
  properties?: {
    density: number
    tensile_strength: number
    color: string
  }
}

export type CADFileType = 'step' | 'iges' | 'dxf' | 'stp' | 'igs' | 'eps' | 'ai' | 'dwg'

export type CADParseStatus = 'idle' | 'accepted' | 'parsing' | 'parsed' | 'review_required' | 'failed'

export type CADPreviewKind = 'mesh3d' | 'vector2d' | 'document2d' | 'none'

export type DetectedPartShape = 'tube' | 'sheet-bracket' | 'flat-sheet' | 'unknown'

export type FeatureKind = 'bend' | 'end-cut' | 'hole'

export interface FeatureBase {
  /** Stable hash of (kind + rounded position + primary dim). Persists across re-parse. */
  id: string
  kind: FeatureKind
  /**
   * Position in the same coordinate space as `CADAnalysis.boundingBox` — i.e. the
   * source mesh units (typically millimeters for STEP, but not guaranteed). The 3D
   * viewer derives the display-space transform from the bounding box, so positions
   * here must be in the un-normalized scene space, NOT pre-converted to mm.
   */
  position: [number, number, number]
  /** Some dimensions are inferred or approximated; flag for UI to communicate confidence. */
  estimated?: boolean
}

export interface BendFeature extends FeatureBase {
  kind: 'bend'
  angleDeg: number
  centerlineRadiusMm: number
  /** Optional — direction normal to the bend plane. */
  planeNormal?: [number, number, number]
}

export interface EndCutFeature extends FeatureBase {
  kind: 'end-cut'
  /** 0 = start of the tube, 1 = finish. */
  endIndex: 0 | 1
  defaultAngleDeg: number
}

export interface HoleFeature extends FeatureBase {
  kind: 'hole'
  diameterMm: number
  depthMm: number
  through: boolean
}

export type Feature = BendFeature | EndCutFeature | HoleFeature

/** Service applied to a single detected feature (or "all of this size"). */
export type FeatureServiceId =
  | 'tap'
  | 'tolerance'
  | 'miter'
  | 'chamfer'
  | 'cope'
  | 'countersink'

export interface FeatureConfig {
  featureId: string
  serviceId: FeatureServiceId
  /** Service-specific params: thread spec, miter angle, tolerance tier, etc. */
  params: Record<string, unknown>
  /** Pre-computed cost increment per-piece (avoids re-deriving in the UI). */
  costDeltaPerPart: number
  /** Human-readable summary shown in feature row. */
  summary: string
}

export type FeatureConfigMap = Record<string, FeatureConfig>

export interface CADAnalysis {
  sourceFormat?: CADFileType
  previewKind?: CADPreviewKind
  totalLength: number
  estimatedBends: number
  estimatedCuts: number
  laserFeatureCount?: number
  partShape?: DetectedPartShape
  recommendedService?:
    | 'tube-bending'
    | 'tube-laser'
    | 'sheet-laser'
    | 'straight-cut'
    | '3d-printing'
  units: string
  originalUnits?: string
  unitConfidence?: number
  lengthCalculationMethod?: string
  lengthConfidence?: number
  bendCalculationMethod?: string
  bendConfidence?: number
  cutCalculationMethod?: string
  cutConfidence?: number
  instantQuoteEligible?: boolean
  quoteConfidence?: number
  quoteBlockingReasons?: string[]
  requiresManualReview?: boolean
  warnings?: string[]
  boundingBox: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
    size: { x: number; y: number; z: number }
  }
  /** Per-feature geometry for the configurable-features UI. May be empty when extraction is unsupported. */
  features?: Feature[]
  /** SHA-256 of the source file — used to persist feature configurations across reloads. */
  fileHash?: string
}

export interface TubeSpecification {
  diameter: string
  wallThickness: string
  length: number
}

export interface BendRequirement {
  angle: number
  radius: number
  position: number
}

export interface FileUploadData {
  file: File | null
  fileName: string
  fileSize: number
  fileType: CADFileType | ''
  isValid: boolean
  parseStatus?: CADParseStatus
  analysis?: CADAnalysis
  parseError?: string
  preview?: string
}

export interface MaterialSelection {
  materialId: string
  tubeSpec: TubeSpecification
}

export interface ManufacturingSpec {
  quantity: number
  tolerances: {
    bendAngle: number // ±degrees
    centerlineRadius: number // ±inches
    length: number // ±inches
  }
  finishing: {
    type: 'none' | 'deburr' | 'polish' | 'paint' | 'powder-coat'
    notes?: string
  }
  rushOrder: boolean
}

export interface PricingBreakdown {
  materialCost: number
  bendingCost: number
  finishingCost: number
  setupCost: number
  rushFee: number
  subtotal: number
  tax: number
  total: number
  leadTime: string
}

export interface ConfigurationState {
  currentStep: number
  fileUpload: FileUploadData
  materialSelection: MaterialSelection
  specifications: ManufacturingSpec
  pricing: PricingBreakdown
  isComplete: boolean
  /** Configurable per-feature services (tapping, miters, bend tolerance). */
  featureConfigs: FeatureConfigMap
}

export type ConfigurationStep = 'upload' | 'material' | 'specifications' | 'review' | 'quote'
