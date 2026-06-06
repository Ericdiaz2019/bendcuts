'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
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
  Minimize2,
  Hand,
  MapPin,
  Ruler,
  X,
} from 'lucide-react'
import ThreeScene from './ThreeScene'
import TubeGeometry from './TubeGeometry'
import CADFileGeometry from './CADFileGeometry'
import FeatureHotspots from './FeatureHotspots'
import MeasurementsOverlay from './MeasurementsOverlay'
import DimensionArrows from './DimensionArrows'
import UnitConfirmOverlay from './UnitConfirmOverlay'
import { parseCADFile, isSupportedFile } from '@/lib/utils/cadFileParser'
import { useDisplayUnit } from '@/lib/configure/displayUnit'
import type { ParsedGeometry } from '@/lib/cad/types'
import type {
  BendRequirement,
  CADAnalysis,
  Feature,
  FeatureConfigMap,
  Material,
} from '@/lib/types/configuration'

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
  /** Detected features — rendered as clickable hotspots when the Features toggle is on. */
  features?: Feature[]
  featureConfigs?: FeatureConfigMap
  selectedFeatureId?: string | null
  onFeatureHover?: (featureId: string | null) => void
  onFeatureSelect?: (featureId: string) => void
  onBendingChange?: (bends: BendRequirement[]) => void
  onParsingStart?: () => void
  onParsingComplete?: (analysis: CADAnalysis) => void
  onParsingError?: (message: string) => void
}

interface ViewState {
  showWireframe: boolean
  autoRotate: boolean
}

const HINT_STORAGE_KEY = 'tubebend.cadviewer.hintDismissed'

