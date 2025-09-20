import { QuoteBreakdown } from '@/lib/utils/quoteCalculator'

export type OrderActionType = 'submit' | 'save'

export interface PendingOrderPayload {
  materialId?: string
  materialName: string
  gauge: string
  quantity: number
  quote: QuoteBreakdown
  file: {
    name: string
    lengthInches: number
    lengthMm: number
    originalUnits?: string
    bends: number
    cuts: number
  }
  createdAt: string
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
