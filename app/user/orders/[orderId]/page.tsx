'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Download,
  FileText,
  Package,
  Truck,
  CreditCard,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Share,
  Printer,
  Mail,
  Phone,
  Building,
  User,
  LogOut,
  Bell,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { useUser } from '@/contexts/user-context'
import { OrderDetail, OrderStatus } from '@/lib/types/order-details'

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.orderId as string

  const { user, isLoading, isAuthenticated, logout } = useUser()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) return

      setLoading(true)
      try {
        // Mock API call - replace with real API
        const mockOrder: OrderDetail = {
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

        setOrder(mockOrder)
      } catch (error) {
        console.error('Failed to fetch order details:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrderDetails()
  }, [orderId])

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'in-production':
        return 'bg-orange-100 text-orange-800'
      case 'quality-check':
        return 'bg-purple-100 text-purple-800'
      case 'ready-to-ship':
        return 'bg-indigo-100 text-indigo-800'
      case 'shipped':
        return 'bg-blue-100 text-blue-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'refunded':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
        return <Clock className="w-4 h-4" />
      case 'processing':
      case 'in-production':
      case 'quality-check':
        return <RefreshCw className="w-4 h-4" />
      case 'ready-to-ship':
      case 'shipped':
        return <Truck className="w-4 h-4" />
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Package className="w-4 h-4" />
    }
  }

  const getProgressPercentage = (status: OrderStatus) => {
    const statusOrder = [
      'pending', 'confirmed', 'processing', 'in-production',
      'quality-check', 'ready-to-ship', 'shipped', 'delivered'
    ]
    const currentIndex = statusOrder.indexOf(status)
    return Math.max(0, (currentIndex / (statusOrder.length - 1)) * 100)
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!user || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">The order you're looking for doesn't exist or you don't have access to it.</p>
          <Button asChild>
            <Link href="/user/orders">Back to Orders</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/user/orders">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Orders
                </Link>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="text-2xl font-bold text-gray-900">TubeBend</div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/user/dashboard" className="text-gray-600 hover:text-gray-900 font-medium">
                Dashboard
              </Link>
              <Link href="/user/projects" className="text-gray-600 hover:text-gray-900 font-medium">
                Projects
              </Link>
              <Link href="/user/orders" className="text-blue-600 hover:text-blue-700 font-medium">
                Orders
              </Link>
              <Link href="/user/profile" className="text-gray-600 hover:text-gray-900 font-medium">
                Profile
              </Link>
              <Link href="/user/settings" className="text-gray-600 hover:text-gray-900 font-medium">
                Settings
              </Link>
              <div className="flex items-center space-x-4 ml-8">
                <Button variant="outline" size="sm">
                  <Bell className="w-4 h-4" />
                </Button>
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} alt={user.firstName} />
                    <AvatarFallback>
                      {user.firstName[0]}{user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{user.firstName} {user.lastName}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-4">
                <h1 className="text-3xl font-bold text-gray-900">Order {order.orderNumber}</h1>
                <Badge className={getStatusColor(order.status)}>
                  {getStatusIcon(order.status)}
                  <span className="ml-1 capitalize">{order.status.replace('-', ' ')}</span>
                </Badge>
              </div>
              <p className="mt-2 text-gray-600">
                Placed on {order.createdAt.toLocaleDateString()} • Updated {order.updatedAt.toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="outline">
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                Download Invoice
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Order Progress</span>
              <span>{Math.round(getProgressPercentage(order.status))}% Complete</span>
            </div>
            <Progress value={getProgressPercentage(order.status)} className="h-2" />
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Order Summary */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {order.configurations.map((config) => (
                        <div key={config.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-medium">{config.name}</h4>
                              <p className="text-sm text-gray-600">{config.description}</p>
                              <p className="text-sm text-gray-500 mt-1">
                                Quantity: {config.quantity}
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {config.status.replace('-', ' ')}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Material:</span>
                              <span className="ml-2 font-medium">{config.specifications.material.name}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Dimensions:</span>
                              <span className="ml-2 font-medium">
                                {config.specifications.tubeSpecification.diameter}" ×
                                {config.specifications.tubeSpecification.wallThickness}" ×
                                {config.specifications.tubeSpecification.length}"
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Bends:</span>
                              <span className="ml-2 font-medium">{config.specifications.bendRequirements.length}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Finishing:</span>
                              <span className="ml-2 font-medium capitalize">{config.specifications.finishing.type}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                {order.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700">{order.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Order Details Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-600">Order Number</span>
                      <p className="font-medium">{order.orderNumber}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Order Date</span>
                      <p className="font-medium">{order.createdAt.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Estimated Delivery</span>
                      <p className="font-medium">
                        {order.estimatedDelivery?.toLocaleDateString() || 'TBD'}
                      </p>
                    </div>
                    {order.trackingNumber && (
                      <div>
                        <span className="text-sm text-gray-600">Tracking Number</span>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{order.trackingNumber}</p>
                          {order.shipping.trackingUrl && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={order.shipping.trackingUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Total Amount</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>${order.pricing.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax</span>
                        <span>${order.pricing.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping</span>
                        <span>${order.pricing.shipping.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>${order.pricing.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items">
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Specifications</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.configurations.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{config.name}</div>
                            <div className="text-sm text-gray-600">{config.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{config.specifications.material.name}</div>
                            <div className="text-sm text-gray-600">
                              {config.specifications.material.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{config.specifications.tubeSpecification.diameter}" tube</div>
                            <div>{config.specifications.bendRequirements.length} bends</div>
                            <div className="capitalize">{config.specifications.finishing.type}</div>
                          </div>
                        </TableCell>
                        <TableCell>{config.quantity}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {config.status.replace('-', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>${config.pricing.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shipping Tab */}
          <TabsContent value="shipping">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="font-medium">{order.shippingAddress.name}</p>
                    {order.shippingAddress.company && (
                      <p className="text-gray-600">{order.shippingAddress.company}</p>
                    )}
                    <p>{order.shippingAddress.street1}</p>
                    {order.shippingAddress.street2 && <p>{order.shippingAddress.street2}</p>}
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                    {order.shippingAddress.phone && (
                      <p className="text-gray-600">{order.shippingAddress.phone}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Shipping Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-600">Carrier</span>
                      <p className="font-medium">{order.shipping.carrier || 'TBD'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Service</span>
                      <p className="font-medium">{order.shipping.service || 'TBD'}</p>
                    </div>
                    {order.trackingNumber && (
                      <div>
                        <span className="text-sm text-gray-600">Tracking Number</span>
                        <p className="font-medium">{order.trackingNumber}</p>
                      </div>
                    )}
                    {order.shipping.shippedAt && (
                      <div>
                        <span className="text-sm text-gray-600">Shipped Date</span>
                        <p className="font-medium">{order.shipping.shippedAt.toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Billing Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="font-medium">{order.billingAddress.name}</p>
                    {order.billingAddress.company && (
                      <p className="text-gray-600">{order.billingAddress.company}</p>
                    )}
                    <p>{order.billingAddress.street1}</p>
                    {order.billingAddress.street2 && <p>{order.billingAddress.street2}</p>}
                    <p>
                      {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.zipCode}
                    </p>
                    <p>{order.billingAddress.country}</p>
                    {order.billingAddress.phone && (
                      <p className="text-gray-600">{order.billingAddress.phone}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-600">Payment Method</span>
                      <p className="font-medium capitalize">
                        {order.paymentMethod.type} ending in {order.paymentMethod.last4}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Card Brand</span>
                      <p className="font-medium">{order.paymentMethod.brand}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Status</span>
                      <Badge variant={order.paymentMethod.isValid ? 'default' : 'destructive'}>
                        {order.paymentMethod.isValid ? 'Valid' : 'Invalid'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.statusHistory.map((update, index) => (
                    <div key={update.id} className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          {index === 0 ? (
                            <Package className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                        {index < order.statusHistory.length - 1 && (
                          <div className="w-px h-8 bg-gray-200 ml-4 mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium capitalize">
                            {update.status.replace('-', ' ')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {update.timestamp.toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600">{update.notes}</p>
                        <p className="text-xs text-gray-500">Updated by {update.updatedBy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
