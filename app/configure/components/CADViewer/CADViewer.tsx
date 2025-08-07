'use client'

import React, { useState, useCallback } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, RotateCcw, Download, Eye, EyeOff, Play, Pause } from 'lucide-react'
import ThreeScene from './ThreeScene'
import TubeGeometry from './TubeGeometry'
import CADFileGeometry from './CADFileGeometry'
import { parseCADFile, isSupportedFile } from '@/lib/utils/cadFileParser'
import type { Material } from '@/lib/types/configuration'

interface CADViewerProps {
  file?: File
  material?: Material
  tubeSpecs?: {
    diameter: number
    wallThickness: number
    length: number
  }
  className?: string
  interactive?: boolean
  onBendingChange?: (bends: any[]) => void
  onParsingComplete?: (analysis: any) => void
}

interface ViewState {
  showWireframe: boolean
  showBounds: boolean
  autoRotate: boolean
}

export default function CADViewer({ 
  file, 
  material, 
  tubeSpecs, 
  className, 
  interactive = false,
  onBendingChange,
  onParsingComplete
}: CADViewerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedGeometry, setParsedGeometry] = useState<any>(null)
  const [viewState, setViewState] = useState<ViewState>({
    showWireframe: false,
    showBounds: false,
    autoRotate: true, // Always enable auto-rotate for view-only mode
  })

  const handleFileLoad = useCallback(async (file: File) => {
    if (!file) return

    setLoading(true)
    setError(null)
    setParsedGeometry(null)

    try {
      // Check if file format is supported
      if (!isSupportedFile(file.name)) {
        const extension = file.name.split('.').pop()?.toLowerCase()
        throw new Error(`Unsupported file format: ${extension}`)
      }

      console.log('Parsing CAD file:', file.name)
      
      // Parse the CAD file
      const geometry = await parseCADFile(file, {
        scale: 1,
        centerGeometry: true
      })

      setParsedGeometry(geometry)
      console.log('Successfully parsed CAD file with', geometry.meshes.length, 'meshes')
      
      // Notify parent component about parsing completion
      if (onParsingComplete && geometry.analysis) {
        onParsingComplete(geometry.analysis)
      }
      
    } catch (err) {
      console.error('Error loading CAD file:', err)
      setError(err instanceof Error ? err.message : 'Failed to load CAD file')
    } finally {
      setLoading(false)
    }
  }, [])

  const resetCamera = () => {
    // Force re-render by updating a key or trigger camera reset
    console.log('Resetting camera position')
    setViewState(prev => ({ ...prev, autoRotate: !prev.autoRotate }))
    // Reset after a brief delay to ensure the geometry is visible
    setTimeout(() => {
      setViewState(prev => ({ ...prev, autoRotate: !prev.autoRotate }))
    }, 100)
  }

  const exportScreenshot = () => {
    // Screenshot export will be implemented
    console.log('Exporting screenshot')
  }


  React.useEffect(() => {
    if (file) {
      handleFileLoad(file)
    }
  }, [file, handleFileLoad])

  return (
    <Card className={className}>
      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewState(prev => ({ ...prev, showWireframe: !prev.showWireframe }))}
            >
              {viewState.showWireframe ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {viewState.showWireframe ? 'Solid' : 'Wireframe'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewState(prev => ({ ...prev, autoRotate: !prev.autoRotate }))}
            >
              {viewState.autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {viewState.autoRotate ? 'Stop' : 'Rotate'}
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button type="button" variant="outline" size="sm" onClick={resetCamera}>
              Reset View
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={exportScreenshot}>
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* 3D Viewer Area */}
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-sm text-gray-600">Loading CAD file...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          <div className="aspect-square bg-white">
            <ThreeScene
              autoRotate={viewState.autoRotate}
              showBounds={false}
              showGrid={false}
              cameraPosition={[20, 20, 20]}
            >
              {/* Show parametric tube if no file is loaded but we have specs */}
              {!file && tubeSpecs && material && (
                <TubeGeometry
                  diameter={tubeSpecs.diameter}
                  wallThickness={tubeSpecs.wallThickness}
                  length={tubeSpecs.length}
                  material={material}
                  wireframe={viewState.showWireframe}
                  interactive={false}
                />
              )}
              
              {/* Render parsed CAD file geometry */}
              {file && !error && (
                <CADFileGeometry
                  parsedGeometry={parsedGeometry}
                  material={material || { id: 'steel', name: 'Steel', properties: { density: 7850, tensile_strength: 400, color: '#8C8C8C' } }}
                  wireframe={viewState.showWireframe}
                  animated={viewState.autoRotate}
                />
              )}
            </ThreeScene>
          </div>

          {/* Info Panel */}
          {(file || tubeSpecs) && (
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">File:</span>
                  <span className="ml-2 text-gray-600">
                    {file ? file.name : 'Parametric tube'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Material:</span>
                  <span className="ml-2 text-gray-600">
                    {material?.name || 'Not selected'}
                  </span>
                </div>
                {file && (
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className="ml-2 text-gray-600">
                      {loading ? 'Parsing...' : 
                       error ? 'Failed to parse' : 
                       parsedGeometry ? `${parsedGeometry.meshes.length} mesh(es)` : 
                       'Ready to parse'}
                    </span>
                  </div>
                )}
                {tubeSpecs && (
                  <>
                    <div>
                      <span className="font-medium text-gray-700">Diameter:</span>
                      <span className="ml-2 text-gray-600">{tubeSpecs.diameter}mm</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Length:</span>
                      <span className="ml-2 text-gray-600">{tubeSpecs.length}mm</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}