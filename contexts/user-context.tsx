'use client'

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { User, LoginForm, RegisterForm, ApiResponse, UserStats, RecentActivity } from '@/lib/types/user'
import { OrderDetail } from '@/lib/types/order-details'
import type { PendingOrderPayload, OrderActionType, UserOrderRecord } from '@/lib/types/orders'

// Context Types
interface UserState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  stats: UserStats | null
  recentActivity: RecentActivity[]
  orders: UserOrderRecord[]
  error: string | null
}

type UserAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REGISTER_SUCCESS'; payload: User }
  | { type: 'REGISTER_FAILURE'; payload: string }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'SET_STATS'; payload: UserStats }
  | { type: 'SET_ACTIVITY'; payload: RecentActivity[] }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<User['preferences']> }
  | { type: 'SET_ORDERS'; payload: UserOrderRecord[] }
  | { type: 'ADD_ORDER'; payload: UserOrderRecord }
  | { type: 'ADD_ACTIVITY'; payload: RecentActivity }

interface UserContextType extends UserState {
  login: (credentials: LoginForm) => Promise<void>
  register: (userData: RegisterForm) => Promise<void>
  logout: () => void
  updateProfile: (updates: Partial<User>) => Promise<void>
  refreshStats: () => Promise<void>
  refreshActivity: () => Promise<void>
  updatePreferences: (preferences: Partial<User['preferences']>) => Promise<void>
  submitOrder: (payload: PendingOrderPayload) => Promise<UserOrderRecord | null>
  saveOrderForLater: (payload: PendingOrderPayload) => Promise<UserOrderRecord | null>
  getOrder: (orderId: string) => Promise<OrderDetail | null>
}

const initialState: UserState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  stats: null,
  recentActivity: [],
  orders: [],
  error: null,
}

function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
        orders: [],
      }
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      }
    case 'REGISTER_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }
    case 'REGISTER_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
        orders: [],
      }
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      }
    case 'SET_STATS':
      return { ...state, stats: action.payload }
    case 'SET_ACTIVITY':
      return { ...state, recentActivity: action.payload }
    case 'SET_ORDERS':
      return { ...state, orders: action.payload }
    case 'ADD_ORDER':
      return { ...state, orders: [action.payload, ...state.orders] }
    case 'ADD_ACTIVITY':
      return { ...state, recentActivity: [action.payload, ...state.recentActivity].slice(0, 20) }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        user: state.user ? {
          ...state.user,
          preferences: { ...state.user.preferences, ...action.payload }
        } : null,
      }
    default:
      return state
  }
}

const UserContext = createContext<UserContextType | undefined>(undefined)

