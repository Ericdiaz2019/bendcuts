import { ManufacturingService, QuoteBreakdown } from '@/lib/utils/quoteCalculator'

export type OrderActionType = 'submit' | 'save'

/** Per-feature service add-on (tap/miter/tolerance) priced into the quote. */
export interface PendingOrderFeature {
  featureId: string
  serviceId: string
  params: Record<string, unknown>
  costDeltaPerPart: number
  summary: string
}

export interface PendingOrderPayload {
  materialId: string
  materialName: string
  gauge: string
  quantity: number
  service?: ManufacturingService
  quote: QuoteBreakdown
  file: {
    name: string
    lengthInches: number
    lengthMm: number
    originalUnits?: string
    bends: number
    cuts: number
    laserFeatures?: number
    storagePath?: string
    fileSize?: number
  }
  /** Per-feature service add-ons; their cost is already folded into `quote`. */
  featureConfigs?: PendingOrderFeature[]
  createdAt: string
  idempotencyKey?: string
}

export interface UserOrderRecord {
  id: string
  orderNumber: string
  status: 'submitted' | 'saved'
  action: OrderActionType
  createdAt: string
  updatedAt: string
  quantity: number
  materialName: string
  materialId?: string
  gauge: string
  fileName: string
  lengthInches: number
  lengthMm: number
  total: number
  pricePerPart: number
}
