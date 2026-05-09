import { ManufacturingService, QuoteBreakdown } from '@/lib/utils/quoteCalculator'

export type OrderActionType = 'submit' | 'save'

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
