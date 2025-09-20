import { Material } from './configuration'

// User Account Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  company?: string
  phone?: string
  avatar?: string
  role: 'user' | 'admin' | 'business'
  createdAt: Date
  updatedAt: Date
  preferences: UserPreferences
  billingAddress?: Address
  shippingAddresses: Address[]
  paymentMethods: PaymentMethod[]
  isActive: boolean
}

export interface UserPreferences {
  notifications: {
    email: boolean
    sms: boolean
    orderUpdates: boolean
    marketing: boolean
    quotes: boolean
  }
  defaults: {
    materialId?: string
    rushOrder: boolean
    finishing: 'none' | 'deburr' | 'polish' | 'paint' | 'powder-coat'
    quantity: number
  }
  ui: {
    theme: 'light' | 'dark' | 'system'
    language: string
    currency: string
  }
}

// Project/Order Types
export interface Project {
  id: string
  userId: string
  name: string
  description?: string
  status: ProjectStatus
  createdAt: Date
  updatedAt: Date
  files: ProjectFile[]
  configurations: Configuration[]
  orders: Order[]
  tags: string[]
  isTemplate: boolean
  sharedWith: string[] // User IDs
}

export interface ProjectFile {
  id: string
  projectId: string
  fileName: string
  fileSize: number
  fileType: 'step' | 'iges' | 'dxf' | 'stp' | 'igs'
  fileUrl: string
  uploadedAt: Date
  isPrimary: boolean
  version: number
}

export interface Configuration {
  id: string
  projectId: string
  material: Material
  tubeSpecification: {
    diameter: string
    wallThickness: string
    length: number
  }
  bendRequirements: {
    angle: number
    radius: number
    position: number
  }[]
  manufacturingSpec: {
    quantity: number
    tolerances: {
      bendAngle: number
      centerlineRadius: number
      length: number
    }
    finishing: {
      type: 'none' | 'deburr' | 'polish' | 'paint' | 'powder-coat'
      notes?: string
    }
    rushOrder: boolean
  }
  pricing: {
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
  savedAt: Date
  isCurrent: boolean
}

export interface Order {
  id: string
  userId: string
  projectId?: string
  orderNumber: string
  status: OrderStatus
  createdAt: Date
  updatedAt: Date
  configurations: Configuration[]
  pricing: {
    subtotal: number
    tax: number
    shipping: number
    total: number
  }
  shippingAddress: Address
  billingAddress: Address
  paymentMethod: PaymentMethod
  trackingNumber?: string
  estimatedDelivery?: Date
  actualDelivery?: Date
  notes?: string
  files: OrderFile[]
}

export interface OrderFile {
  id: string
  orderId: string
  fileName: string
  fileUrl: string
  type: 'drawing' | 'specification' | 'invoice' | 'packing-slip' | 'certificate'
  uploadedAt: Date
}

// Supporting Types
export interface Address {
  id: string
  userId: string
  type: 'billing' | 'shipping'
  name: string
  company?: string
  street1: string
  street2?: string
  city: string
  state: string
  zipCode: string
  country: string
  isDefault: boolean
  phone?: string
}

export interface PaymentMethod {
  id: string
  userId: string
  type: 'card' | 'bank' | 'paypal'
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
  isValid: boolean
}

export type ProjectStatus =
  | 'draft'
  | 'ready'
  | 'quoted'
  | 'ordered'
  | 'in-production'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'archived'

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

// Dashboard/Analytics Types
export interface UserStats {
  totalProjects: number
  totalOrders: number
  totalSpent: number
  averageOrderValue: number
  projectsInProgress: number
  ordersInProduction: number
  lastOrderDate?: Date
}

export interface RecentActivity {
  id: string
  userId: string
  type: 'project_created' | 'project_updated' | 'order_placed' | 'order_shipped' | 'quote_generated'
  title: string
  description: string
  timestamp: Date
  metadata?: Record<string, any>
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Form Types
export interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

export interface RegisterForm {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  company?: string
  phone?: string
  acceptTerms: boolean
}

export interface ProfileForm {
  firstName: string
  lastName: string
  company?: string
  phone?: string
  avatar?: File
}

export interface AddressForm {
  name: string
  company?: string
  street1: string
  street2?: string
  city: string
  state: string
  zipCode: string
  country: string
  phone?: string
  isDefault: boolean
}

export interface PaymentMethodForm {
  type: 'card' | 'bank' | 'paypal'
  cardNumber?: string
  expiryMonth?: number
  expiryYear?: number
  cvv?: string
  accountNumber?: string
  routingNumber?: string
  paypalEmail?: string
}
