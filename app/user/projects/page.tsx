'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Share,
  Download,
  Eye,
  Calendar,
  User,
  Settings,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Upload,
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useUser } from '@/contexts/user-context'
import { Project, ProjectStatus } from '@/lib/types/user'

export default function ProjectsPage() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated, logout } = useUser()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // Mock projects data
  const mockProjects: Project[] = [
    {
      id: '1',
      userId: '1',
      name: 'Exhaust System Prototype',
      description: 'Custom motorcycle exhaust system with complex bends',
      status: 'ready',
      createdAt: new Date('2024-09-01'),
      updatedAt: new Date('2024-09-14'),
      files: [
        {
          id: '1',
          projectId: '1',
          fileName: 'exhaust-system.step',
          fileSize: 2457600,
          fileType: 'step',
          fileUrl: '/files/exhaust-system.step',
          uploadedAt: new Date('2024-09-01'),
          isPrimary: true,
          version: 1
        }
      ],
      configurations: [],
      orders: [],
      tags: ['motorcycle', 'exhaust', 'prototype'],
      isTemplate: false,
      sharedWith: []
    },
    {
      id: '2',
      userId: '1',
      name: 'Frame Rails',
      description: 'Structural frame components for industrial equipment',
      status: 'in-production',
      createdAt: new Date('2024-08-15'),
      updatedAt: new Date('2024-09-10'),
      files: [
        {
          id: '2',
          projectId: '2',
          fileName: 'frame-rails.step',
          fileSize: 1894400,
          fileType: 'step',
          fileUrl: '/files/frame-rails.step',
          uploadedAt: new Date('2024-08-15'),
          isPrimary: true,
          version: 2
        }
      ],
      configurations: [],
      orders: [],
      tags: ['structural', 'industrial', 'frame'],
      isTemplate: false,
      sharedWith: []
    },
    {
      id: '3',
      userId: '1',
      name: 'Roll Cage Design',
      description: 'Safety roll cage for racing applications',
      status: 'quoted',
      createdAt: new Date('2024-08-28'),
      updatedAt: new Date('2024-09-05'),
      files: [
        {
          id: '3',
          projectId: '3',
          fileName: 'roll-cage.iges',
          fileSize: 3123456,
          fileType: 'iges',
          fileUrl: '/files/roll-cage.iges',
          uploadedAt: new Date('2024-08-28'),
          isPrimary: true,
          version: 1
        }
      ],
      configurations: [],
      orders: [],
      tags: ['racing', 'safety', 'roll-cage'],
      isTemplate: false,
      sharedWith: []
    }
  ]

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isLoading, isAuthenticated, router])

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'ready':
        return 'bg-green-100 text-green-800'
      case 'quoted':
        return 'bg-blue-100 text-blue-800'
      case 'ordered':
        return 'bg-purple-100 text-purple-800'
      case 'in-production':
        return 'bg-yellow-100 text-yellow-800'
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800'
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'archived':
        return 'bg-slate-100 text-slate-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: ProjectStatus) => {
    switch (status) {
      case 'draft':
        return <Edit className="w-4 h-4" />
      case 'ready':
        return <CheckCircle className="w-4 h-4" />
      case 'quoted':
        return <FileText className="w-4 h-4" />
      case 'ordered':
        return <Package className="w-4 h-4" />
      case 'in-production':
        return <Clock className="w-4 h-4" />
      case 'shipped':
        return <Truck className="w-4 h-4" />
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const filteredProjects = mockProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your projects...</p>
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
              <Link href="/user/projects" className="text-blue-600 hover:text-blue-700 font-medium">
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="mt-2 text-gray-600">
              Manage your CAD projects and track their progress.
            </p>
          </div>
          <Button asChild>
            <Link href="/configure">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search projects..."
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="in-production">In Production</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    {project.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Project
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share className="w-4 h-4 mr-2" />
                        Share Project
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="w-4 h-4 mr-2" />
                        Download Files
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <Badge className={getStatusColor(project.status)}>
                      {getStatusIcon(project.status)}
                      <span className="ml-1 capitalize">
                        {project.status.replace('-', ' ')}
                      </span>
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {project.updatedAt.toLocaleDateString()}
                    </span>
                  </div>

                  {/* File Info */}
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>{project.files.length} file{project.files.length !== 1 ? 's' : ''}</span>
                      <span>{formatFileSize(project.files.reduce((sum, file) => sum + file.fileSize, 0))}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {project.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{project.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button size="sm" className="flex-1">
                      <Upload className="w-4 h-4 mr-1" />
                      Configure
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Project Status Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Project Status Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Badge className="bg-gray-100 text-gray-800">
                  <Edit className="w-3 h-3" />
                  <span className="ml-1">Draft</span>
                </Badge>
                <span className="text-sm text-gray-600">In development</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3" />
                  <span className="ml-1">Ready</span>
                </Badge>
                <span className="text-sm text-gray-600">Ready to order</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-blue-100 text-blue-800">
                  <FileText className="w-3 h-3" />
                  <span className="ml-1">Quoted</span>
                </Badge>
                <span className="text-sm text-gray-600">Quote generated</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-yellow-100 text-yellow-800">
                  <Clock className="w-3 h-3" />
                  <span className="ml-1">In Production</span>
                </Badge>
                <span className="text-sm text-gray-600">Being manufactured</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
