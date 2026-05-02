'use client'

import React, { useRef, useState, useCallback } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  Download,
  Eye,
  EyeOff,
  Play,
  Pause,
  Maximize2,
} from 'lucide-react'
import ThreeScene from './ThreeScene'
import TubeGeometry from './TubeGeometry'
import CADFileGeometry from './CADFileGeometry'
import { parseCADFile, isSupportedFile, type ParsedGeometry } from '@/lib/utils/cadFileParser'
import type { BendRequirement, CADAnalysis, Material } from '@/lib/types/configuration'

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
  onBendingChange?: (bends: BendRequirement[]) => void
  onParsingStart?: () => void
  onParsingComplete?: (analysis: CADAnalysis) => void
  onParsingError?: (message: string) => void
}

interface ViewState {
  showWireframe: boolean
  autoRotate: boolean
}

export default function CADViewer({
  file,
  material,
  tubeSpecs,
  className,
  onParsingStart,
  onParsingComplete,
  onParsingError
}: CADViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedGeometry, setParsedGeometry] = useState<ParsedGeometry | null>(null)
  const [sceneRevision, setSceneRevision] = useState(0)
  const [viewState, setViewState] = useState<ViewState>({
    showWireframe: false,
    autoRotate: false,
  })

  const handleFileLoad = useCallback(async (file: File) => {
    if (!file) return

    setLoading(true)
    setError(null)
    setParsedGeometry(null)
    onParsingStart?.()

    const PARSE_TIMEOUT_MS = 30_000

    try {
      if (!isSupportedFile(file.name)) {
        const extension = file.name.split('.').pop()?.toLowerCase()
        throw new Error(`Unsupported file format: ${extension}`)
      }

      const parsePromise = parseCADFile(file, { scale: 1, centerGeometry: true })
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                'Parsing took too long (over 30s). The file may be too complex or corrupt — try a simpler version, or contact support.',
              ),
            ),
          PARSE_TIMEOUT_MS,
        ),
      )

      const geometry = await Promise.race([parsePromise, timeoutPromise])

      setParsedGeometry(geometry)

      if (onParsingComplete && geometry.analysis) {
        onParsingComplete(geometry.analysis)
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load CAD file'
      setError(message)
      onParsingError?.(message)
    } finally {
      setLoading(false)
    }
  }, [onParsingComplete, onParsingError, onParsingStart])

  const resetCamera = () => {
    setSceneRevision(prev => prev + 1)
  }

  const exportScreenshot = () => {
    const canvas = viewerRef.current?.querySelector('canvas')
    if (!canvas) {
      return
    }

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `${file?.name || 'cad-preview'}.png`
    link.click()
  }


  React.useEffect(() => {
    if (file) {
      handleFileLoad(file)
    }
  }, [file, handleFileLoad])

  return (
    <div className={`bg-white ${className || ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2.5">
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => setViewState(prev => ({ ...prev, showWireframe: !prev.showWireframe }))}
            label={viewState.showWireframe ? 'Solid' : 'Wireframe'}
            icon={viewState.showWireframe ? EyeOff : Eye}
            active={viewState.showWireframe}
          />
          <ToolbarButton
            onClick={() => setViewState(prev => ({ ...prev, autoRotate: !prev.autoRotate }))}
            label={viewState.autoRotate ? 'Stop' : 'Rotate'}
            icon={viewState.autoRotate ? Pause : Play}
            active={viewState.autoRotate}
          />
        </div>
        <div className="flex items-center gap-1">
          <ToolbarButton onClick={resetCamera} label="Reset view" icon={Maximize2} />
          <ToolbarButton
            onClick={exportScreenshot}
            label="Export"
            icon={Download}
            disabled={!parsedGeometry}
          />
        </div>
      </div>

      {/* 3D Viewer Area */}
      <div className="relative">
        <AnimatePresence>
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-slate-700">Analyzing geometry…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div
          ref={viewerRef}
          className="aspect-[4/3] sm:aspect-square bg-gradient-to-br from-slate-100 via-slate-50 to-white"
        >
          <ThreeScene
            key={sceneRevision}
            autoRotate={viewState.autoRotate}
            showGrid={false}
            cameraPosition={[20, 20, 20]}
          >
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

            {file && parsedGeometry && !error && (
              <CADFileGeometry
                parsedGeometry={parsedGeometry}
                material={material}
                wireframe={viewState.showWireframe}
                animated={viewState.autoRotate}
              />
            )}
          </ThreeScene>
        </div>

        {/* Info Panel */}
        {(file || tubeSpecs) && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:text-sm">
              <InfoRow label="File" value={file ? file.name : 'Parametric tube'} />
              <InfoRow label="Material" value={material?.name || 'Not selected'} />
              {file && (
                <InfoRow
                  label="Status"
                  value={
                    loading
                      ? 'Parsing…'
                      : error
                        ? 'Failed to parse'
                        : parsedGeometry
                          ? `${parsedGeometry.meshes.length} mesh(es) loaded`
                          : 'Ready to parse'
                  }
                />
              )}
              {tubeSpecs && (
                <>
                  <InfoRow label="Diameter" value={`${tubeSpecs.diameter} mm`} />
                  <InfoRow label="Length" value={`${tubeSpecs.length} mm`} />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ToolbarButton({
  onClick,
  label,
  icon: Icon,
  disabled,
  active,
}: {
  onClick: () => void
  label: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-slate-900 text-white hover:bg-slate-800'
          : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <span className="text-slate-500">{label}:</span>
      <span className="truncate font-medium text-slate-800">{value}</span>
    </div>
  )
}
