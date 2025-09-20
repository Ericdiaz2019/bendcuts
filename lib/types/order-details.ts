// Extended types for detailed order view
export interface OrderDetail {
  id: string
  orderNumber: string
  status: OrderStatus
  createdAt: Date
  updatedAt: Date
  estimatedDelivery?: Date
  actualDelivery?: Date
  trackingNumber?: string
  notes?: string

  // Customer Information
  customer: {
    id: string
    name: string
    email: string
    company?: string
    phone?: string
  }

  // Configurations (Order Items)
  configurations: OrderConfiguration[]

  // Pricing Breakdown
  pricing: {
    subtotal: number
    materialCost: number
    bendingCost: number
    finishingCost: number
    setupCost: number
    rushFee: number
    tax: number
    shipping: number
    total: number
  }

  // Addresses
  shippingAddress: Address
  billingAddress: Address

  // Payment
  paymentMethod: PaymentMethod

  // Status History
  statusHistory: OrderStatusUpdate[]

  // Files
  files: OrderFile[]

  // Manufacturing Details
  manufacturing: {
    startDate?: Date
    estimatedCompletion?: Date
    actualCompletion?: Date
    qualityCheckPassed?: boolean
    notes?: string
  }

  // Shipping Details
  shipping: {
    carrier?: string
    service?: string
    trackingUrl?: string
    shippedAt?: Date
    deliveredAt?: Date
  }
}

export interface OrderConfiguration {
  id: string
  name: string
  description?: string
  quantity: number
  status: ConfigurationStatus

  // Technical Specifications
  specifications: {
    material: {
      id: string
      name: string
      description: string
      properties?: {
        density: number
        tensileStrength: number
        color: string
      }
    }
    tubeSpecification: {
      diameter: string
      wallThickness: string
      length: number
      units: 'inches' | 'mm'
    }
    bendRequirements: {
      angle: number
      radius: number
      position: number
      tolerance?: number
    }[]
    tolerances: {
      bendAngle: number
      centerlineRadius: number
      length: number
    }
    finishing: {
      type: 'none' | 'deburr' | 'polish' | 'paint' | 'powder-coat'
      notes?: string
      color?: string
    }
    rushOrder: boolean
  }

  // Pricing for this configuration
  pricing: {
    materialCost: number
    bendingCost: number
    finishingCost: number
    setupCost: number
    rushFee: number
    subtotal: number
    leadTime: string
  }

  // Files associated with this configuration
  files: ConfigurationFile[]

  // Status updates
  statusUpdates: ConfigurationStatusUpdate[]
}

export interface ConfigurationFile {
  id: string
  name: string
  type: 'cad' | 'drawing' | 'specification' | 'photo' | 'certificate'
  url: string
  uploadedAt: Date
  uploadedBy: string
  version: number
}

export interface OrderStatusUpdate {
  id: string
  status: OrderStatus
  timestamp: Date
  updatedBy: string
  notes?: string
  metadata?: Record<string, any>
}

export interface ConfigurationStatusUpdate {
  id: string
  status: ConfigurationStatus
  timestamp: Date
  updatedBy: string
  notes?: string
}

export type ConfigurationStatus =
  | 'pending'
  | 'processing'
  | 'bending'
  | 'finishing'
  | 'quality-check'
  | 'ready'
  | 'shipped'
  | 'delivered'

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'in-production'
  | 'quality-check'
  | 'ready-to-ship'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export interface Address {
  id: string
  name: string
  company?: string
  street1: string
  street2?: string
  city: string
  state: string
  zipCode: string
  country: string
  phone?: string
}

export interface PaymentMethod {
  id: string
  type: 'card' | 'bank' | 'paypal'
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
  isValid: boolean
}

export interface OrderFile {
  id: string
  name: string
  type: 'invoice' | 'packing-slip' | 'certificate' | 'drawing' | 'photo'
  url: string
  uploadedAt: Date
  size?: number
}

// Legacy types for backward compatibility
export { Address as LegacyAddress, PaymentMethod as LegacyPaymentMethod } from '../user'
