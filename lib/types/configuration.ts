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

export type CADFileType = 'step' | 'iges' | 'dxf' | 'stp' | 'igs'

export type CADParseStatus = 'idle' | 'accepted' | 'parsing' | 'parsed' | 'review_required' | 'failed'

export interface CADAnalysis {
  totalLength: number
  estimatedBends: number
  estimatedCuts: number
  units: string
  originalUnits?: string
  unitConfidence?: number
  lengthCalculationMethod?: string
  lengthConfidence?: number
  bendCalculationMethod?: string
  bendConfidence?: number
  cutCalculationMethod?: string
  cutConfidence?: number
  requiresManualReview?: boolean
  warnings?: string[]
  boundingBox: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
    size: { x: number; y: number; z: number }
  }
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
}

export type ConfigurationStep = 'upload' | 'material' | 'specifications' | 'review' | 'quote'