// Mock API functions (replace with real API calls)
const mockApi = {
  login: async (credentials: LoginForm): Promise<ApiResponse<User>> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mock validation
    if (credentials.email === 'demo@tubebend.com' && credentials.password === 'demo123') {
      const mockUser: User = {
        id: '1',
        email: 'demo@tubebend.com',
        firstName: 'Demo',
        lastName: 'User',
        company: 'Demo Company',
        phone: '+1-555-0123',
        role: 'user',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date(),
        preferences: {
          notifications: {
            email: true,
            sms: false,
            orderUpdates: true,
            marketing: false,
            quotes: true,
          },
          defaults: {
            materialId: 'steel-1',
            rushOrder: false,
            finishing: 'none',
            quantity: 1,
          },
          ui: {
            theme: 'system',
            language: 'en',
            currency: 'USD',
          },
        },
        shippingAddresses: [],
        paymentMethods: [],
        isActive: true,
      }
      return { success: true, data: mockUser }
    }

    return { success: false, error: 'Invalid credentials' }
  },

  register: async (userData: RegisterForm): Promise<ApiResponse<User>> => {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const mockUser: User = {
      id: Date.now().toString(),
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      company: userData.company,
      phone: userData.phone,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {
        notifications: {
          email: true,
          sms: false,
          orderUpdates: true,
          marketing: false,
          quotes: true,
        },
        defaults: {
          rushOrder: false,
          finishing: 'none',
          quantity: 1,
        },
        ui: {
          theme: 'system',
          language: 'en',
          currency: 'USD',
        },
      },
      shippingAddresses: [],
      paymentMethods: [],
      isActive: true,
    }

    return { success: true, data: mockUser }
  },

  getStats: async (userId: string): Promise<ApiResponse<UserStats>> => {
    await new Promise(resolve => setTimeout(resolve, 500))

    const mockStats: UserStats = {
      totalProjects: 24,
      totalOrders: 18,
      totalSpent: 8472.50,
      averageOrderValue: 470.69,
      projectsInProgress: 3,
      ordersInProduction: 2,
      lastOrderDate: new Date('2024-09-15'),
    }

    return { success: true, data: mockStats }
  },

  getRecentActivity: async (userId: string): Promise<ApiResponse<RecentActivity[]>> => {
    await new Promise(resolve => setTimeout(resolve, 300))

    const mockActivity: RecentActivity[] = [
      {
        id: '1',
        userId,
        type: 'order_shipped',
        title: 'Order #TB-2024-018 shipped',
        description: 'Your tube bending order has been shipped via UPS Ground',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        metadata: { trackingNumber: '1Z999AA1234567890' }
      },
      {
        id: '2',
        userId,
        type: 'project_updated',
        title: 'Project "Exhaust System" updated',
        description: 'Material specification changed to 304 Stainless Steel',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      },
      {
        id: '3',
        userId,
        type: 'quote_generated',
        title: 'New quote generated',
        description: 'Quote #QT-2024-007 for 5 units of tube assembly',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        metadata: { quoteId: 'QT-2024-007', amount: 234.50 }
      },
    ]

    return { success: true, data: mockActivity }
  },

  updateUser: async (userId: string, updates: Partial<User>): Promise<ApiResponse<User>> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { success: true, data: updates as User }
  },

  updatePreferences: async (userId: string, preferences: Partial<User['preferences']>): Promise<ApiResponse<User['preferences']>> => {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { success: true, data: preferences as User['preferences'] }
  },

  getOrder: async (orderId: string): Promise<OrderDetail | null> => {
    await new Promise(resolve => setTimeout(resolve, 500))

    // Mock order detail - in real app this would fetch from API
    const mockOrderDetail: OrderDetail = {
      id: orderId,
      orderNumber: 'TB-2024-018',
      status: 'shipped',
      createdAt: new Date('2024-09-10'),
      updatedAt: new Date('2024-09-15'),
      estimatedDelivery: new Date('2024-09-18'),
      trackingNumber: '1Z999AA1234567890',
      notes: 'Customer requested rush processing',

      customer: {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        company: 'Demo Company',
        phone: '+1-555-0123'
      },

      configurations: [
        {
          id: 'config-1',
          name: 'Exhaust System - Main Pipe',
          description: 'Primary exhaust pipe with 3 bends',
          quantity: 2,
          status: 'shipped',

          specifications: {
            material: {
              id: 'steel-1',
              name: 'Steel (1" Tube)',
              description: 'Carbon steel tubing',
              properties: {
                density: 0.284,
                tensileStrength: 58000,
                color: '#C0C0C0'
              }
            },
            tubeSpecification: {
              diameter: '1"',
              wallThickness: '0.065"',
              length: 48,
              units: 'inches'
            },
            bendRequirements: [
              { angle: 45, radius: 3, position: 12, tolerance: 1 },
              { angle: 90, radius: 3, position: 24, tolerance: 1 },
              { angle: 30, radius: 3, position: 36, tolerance: 1 }
            ],
            tolerances: {
              bendAngle: 1,
              centerlineRadius: 0.125,
              length: 0.02
            },
            finishing: {
              type: 'polish',
              notes: 'Mirror finish required'
            },
            rushOrder: true
          },

          pricing: {
            materialCost: 45.20,
            bendingCost: 36.00,
            finishingCost: 24.00,
            setupCost: 50.00,
            rushFee: 25.00,
            subtotal: 180.20,
            leadTime: '3-5 days'
          },

          files: [
            {
              id: 'file-1',
              name: 'exhaust-main.step',
              type: 'cad',
              url: '/files/exhaust-main.step',
              uploadedAt: new Date('2024-09-10'),
              uploadedBy: 'John Doe',
              version: 1
            }
          ],

          statusUpdates: []
        }
      ],

      pricing: {
        subtotal: 234.50,
        materialCost: 67.80,
        bendingCost: 54.00,
        finishingCost: 36.00,
        setupCost: 50.00,
        rushFee: 25.00,
        tax: 18.76,
        shipping: 15.00,
        total: 268.26
      },

      shippingAddress: {
        id: 'addr-1',
        name: 'John Doe',
        company: 'Demo Company',
        street1: '123 Main St',
        street2: 'Suite 100',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
        phone: '+1-555-0123'
      },

      billingAddress: {
        id: 'addr-2',
        name: 'John Doe',
        company: 'Demo Company',
        street1: '123 Main St',
        street2: 'Suite 100',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
        phone: '+1-555-0123'
      },

      paymentMethod: {
        id: 'pm-1',
        type: 'card',
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2026,
        isDefault: true,
        isValid: true
      },

      statusHistory: [
        {
          id: 'sh-1',
          status: 'pending',
          timestamp: new Date('2024-09-10T09:00:00'),
          updatedBy: 'System',
          notes: 'Order received and validated'
        },
        {
          id: 'sh-2',
          status: 'confirmed',
          timestamp: new Date('2024-09-10T09:15:00'),
          updatedBy: 'System',
          notes: 'Payment processed successfully'
        },
        {
          id: 'sh-3',
          status: 'processing',
          timestamp: new Date('2024-09-10T14:30:00'),
          updatedBy: 'Production Team',
          notes: 'Materials allocated and production started'
        },
        {
          id: 'sh-4',
          status: 'in-production',
          timestamp: new Date('2024-09-11T10:00:00'),
          updatedBy: 'Production Team',
          notes: 'Bending operations in progress'
        },
        {
          id: 'sh-5',
          status: 'quality-check',
          timestamp: new Date('2024-09-14T16:00:00'),
          updatedBy: 'Quality Team',
          notes: 'Quality inspection passed'
        },
        {
          id: 'sh-6',
          status: 'ready-to-ship',
          timestamp: new Date('2024-09-14T17:00:00'),
          updatedBy: 'Shipping Team',
          notes: 'Ready for shipment'
        },
        {
          id: 'sh-7',
          status: 'shipped',
          timestamp: new Date('2024-09-15T08:30:00'),
          updatedBy: 'Shipping Team',
          notes: 'Shipped via UPS Ground'
        }
      ],

      files: [
        {
          id: 'file-inv',
          name: 'Invoice-TB-2024-018.pdf',
          type: 'invoice',
          url: '/invoices/TB-2024-018.pdf',
          uploadedAt: new Date('2024-09-10T09:15:00'),
          size: 245760
        },
        {
          id: 'file-pack',
          name: 'Packing-Slip-TB-2024-018.pdf',
          type: 'packing-slip',
          url: '/packing-slips/TB-2024-018.pdf',
          uploadedAt: new Date('2024-09-14T17:00:00'),
          size: 189440
        }
      ],

      manufacturing: {
        startDate: new Date('2024-09-10T14:30:00'),
        estimatedCompletion: new Date('2024-09-14T16:00:00'),
        actualCompletion: new Date('2024-09-14T16:00:00'),
        qualityCheckPassed: true,
        notes: 'All specifications met. Rush order completed ahead of schedule.'
      },

      shipping: {
        carrier: 'UPS',
        service: 'Ground',
        trackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA1234567890',
        shippedAt: new Date('2024-09-15T08:30:00')
      }
    }

    return mockOrderDetail
  },
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, initialState)

  const ordersStorageKey = (userId: string) => `tubebend_orders_${userId}`

  const loadOrdersFromStorage = (userId: string): UserOrderRecord[] => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(ordersStorageKey(userId))
      if (!stored) return []
      const parsed = JSON.parse(stored) as UserOrderRecord[]
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.warn('Failed to load stored orders:', error)
      return []
    }
  }

  const persistOrdersToStorage = (userId: string, orders: UserOrderRecord[]) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(ordersStorageKey(userId), JSON.stringify(orders))
    } catch (error) {
      console.warn('Failed to persist orders:', error)
    }
  }

  const generateOrderNumber = () => {
    const now = new Date()
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const suffix = String(now.getTime()).slice(-5)
    return `TB-${timestamp}-${suffix}`
  }

  const createOrderRecord = (payload: PendingOrderPayload, action: OrderActionType): UserOrderRecord => {
    const now = new Date()
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `order-${now.getTime()}`

    return {
      id,
      orderNumber: generateOrderNumber(),
      status: action === 'submit' ? 'submitted' : 'saved',
      action,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      quantity: payload.quantity,
      materialName: payload.materialName,
      materialId: payload.materialId,
      gauge: payload.gauge,
      fileName: payload.file.name,
      lengthInches: payload.file.lengthInches,
      lengthMm: payload.file.lengthMm,
      total: payload.quote.total,
      pricePerPart: payload.quote.pricePerPart,
    }
  }

  const handleOrderCreation = (
    payload: PendingOrderPayload,
    action: OrderActionType,
    baseOrders?: UserOrderRecord[]
  ): UserOrderRecord | null => {
    if (!state.user) {
      console.warn('Attempted to create order without authenticated user')
      return null
    }

    const currentOrders = baseOrders ?? state.orders
    const newOrder = createOrderRecord(payload, action)
    const updatedOrders = [newOrder, ...currentOrders]

    persistOrdersToStorage(state.user.id, updatedOrders)
    dispatch({ type: 'SET_ORDERS', payload: updatedOrders })

    const activity: RecentActivity = {
      id: newOrder.id,
      userId: state.user.id,
      type: action === 'submit' ? 'order_placed' : 'quote_generated',
      title: action === 'submit'
        ? `Order ${newOrder.orderNumber} submitted`
        : `Order draft saved (${newOrder.orderNumber})`,
      description: action === 'submit'
        ? `Submitted ${newOrder.quantity} part(s) of ${newOrder.materialName}`
        : `Saved ${newOrder.quantity} part(s) of ${newOrder.materialName} for later`,
      timestamp: new Date(newOrder.createdAt),
      metadata: {
        total: newOrder.total,
        quantity: newOrder.quantity,
        status: newOrder.status,
      }
    }

    dispatch({ type: 'ADD_ACTIVITY', payload: activity })

    if (action === 'submit') {
      const stats = state.stats ?? {
        totalProjects: 0,
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        projectsInProgress: 0,
        ordersInProduction: 0,
      }

      const totalOrders = (stats.totalOrders || 0) + 1
      const totalSpent = (stats.totalSpent || 0) + newOrder.total
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : newOrder.total

      dispatch({
        type: 'SET_STATS',
        payload: {
          ...stats,
          totalOrders,
          totalSpent,
          averageOrderValue,
          lastOrderDate: new Date(newOrder.createdAt),
        }
      })
    }

    return newOrder
  }

  useEffect(() => {
    // Check for stored auth on mount
    const storedUser = localStorage.getItem('tubebend_user')
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        dispatch({ type: 'LOGIN_SUCCESS', payload: user })
        const storedOrders = loadOrdersFromStorage(user.id)
        if (storedOrders.length > 0) {
          dispatch({ type: 'SET_ORDERS', payload: storedOrders })
        } else {
          dispatch({ type: 'SET_ORDERS', payload: [] })
        }
      } catch (error) {
        localStorage.removeItem('tubebend_user')
      }
    } else {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  const login = async (credentials: LoginForm) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'CLEAR_ERROR' })

    try {
      const response = await mockApi.login(credentials)

      if (response.success && response.data) {
        localStorage.setItem('tubebend_user', JSON.stringify(response.data))
        dispatch({ type: 'LOGIN_SUCCESS', payload: response.data })

        // Load user stats and activity
        const [statsResponse, activityResponse] = await Promise.all([
          mockApi.getStats(response.data.id),
          mockApi.getRecentActivity(response.data.id),
        ])

        if (statsResponse.success && statsResponse.data) {
          dispatch({ type: 'SET_STATS', payload: statsResponse.data })
        }

        if (activityResponse.success && activityResponse.data) {
          dispatch({ type: 'SET_ACTIVITY', payload: activityResponse.data })
        }

        const storedOrders = loadOrdersFromStorage(response.data.id)
        dispatch({ type: 'SET_ORDERS', payload: storedOrders })
      } else {
        dispatch({ type: 'LOGIN_FAILURE', payload: response.error || 'Login failed' })
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: 'An unexpected error occurred' })
    }
  }

  const register = async (userData: RegisterForm) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'CLEAR_ERROR' })

    try {
      const response = await mockApi.register(userData)

      if (response.success && response.data) {
        localStorage.setItem('tubebend_user', JSON.stringify(response.data))
        dispatch({ type: 'REGISTER_SUCCESS', payload: response.data })
      } else {
        dispatch({ type: 'REGISTER_FAILURE', payload: response.error || 'Registration failed' })
      }
    } catch (error) {
      dispatch({ type: 'REGISTER_FAILURE', payload: 'An unexpected error occurred' })
    }
  }

  const logout = () => {
    localStorage.removeItem('tubebend_user')
    dispatch({ type: 'LOGOUT' })
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!state.user) return

    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const response = await mockApi.updateUser(state.user.id, updates)

      if (response.success && response.data) {
        const updatedUser = { ...state.user, ...response.data }
        localStorage.setItem('tubebend_user', JSON.stringify(updatedUser))
        dispatch({ type: 'UPDATE_USER', payload: response.data })
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const refreshStats = async () => {
    if (!state.user) return

    try {
      const response = await mockApi.getStats(state.user.id)
      if (response.success && response.data) {
        dispatch({ type: 'SET_STATS', payload: response.data })
      }
    } catch (error) {
      console.error('Failed to refresh stats:', error)
    }
  }

  const refreshActivity = async () => {
    if (!state.user) return

    try {
      const response = await mockApi.getRecentActivity(state.user.id)
      if (response.success && response.data) {
        dispatch({ type: 'SET_ACTIVITY', payload: response.data })
      }
    } catch (error) {
      console.error('Failed to refresh activity:', error)
    }
  }

  const updatePreferences = async (preferences: Partial<User['preferences']>) => {
    if (!state.user) return

    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const response = await mockApi.updatePreferences(state.user.id, preferences)

      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_PREFERENCES', payload: response.data })
      }
    } catch (error) {
      console.error('Failed to update preferences:', error)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const getOrder = async (orderId: string): Promise<OrderDetail | null> => {
    try {
      return await mockApi.getOrder(orderId)
    } catch (error) {
      console.error('Failed to get order:', error)
      return null
    }
  }

  const submitOrder = async (payload: PendingOrderPayload) => {
    return handleOrderCreation(payload, 'submit')
  }

  const saveOrderForLater = async (payload: PendingOrderPayload) => {
    return handleOrderCreation(payload, 'save')
  }

  const value: UserContextType = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    refreshStats,
    refreshActivity,
    updatePreferences,
    submitOrder,
    saveOrderForLater,
    getOrder,
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
