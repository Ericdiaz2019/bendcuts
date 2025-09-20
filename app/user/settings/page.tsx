'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Download,
  Trash2,
  Save,
  RefreshCw,
  LogOut,
  Bell as BellIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUser } from '@/contexts/user-context'

export default function SettingsPage() {
  const router = useRouter()
  const {
    user,
    isLoading,
    isAuthenticated,
    updatePreferences,
    logout
  } = useUser()

  const [preferences, setPreferences] = useState({
    notifications: {
      email: true,
      sms: false,
      orderUpdates: true,
      marketing: false,
      quotes: true
    },
    defaults: {
      materialId: 'steel-1',
      rushOrder: false,
      finishing: 'none' as const,
      quantity: 1
    },
    ui: {
      theme: 'system' as const,
      language: 'en',
      currency: 'USD'
    }
  })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (user) {
      setPreferences({
        notifications: user.preferences.notifications,
        defaults: user.preferences.defaults,
        ui: user.preferences.ui
      })
    }
  }, [user])

  const handleNotificationChange = async (key: string, value: boolean) => {
    const updatedPrefs = {
      ...preferences,
      notifications: {
        ...preferences.notifications,
        [key]: value
      }
    }
    setPreferences(updatedPrefs)

    if (user) {
      await updatePreferences({
        notifications: updatedPrefs.notifications
      })
    }
  }

  const handleDefaultChange = async (key: string, value: any) => {
    const updatedPrefs = {
      ...preferences,
      defaults: {
        ...preferences.defaults,
        [key]: value
      }
    }
    setPreferences(updatedPrefs)

    if (user) {
      await updatePreferences({
        defaults: updatedPrefs.defaults
      })
    }
  }

  const handleUIChange = async (key: string, value: any) => {
    const updatedPrefs = {
      ...preferences,
      ui: {
        ...preferences.ui,
        [key]: value
      }
    }
    setPreferences(updatedPrefs)

    if (user) {
      await updatePreferences({
        ui: updatedPrefs.ui
      })
    }
  }

  const handleExportData = () => {
    // Mock export functionality
    const data = {
      user: user,
      preferences: preferences,
      exportDate: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tubebend-data-export.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
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
              <Link href="/user/orders" className="text-gray-600 hover:text-gray-900 font-medium">
                Orders
              </Link>
              <Link href="/user/profile" className="text-gray-600 hover:text-gray-900 font-medium">
                Profile
              </Link>
              <Link href="/user/settings" className="text-blue-600 hover:text-blue-700 font-medium">
                Settings
              </Link>
              <div className="flex items-center space-x-4 ml-8">
                <Button variant="outline" size="sm">
                  <BellIcon className="w-4 h-4" />
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your account preferences and application settings.
          </p>
        </div>

        <Tabs defaultValue="preferences" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          {/* Default Preferences Tab */}
          <TabsContent value="preferences">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Default Manufacturing Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="defaultMaterial">Default Material</Label>
                      <Select
                        value={preferences.defaults.materialId}
                        onValueChange={(value) => handleDefaultChange('materialId', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="steel-1">Steel (1" Tube)</SelectItem>
                          <SelectItem value="steel-2">Steel (1.5" Tube)</SelectItem>
                          <SelectItem value="aluminum-1">Aluminum 6061-T6</SelectItem>
                          <SelectItem value="stainless-1">304 Stainless Steel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="defaultQuantity">Default Quantity</Label>
                      <Input
                        id="defaultQuantity"
                        type="number"
                        min="1"
                        max="1000"
                        value={preferences.defaults.quantity}
                        onChange={(e) => handleDefaultChange('quantity', parseInt(e.target.value))}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="defaultFinishing">Default Finishing</Label>
                      <Select
                        value={preferences.defaults.finishing}
                        onValueChange={(value) => handleDefaultChange('finishing', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="deburr">Deburr</SelectItem>
                          <SelectItem value="polish">Polish</SelectItem>
                          <SelectItem value="paint">Paint</SelectItem>
                          <SelectItem value="powder-coat">Powder Coat</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="defaultRushOrder"
                        checked={preferences.defaults.rushOrder}
                        onCheckedChange={(checked) => handleDefaultChange('rushOrder', checked)}
                      />
                      <Label htmlFor="defaultRushOrder">Default to Rush Orders</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Display Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="theme">Theme</Label>
                      <Select
                        value={preferences.ui.theme}
                        onValueChange={(value) => handleUIChange('theme', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={preferences.ui.language}
                        onValueChange={(value) => handleUIChange('language', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={preferences.ui.currency}
                        onValueChange={(value) => handleUIChange('currency', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="CAD">CAD (C$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-gray-600">
                        Receive updates and notifications via email
                      </p>
                    </div>
                    <Switch
                      checked={preferences.notifications.email}
                      onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Order Updates</h4>
                      <p className="text-sm text-gray-600">
                        Get notified when your orders status changes
                      </p>
                    </div>
                    <Switch
                      checked={preferences.notifications.orderUpdates}
                      onCheckedChange={(checked) => handleNotificationChange('orderUpdates', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Quote Notifications</h4>
                      <p className="text-sm text-gray-600">
                        Receive notifications about new quotes and pricing updates
                      </p>
                    </div>
                    <Switch
                      checked={preferences.notifications.quotes}
                      onCheckedChange={(checked) => handleNotificationChange('quotes', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Marketing Communications</h4>
                      <p className="text-sm text-gray-600">
                        Receive updates about new features and special offers
                      </p>
                    </div>
                    <Switch
                      checked={preferences.notifications.marketing}
                      onCheckedChange={(checked) => handleNotificationChange('marketing', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Account Status</h4>
                      <p className="text-sm text-gray-600">
                        Your account is active and in good standing
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Two-Factor Authentication</h4>
                      <p className="text-sm text-gray-600">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Button variant="outline">Enable 2FA</Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Login Activity</h4>
                      <p className="text-sm text-gray-600">
                        Monitor recent login activity to your account
                      </p>
                    </div>
                    <Button variant="outline">View Activity</Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-red-600">Danger Zone</h4>
                      <p className="text-sm text-gray-600">
                        Permanently delete your account and all associated data
                      </p>
                    </div>
                    <Button variant="destructive">Delete Account</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Export Your Data</h4>
                      <p className="text-sm text-gray-600">
                        Download a copy of all your data including projects, orders, and settings
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleExportData}>
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Clear Cache</h4>
                      <p className="text-sm text-gray-600">
                        Clear temporary files and cached data to improve performance
                      </p>
                    </div>
                    <Button variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Clear Cache
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Storage Usage</h4>
                      <p className="text-sm text-gray-600">
                        Current storage usage across all your projects and files
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">2.4 GB / 5 GB</div>
                      <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '48%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
