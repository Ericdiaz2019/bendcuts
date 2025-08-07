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
  fileType: 'step' | 'iges' | 'dxf' | 'stp' | 'igs' | string
  isValid: boolean
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