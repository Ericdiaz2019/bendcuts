'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  FileText,
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Upload,
  Settings,
  User,
  Bell,
  LogOut
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUser } from '@/contexts/user-context'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { PendingOrderPayload, OrderActionType } from '@/lib/types/orders'

export default function DashboardPage() {
  const router = useRouter()
  const {
    user,
    isLoading,
    isAuthenticated,
    stats,
    recentActivity,
    logout,
    submitOrder,
    saveOrderForLater
  } = useUser()

  const [pendingOrderMessage, setPendingOrderMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return
    }

    const pending = typeof window !== 'undefined'
      ? sessionStorage.getItem('tubebend_pending_order')
      : null

    if (!pending) {
      return
    }

    const processPendingOrder = async () => {
      try {
        const parsed = JSON.parse(pending) as { action: OrderActionType; payload: PendingOrderPayload }

        if (parsed.action === 'submit') {
          await submitOrder(parsed.payload)
          setPendingOrderMessage('Your saved configuration has been submitted as a new order.')
        } else {
          await saveOrderForLater(parsed.payload)
          setPendingOrderMessage('Your configuration has been saved for later. You can finish checkout whenever you are ready.')
        }
      } catch (error) {
        console.error('Failed to process pending order:', error)
        setPendingOrderMessage('We could not process your saved order automatically. Please reopen the quote and try again.')
      } finally {
        sessionStorage.removeItem('tubebend_pending_order')
      }
    }

    processPendingOrder()
  }, [isLoading, isAuthenticated, submitOrder, saveOrderForLater])

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return
    }

    const flash = typeof window !== 'undefined'
      ? sessionStorage.getItem('tubebend_dashboard_flash')
      : null

    if (!flash) {
      return
    }

    try {
      const payload = JSON.parse(flash) as { action: OrderActionType; orderNumber: string; materialName: string; quantity: number }
      const message = payload.action === 'submit'
        ? `Order ${payload.orderNumber} for ${payload.quantity} ${payload.materialName} part${payload.quantity !== 1 ? 's' : ''} submitted successfully.`
        : `Saved order ${payload.orderNumber} for ${payload.quantity} ${payload.materialName} part${payload.quantity !== 1 ? 's' : ''}.`
      setPendingOrderMessage(message)
    } catch (error) {
      console.error('Failed to parse dashboard flash message:', error)
    } finally {
      sessionStorage.removeItem('tubebend_dashboard_flash')
    }
  }, [isLoading, isAuthenticated])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-production':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'shipped':
        return 'bg-blue-100 text-blue-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in-production':
      case 'processing':
        return <Clock className="w-4 h-4" />
      case 'shipped':
        return <Package className="w-4 h-4" />
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order_shipped':
        return <Package className="w-4 h-4" />
      case 'project_updated':
        return <FileText className="w-4 h-4" />
      case 'quote_generated':
        return <TrendingUp className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
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
              <Link href="/user/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
                Dashboard
              </Link>
              <Link href="/user/projects" className="text-gray-600 hover:text-gray-900 font-medium">
                Projects
              </Link>
              <Link href="/user/orders" className="text-gray-600 hover:text-gray-900 font-medium">
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
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.firstName}!
          </h1>
          <p className="mt-2 text-gray-600">
            Here's what's happening with your TubeBend projects and orders.
          </p>
        </div>

        {pendingOrderMessage && (
          <Alert className="mb-8 border-green-200 bg-green-50 text-green-800">
            <AlertDescription>{pendingOrderMessage}</AlertDescription>
          </Alert>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Projects</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalProjects || 0}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalOrders || 0}
                  </p>
                </div>
                <Package className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${stats?.totalSpent.toLocaleString() || '0'}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Production</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.ordersInProduction || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Projects */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Projects</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/user/projects">
                    View All
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      name: 'Exhaust System Prototype',
                      status: 'ready',
                      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
                      description: 'Custom exhaust system for motorcycle'
                    },
                    {
                      name: 'Frame Rails',
                      status: 'in-production',
                      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
                      description: 'Structural frame components'
                    },
                    {
                      name: 'Roll Cage Design',
                      status: 'quoted',
                      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                      description: 'Safety roll cage for racing'
                    }
                  ].map((project, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{project.name}</h4>
                        <p className="text-sm text-gray-600">{project.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Updated {project.updatedAt.toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={getStatusColor(project.status)}>
                        {getStatusIcon(project.status)}
                        <span className="ml-1 capitalize">{project.status.replace('-', ' ')}</span>
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${
                        activity.type === 'order_shipped' ? 'bg-blue-100' :
                        activity.type === 'project_updated' ? 'bg-green-100' :
                        'bg-gray-100'
                      }`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.title}
                          </p>
                          {activity.metadata?.orderId && (
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/user/orders/${activity.metadata.orderId}`}>
                                <Eye className="w-3 h-3" />
                              </Link>
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {activity.timestamp.toLocaleDateString()} at{' '}
                          {activity.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                className="h-24 flex flex-col items-center justify-center space-y-2"
                asChild
              >
                <Link href="/configure">
                  <Upload className="w-8 h-8" />
                  <span>Upload CAD File</span>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center space-y-2"
                asChild
              >
                <Link href="/user/projects">
                  <FileText className="w-8 h-8" />
                  <span>View Projects</span>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center space-y-2"
                asChild
              >
                <Link href="/user/orders">
                  <Package className="w-8 h-8" />
                  <span>Track Orders</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
