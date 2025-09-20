'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Package,
  FileText,
  Download,
  Eye,
  Filter,
  Search,
  Calendar,
  MapPin,
  CreditCard,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  LogOut,
  Bell
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useUser } from '@/contexts/user-context'
import { Order, OrderStatus } from '@/lib/types/user'

export default function OrdersPage() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated, logout } = useUser()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  // Mock orders data
  const mockOrders: Order[] = [
    {
      id: '1',
      userId: '1',
      orderNumber: 'TB-2024-018',
      status: 'shipped',
      createdAt: new Date('2024-09-10'),
      updatedAt: new Date('2024-09-15'),
      configurations: [],
      pricing: {
        subtotal: 234.50,
        tax: 18.76,
        shipping: 15.00,
        total: 268.26
      },
      shippingAddress: {
        id: '1',
        userId: '1',
        type: 'shipping',
        name: 'John Doe',
        company: 'Demo Company',
        street1: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
        isDefault: true
      },
      billingAddress: {
        id: '1',
        userId: '1',
        type: 'billing',
        name: 'John Doe',
        company: 'Demo Company',
        street1: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
        isDefault: true
      },
      paymentMethod: {
        id: '1',
        userId: '1',
        type: 'card',
        last4: '4242',
        brand: 'visa',
        isDefault: true,
        isValid: true
      },
      trackingNumber: '1Z999AA1234567890',
      estimatedDelivery: new Date('2024-09-18'),
      files: []
    },
    {
      id: '2',
      userId: '1',
      orderNumber: 'TB-2024-017',
      status: 'in-production',
      createdAt: new Date('2024-09-05'),
      updatedAt: new Date('2024-09-14'),
      configurations: [],
      pricing: {
        subtotal: 456.75,
        tax: 36.54,
        shipping: 0,
        total: 493.29
      },
      shippingAddress: {
        id: '1',
        userId: '1',
        type: 'shipping',
        name: 'John Doe',
        company: 'Demo Company',
        street1: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
        isDefault: true
      },
      billingAddress: {
        id: '1',
        userId: '1',
        type: 'billing',
        name: 'John Doe',
        company: 'Demo Company',
        street1: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
        isDefault: true
      },
      paymentMethod: {
        id: '1',
        userId: '1',
        type: 'card',
        last4: '4242',
        brand: 'visa',
        isDefault: true,
        isValid: true
      },
      files: []
    },
    {
      id: '3',
      userId: '1',
      orderNumber: 'TB-2024-016',
      status: 'delivered',
      createdAt: new Date('2024-08-28'),
      updatedAt: new Date('2024-09-02'),
      configurations: [],
      pricing: {
        subtotal: 123.45,
        tax: 9.88,
        shipping: 12.50,
        total: 145.83
      },
      shippingAddress: {
        id: '1',
        userId: '1',
        type: 'shipping',
        name: 'John Doe',
        company: 'Demo Company',
        street1: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
        isDefault: true
      },
      billingAddress: {
        id: '1',
        userId: '1',
        type: 'billing',
        name: 'John Doe',
        company: 'Demo Company',
        street1: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
        isDefault: true
      },
      paymentMethod: {
        id: '1',
        userId: '1',
        type: 'card',
        last4: '4242',
        brand: 'visa',
        isDefault: true,
        isValid: true
      },
      actualDelivery: new Date('2024-09-01'),
      files: []
    }
  ]

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isLoading, isAuthenticated, router])

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'processing':
      case 'in-production':
        return 'bg-yellow-100 text-yellow-800'
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

  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.shippingAddress.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const matchesDate = dateFilter === 'all' ||
                       (dateFilter === 'last30' && order.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) ||
                       (dateFilter === 'last90' && order.createdAt > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))

    return matchesSearch && matchesStatus && matchesDate
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your orders...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/user/dashboard" className="text-2xl font-bold text-gray-900">
                TubeBend
              </Link>
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
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="mt-2 text-gray-600">
            Track and manage your tube bending orders.
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="in-production">In Production</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="last30">Last 30 Days</SelectItem>
                  <SelectItem value="last90">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Order History ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Shipping</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>
                      {order.createdAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1 capitalize">
                          {order.status.replace('-', ' ')}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      ${order.pricing.total.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{order.shippingAddress.name}</div>
                        <div className="text-gray-500">
                          {order.shippingAddress.city}, {order.shippingAddress.state}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/user/orders/${order.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        {order.trackingNumber && (
                          <Button variant="outline" size="sm">
                            <Truck className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Order Status Legend */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Order Status Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Badge className="bg-gray-100 text-gray-800">
                  <Clock className="w-3 h-3" />
                  <span className="ml-1">Pending</span>
                </Badge>
                <span className="text-sm text-gray-600">Order received</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-blue-100 text-blue-800">
                  <RefreshCw className="w-3 h-3" />
                  <span className="ml-1">Processing</span>
                </Badge>
                <span className="text-sm text-gray-600">Being prepared</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-yellow-100 text-yellow-800">
                  <RefreshCw className="w-3 h-3" />
                  <span className="ml-1">In Production</span>
                </Badge>
                <span className="text-sm text-gray-600">Being manufactured</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3" />
                  <span className="ml-1">Delivered</span>
                </Badge>
                <span className="text-sm text-gray-600">Completed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