export default function CADViewer({
  file,
  material,
  tubeSpecs,
  className,
  features,
  featureConfigs,
  selectedFeatureId,
  onFeatureHover,
  onFeatureSelect,
  onParsingStart,
  onParsingComplete,
  onParsingError,
}: CADViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedGeometry, setParsedGeometry] = useState<ParsedGeometry | null>(null)
  const [sceneRevision, setSceneRevision] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [showHotspots, setShowHotspots] = useState(false)
  const [showMeasurements, setShowMeasurements] = useState(true)
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null)
  const [unit, setUnit] = useDisplayUnit()
  const [viewState, setViewState] = useState<ViewState>({
    showWireframe: false,
    autoRotate: false,
  })
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d')

  // Auto-show hotspots once a feature gets configured — feedback that "your edit took effect."
  useEffect(() => {
    if (featureConfigs && Object.keys(featureConfigs).length > 0 && !showHotspots) {
      setShowHotspots(true)
    }
    // We intentionally only watch the configs count; flipping the toggle off should stick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureConfigs && Object.keys(featureConfigs).length])

  // Flat sheets read as a featureless slab when rendered solid. Default the
  // wireframe pill to ON when the analyzer says it's a flat sheet so the user
  // can see the laser-feature outlines.
  useEffect(() => {
    if (parsedGeometry?.analysis?.partShape === 'flat-sheet') {
      setViewState(prev => (prev.showWireframe ? prev : { ...prev, showWireframe: true }))
    }
  }, [parsedGeometry?.analysis?.partShape])

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
    if (!canvas) return

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `${file?.name || 'cad-preview'}.png`
    link.click()
  }

  useEffect(() => {
    if (file) {
      handleFileLoad(file)
    }
  }, [file, handleFileLoad])

  useEffect(() => {
    if (!file || parsedGeometry?.analysis.previewKind !== 'document2d') {
      setDocumentPreviewUrl(null)
      return
    }

    const url = URL.createObjectURL(new Blob([file], { type: 'application/pdf' }))
    setDocumentPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file, parsedGeometry?.analysis.previewKind])

  // Show the interaction hint once per browser, only when there's geometry to inspect.
  useEffect(() => {
    if (!parsedGeometry || loading || error) return
    if (typeof window === 'undefined') return
    if (window.localStorage.getItem(HINT_STORAGE_KEY) === '1') return

    setShowHint(true)
    const timer = window.setTimeout(() => setShowHint(false), 5000)
    return () => window.clearTimeout(timer)
  }, [parsedGeometry, loading, error])

  const dismissHint = useCallback(() => {
    setShowHint(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(HINT_STORAGE_KEY, '1')
    }
  }, [])

  // Esc closes expanded view; lock body scroll while expanded.
  useEffect(() => {
    if (!expanded) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [expanded])

  const hasContent = Boolean(parsedGeometry || tubeSpecs)
  const hasDocumentPreview = Boolean(documentPreviewUrl && parsedGeometry?.analysis.previewKind === 'document2d')

  return (
    <>
      {/* Backdrop for expanded mode */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="cad-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setExpanded(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        layout
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className={
          expanded
            ? 'fixed inset-4 sm:inset-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl'
            : `flex flex-col bg-white ${className || ''}`
        }
      >
        {/* Canvas + floating overlays */}
        <div
          ref={viewerRef}
          className={`relative overflow-hidden ${
            expanded
              ? 'flex-1 min-h-0'
              : 'aspect-[16/10] min-h-[420px] lg:min-h-[520px] xl:min-h-[600px]'
          }`}
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, rgb(241 245 249) 0%, rgb(248 250 252) 45%, rgb(255 255 255) 100%)',
          }}
        >
          {/* Floating toolbar — top-right */}
          <div className="pointer-events-none absolute right-3 top-3 z-20 flex flex-wrap items-center justify-end gap-1.5 sm:right-4 sm:top-4">
            <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/85 p-1 shadow-md shadow-slate-900/5 backdrop-blur">
              <ToolbarButton
                onClick={() => setViewState(prev => ({ ...prev, showWireframe: !prev.showWireframe }))}
                label={viewState.showWireframe ? 'Solid' : 'Outline'}
                icon={viewState.showWireframe ? EyeOff : Eye}
                active={viewState.showWireframe}
              />
              <ToolbarButton
                onClick={() => setViewState(prev => ({ ...prev, autoRotate: !prev.autoRotate }))}
                label={viewState.autoRotate ? 'Stop spin' : 'Auto-spin'}
                icon={viewState.autoRotate ? Pause : Play}
                active={viewState.autoRotate}
              />
              <span className="mx-0.5 hidden h-5 w-px bg-slate-200 sm:block" />
              <ToolbarButton
                onClick={resetCamera}
                label="Fit"
                icon={Maximize2}
              />
              <ToolbarButton
                onClick={exportScreenshot}
                label="Save image"
                icon={Download}
                disabled={!parsedGeometry}
              />
              {features && features.length > 0 && (
                <ToolbarButton
                  onClick={() => setShowHotspots(v => !v)}
                  label={showHotspots ? 'Hide tags' : 'Features'}
                  icon={MapPin}
                  active={showHotspots}
                />
              )}
              {parsedGeometry && (
                <ToolbarButton
                  onClick={() => setShowMeasurements(v => !v)}
                  label={showMeasurements ? 'Hide dims' : 'Measure'}
                  icon={Ruler}
                  active={showMeasurements}
                />
              )}
            </div>
            <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/85 p-0.5 shadow-md shadow-slate-900/5 backdrop-blur">
              <UnitToggle unit={unit} onChange={setUnit} />
            </div>
            <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/85 p-1 shadow-md shadow-slate-900/5 backdrop-blur">
              <ToolbarButton
                onClick={() => setExpanded(prev => !prev)}
                label={expanded ? 'Close' : 'Expand'}
                icon={expanded ? Minimize2 : Maximize2}
                emphasized
              />
            </div>
          </div>

          {/* Loading overlay */}
          <AnimatePresence>
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 backdrop-blur-sm"
              >
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-lg">
                  <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                  <div className="text-center">
                    <div className="text-sm font-semibold text-slate-900">Analyzing geometry…</div>
                    <div className="mt-0.5 text-xs text-slate-500">Usually takes a few seconds</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {error && (
            <div className="absolute inset-x-4 top-4 z-10">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* The scene fills the canvas frame */}
          {hasDocumentPreview ? (
            <DocumentPreview url={documentPreviewUrl!} fileName={file?.name ?? 'Illustrator preview'} />
          ) : (
            <div className="absolute inset-0">
              <ThreeScene
                key={`${sceneRevision}-${viewMode}`}
                autoRotate={viewState.autoRotate && viewMode === '3d'}
                showGrid={false}
                cameraPosition={viewMode === '2d' ? [0, 40, 0.001] : [20, 20, 20]}
                showViewCube={viewMode === '3d' && Boolean(parsedGeometry && parsedGeometry.meshes.length > 0)}
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

                {file &&
                  parsedGeometry &&
                  !error &&
                  showHotspots &&
                  features &&
                  features.length > 0 && (
                    <FeatureHotspots
                      features={features}
                      configs={featureConfigs ?? {}}
                      boundingBox={parsedGeometry.analysis.boundingBox}
                      selectedFeatureId={selectedFeatureId ?? null}
                      unit={unit}
                      onHover={onFeatureHover ?? (() => {})}
                      onSelect={onFeatureSelect ?? (() => {})}
                    />
                  )}

                {file &&
                  parsedGeometry &&
                  parsedGeometry.meshes.length > 0 &&
                  !error &&
                  showMeasurements && (
                    <DimensionArrows
                      analysis={parsedGeometry.analysis}
                      unit={unit}
                    />
                  )}
              </ThreeScene>
            </div>
          )}

          {/* Bounding-box measurements card — bottom-left, toggle via Ruler pill */}
          {parsedGeometry?.analysis &&
            parsedGeometry.meshes.length > 0 &&
            showMeasurements &&
            !loading &&
            !error && (
              <MeasurementsOverlay analysis={parsedGeometry.analysis} unit={unit} />
            )}

          {/* Unit confirmation prompt for DXF / DWG-derived previews — shown once
              per browser, since drawing units in these formats are unreliable. */}
          {parsedGeometry?.analysis &&
            parsedGeometry.meshes.length > 0 &&
            !loading &&
            !error && (
              <UnitConfirmOverlay
                analysis={parsedGeometry.analysis}
                unit={unit}
                onUnitChange={setUnit}
              />
            )}

          {/* Preview-unavailable card for accepted formats that do not have
              renderable browser geometry yet, such as DWG, AI, and EPS. */}
          {parsedGeometry?.analysis?.previewKind === 'none' &&
            parsedGeometry.meshes.length === 0 &&
            !loading &&
            !error && (
              <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
                <div className="max-w-md rounded-2xl border border-slate-200 bg-white/95 px-6 py-5 text-center shadow-md shadow-slate-900/5 backdrop-blur">
                  <div className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                    <Eye className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    Preview unavailable for this format
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {parsedGeometry.analysis.quoteBlockingReasons?.[0] ??
                      parsedGeometry.analysis.warnings?.[0] ??
                      'Your file has been received and will be reviewed by our engineering team before quoting.'}
                  </p>
                </div>
              </div>
            )}

          {/* 3D / 2D pill toggle — top-left, separate from measurements and toolbar */}
          {parsedGeometry?.analysis?.previewKind === 'mesh3d' &&
            parsedGeometry.analysis.partShape === 'flat-sheet' &&
            !loading &&
            !error && (
              <div className="pointer-events-auto absolute left-3 top-3 z-20 inline-flex items-center rounded-full border border-slate-200/80 bg-white/90 p-0.5 text-xs font-semibold shadow-md shadow-slate-900/5 backdrop-blur sm:left-4 sm:top-4">
                {(['3d', '2d'] as const).map((mode) => {
                  const active = viewMode === mode
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      aria-pressed={active}
                      className={`h-7 min-w-[40px] rounded-full px-3 transition-colors ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {mode.toUpperCase()}
                    </button>
                  )
                })}
              </div>
            )}

          {/* Interaction hint — bottom-center, fades after a few seconds */}
          <AnimatePresence>
            {hasContent && !hasDocumentPreview && showHint && (
              <motion.button
                key="hint"
                type="button"
                onClick={dismissHint}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
                className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-4 py-2 text-xs font-medium text-slate-700 shadow-md shadow-slate-900/5 backdrop-blur transition hover:bg-white"
              >
                <Hand className="h-3.5 w-3.5 text-blue-600" />
                <span>Drag to rotate · Scroll to zoom · Right-click to pan</span>
                <X className="h-3 w-3 text-slate-400" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  )
}

function UnitToggle({
  unit,
  onChange,
}: {
  unit: 'mm' | 'in'
  onChange: (u: 'mm' | 'in') => void
}) {
  return (
    <div role="group" aria-label="Display units" className="flex items-center text-xs font-medium">
      {(['mm', 'in'] as const).map(u => {
        const active = unit === u
        return (
          <button
            key={u}
            type="button"
            onClick={() => onChange(u)}
            aria-pressed={active}
            className={`h-7 min-w-[40px] rounded-full px-2.5 transition-colors ${
              active
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {u}
          </button>
        )
      })}
    </div>
  )
}

function DocumentPreview({ url, fileName }: { url: string; fileName: string }) {
  return (
    <div className="absolute inset-0 bg-slate-100">
      <object
        data={url}
        type="application/pdf"
        aria-label={`Preview of ${fileName}`}
        className="h-full w-full"
      >
        <div className="flex h-full items-center justify-center p-6">
          <div className="max-w-sm rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center shadow-md">
            <div className="text-sm font-semibold text-slate-900">
              PDF preview is blocked by this browser
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              The file is PDF-compatible, but the embedded viewer could not display it.
            </p>
          </div>
        </div>
      </object>
    </div>
  )
}

function ToolbarButton({
  onClick,
  label,
  icon: Icon,
  disabled,
  active,
  emphasized,
}: {
  onClick: () => void
  label: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
  active?: boolean
  emphasized?: boolean
}) {
  const base =
    'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40'
  const tone = active
    ? 'bg-slate-900 text-white hover:bg-slate-800'
    : emphasized
      ? 'bg-slate-100 text-slate-900 hover:bg-slate-200'
      : 'text-slate-700 hover:bg-slate-100'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`${base} ${tone}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
