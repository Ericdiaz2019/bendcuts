'use client'

import React, { useCallback, useState, useRef } from 'react'
import { FileRejection, useDropzone } from 'react-dropzone'
import dynamic from 'next/dynamic'
import {
  UploadCloud,
  FileCog,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  ShieldCheck,
  HardDrive,
  Boxes,
} from 'lucide-react'
import { UseFormReturn } from 'react-hook-form'
import { AnimatePresence, motion } from 'framer-motion'

import { Alert, AlertDescription } from '@/components/ui/alert'

import {
  CADAnalysis,
  CADFileType,
  Feature,
  FeatureConfigMap,
  FileUploadData,
} from '@/lib/types/configuration'
import { ConfigurationFormData } from '@/lib/schemas/configuration'
import { ManufacturingService } from '@/lib/utils/quoteCalculator'
import {
  ACCEPTED_CAD_EXTENSIONS,
  CAD_FORMAT_CAPABILITIES,
  getCadFormatCapabilityForFileName,
} from '@/lib/cad/formatCapabilities'
import MaterialSelectionPanel, { PanelMaterial } from './MaterialSelectionPanel'
import { easeOut, fadeUp, popIn } from './motion'

// Lazy-load the 3D viewer — react-three-fiber + drei + occt-import-js add ~1.2MB.
// Only ship them when the user actually has a file to view.
const CADViewer = dynamic(() => import('./CADViewer/CADViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-[16/10] min-h-[420px] lg:min-h-[520px] xl:min-h-[600px] items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-2 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-xs">Loading viewer…</span>
      </div>
    </div>
  ),
})

interface PanelState {
  selectedMaterial: PanelMaterial | null
  quantity: number
  gauge: string
  service: ManufacturingService
  isSubmitting: boolean
  features?: Feature[]
  featureConfigs: FeatureConfigMap
  selectedFeatureId: string | null
  onMaterialChange: (material: PanelMaterial) => void
  onQuantityChange: (quantity: number) => void
  onGaugeChange: (gauge: string) => void
  onServiceChange: (service: ManufacturingService) => void
  onConfigureFeature: (featureId: string) => void
  onClearFeatureConfig: (featureId: string) => void
  onSelectFeature: (featureId: string | null) => void
  onResetAllFeatures: () => void
  onSubmit: () => void
}

interface FileUploadStepProps {
  data: FileUploadData
  onComplete: (data: FileUploadData) => void
  form: UseFormReturn<ConfigurationFormData>
  preloadedFile?: File | null
  panel: PanelState
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function FileUploadStep({ data, onComplete, form, preloadedFile, panel }: FileUploadStepProps) {
  const [uploadData, setUploadData] = useState<FileUploadData>(data)
  const [error, setError] = useState<string>('')
  const fileDataRef = useRef<FileUploadData | null>(null)
  const latestUploadDataRef = useRef<FileUploadData>(data)
  const hasValidFileRef = useRef<boolean>(false)
  latestUploadDataRef.current = uploadData

  const commitUploadData = useCallback((next: FileUploadData) => {
    latestUploadDataRef.current = next
    fileDataRef.current = next
    setUploadData(next)
    form.setValue('fileUpload', next)
    onComplete(next)
  }, [form, onComplete])

  const updateUploadData = useCallback((updates: Partial<FileUploadData>) => {
    const next = { ...latestUploadDataRef.current, ...updates }
    commitUploadData(next)
  }, [commitUploadData])

  const handleParsingStart = useCallback(() => {
    updateUploadData({
      isValid: false,
      parseStatus: 'parsing',
      analysis: undefined,
      parseError: undefined
    })
  }, [updateUploadData])

  const handleParsingComplete = useCallback((analysis: CADAnalysis) => {
    const instantQuoteEligible =
      analysis.instantQuoteEligible ?? !analysis.requiresManualReview

    updateUploadData({
      isValid: instantQuoteEligible,
      parseStatus: instantQuoteEligible ? 'parsed' : 'review_required',
      analysis,
      parseError: undefined
    })
  }, [updateUploadData])

  const handleParsingError = useCallback((message: string) => {
    updateUploadData({
      isValid: false,
      parseStatus: 'failed',
      analysis: undefined,
      parseError: message
    })
  }, [updateUploadData])

  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    if (file.size > MAX_FILE_SIZE) {
      return { isValid: false, error: 'File size must be under 50MB' }
    }

    const capability = getCadFormatCapabilityForFileName(file.name)

    if (!capability) {
      return {
        isValid: false,
        error: 'File must be STEP, IGES, DXF, DWG, AI, or EPS format'
      }
    }

    return { isValid: true }
  }, [])

  const handleFileUpload = useCallback((file: File) => {
    const validation = validateFile(file)

    if (!validation.isValid) {
      setError(validation.error || 'Invalid file')
      return
    }

    setError('')

    const extension = file.name.toLowerCase().split('.').pop()
    let fileType: CADFileType | '' = ''

    switch (extension) {
      case 'step':
      case 'stp':
        fileType = 'step'
        break
      case 'iges':
      case 'igs':
        fileType = 'iges'
        break
      case 'dxf':
        fileType = 'dxf'
        break
      case 'eps':
        fileType = 'eps'
        break
      case 'ai':
        fileType = 'ai'
        break
      case 'dwg':
        fileType = 'dwg'
        break
      default:
        fileType = ''
    }

    const newUploadData: FileUploadData = {
      file,
      fileName: file.name,
      fileSize: file.size,
      fileType,
      isValid: false,
      parseStatus: 'accepted',
      analysis: undefined,
      parseError: undefined,
      preview: undefined
    }

    commitUploadData(newUploadData)
  }, [validateFile, commitUploadData])

  const removeFile = useCallback(() => {
    const emptyData: FileUploadData = {
      file: null,
      fileName: '',
      fileSize: 0,
      fileType: '',
      isValid: false,
      parseStatus: 'idle'
    }

    hasValidFileRef.current = false
    fileDataRef.current = null
    latestUploadDataRef.current = emptyData

    setUploadData(emptyData)
    setError('')
    onComplete(emptyData)
    form.setValue('fileUpload', emptyData)
  }, [onComplete, form])

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File size must be under 50MB')
      } else {
        setError('Please upload a valid CAD file (STEP, IGES, DXF, DWG, AI, or EPS)')
      }
      return
    }

    if (acceptedFiles.length > 0) {
      handleFileUpload(acceptedFiles[0])
    }
  }, [handleFileUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    noClick: false,
    noKeyboard: false,
    disabled: false
  })

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  React.useEffect(() => {
    if (preloadedFile && !uploadData.file) {
      handleFileUpload(preloadedFile)
    }
  }, [preloadedFile, uploadData.file, handleFileUpload])

  React.useEffect(() => {
    if (uploadData.isValid && uploadData.file) {
      hasValidFileRef.current = true
      fileDataRef.current = uploadData
    }
  }, [uploadData])

  React.useEffect(() => {
    if (hasValidFileRef.current && uploadData.file && !data.file) {
      return
    }

    if (data.file !== uploadData.file) {
      setUploadData(data)
      fileDataRef.current = data
      latestUploadDataRef.current = data
      if (data.isValid && data.file) {
        hasValidFileRef.current = true
      }
    }
  }, [data, uploadData])

  const status = uploadData.parseStatus
  const showWorkspace =
    status === 'accepted' || status === 'parsing' || status === 'parsed' || status === 'review_required'

  const panelFileInfo = React.useMemo(() => {
    const analysis = uploadData.analysis
    if (!analysis) return null
    const lengthMm = Number(analysis.totalLength) || 0
    const lengthInches = lengthMm / 25.4
    const originalUnits = (analysis.originalUnits || analysis.units || 'millimeter') as string
    return {
      lengthMm,
      lengthInches,
      originalUnits,
      bends: analysis.estimatedBends,
      cuts: analysis.estimatedCuts,
      laserFeatures: analysis.laserFeatureCount ?? 0,
      partShape: analysis.partShape,
      recommendedService: analysis.recommendedService,
      previewKind: analysis.previewKind,
      instantQuoteEligible: analysis.instantQuoteEligible ?? !analysis.requiresManualReview,
      quoteConfidence: analysis.quoteConfidence,
      quoteBlockingReasons: analysis.quoteBlockingReasons ?? [],
    }
  }, [uploadData.analysis])

  const errorAlerts = (
    <AnimatePresence>
      {error && (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: easeOut }}
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}
      {uploadData.parseError && (
        <motion.div
          key="parse-error"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: easeOut }}
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadData.parseError}</AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!uploadData.file ? (
          <motion.div
            key="dropzone"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Dropzone
              isDragActive={isDragActive}
              getRootProps={getRootProps}
              getInputProps={getInputProps}
            />
          </motion.div>
        ) : showWorkspace ? (
          <motion.div
            key="workspace"
            variants={popIn}
            initial="initial"
            animate="animate"
            exit="exit"
            className="grid gap-6 lg:grid-cols-12"
          >
            <div className="lg:col-span-8 space-y-3">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <FileCard
                  uploadData={uploadData}
                  formatFileSize={formatFileSize}
                  onRemove={removeFile}
                  embedded
                />
                <CADViewer
                  file={uploadData.file}
                  className="w-full"
                  interactive={false}
                  features={panel.features}
                  featureConfigs={panel.featureConfigs}
                  selectedFeatureId={panel.selectedFeatureId}
                  onFeatureHover={panel.onSelectFeature}
                  onFeatureSelect={panel.onConfigureFeature}
                  onParsingStart={handleParsingStart}
                  onParsingComplete={handleParsingComplete}
                onParsingError={handleParsingError}
              />
            </div>
              {errorAlerts}
            </div>

            <div className="lg:col-span-4">
              <MaterialSelectionPanel
                fileInfo={panelFileInfo}
                selectedMaterial={panel.selectedMaterial}
                quantity={panel.quantity}
                gauge={panel.gauge}
                service={panel.service}
                isReadyToQuote={uploadData.analysis?.instantQuoteEligible ?? uploadData.isValid}
                isSubmitting={panel.isSubmitting}
                features={panel.features}
                featureConfigs={panel.featureConfigs}
                selectedFeatureId={panel.selectedFeatureId}
                onMaterialChange={panel.onMaterialChange}
                onQuantityChange={panel.onQuantityChange}
                onGaugeChange={panel.onGaugeChange}
                onServiceChange={panel.onServiceChange}
                onConfigureFeature={panel.onConfigureFeature}
                onClearFeatureConfig={panel.onClearFeatureConfig}
                onSelectFeature={panel.onSelectFeature}
                onResetAllFeatures={panel.onResetAllFeatures}
                onSubmit={panel.onSubmit}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="file-card-only"
            variants={popIn}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-2xl space-y-4"
          >
            <FileCard
              uploadData={uploadData}
              formatFileSize={formatFileSize}
              onRemove={removeFile}
            />
            {errorAlerts}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Dropzone({
  isDragActive,
  getRootProps,
  getInputProps,
}: {
  isDragActive: boolean
  getRootProps: ReturnType<typeof useDropzone>['getRootProps']
  getInputProps: ReturnType<typeof useDropzone>['getInputProps']
}) {
  return (
    <div
      {...getRootProps()}
      className={`group relative isolate cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed transition-colors duration-300 ${
        isDragActive
          ? 'border-blue-500 bg-blue-50/70'
          : 'border-slate-300/80 bg-white hover:border-blue-400'
      }`}
    >
      <input {...getInputProps()} />

      {/* subtle grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(226 232 240 / 0.7) 1px, transparent 1px), linear-gradient(to bottom, rgb(226 232 240 / 0.7) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage:
            'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
      {/* drag-active glow */}
      <motion.div
        aria-hidden
        animate={{ opacity: isDragActive ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/5 via-cyan-400/5 to-transparent"
      />

      <div className="px-6 py-14 sm:px-12 sm:py-20">
        {/* Icon stack */}
        <div className="relative mx-auto mb-7 h-24 w-24">
          {/* Floating accent tiles */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0.5, y: 0 }}
            animate={{
              y: isDragActive ? -10 : [0, -6, 0],
              opacity: isDragActive ? 0.85 : [0.5, 0.7, 0.5],
            }}
            transition={{
              duration: isDragActive ? 0.3 : 3.5,
              repeat: isDragActive ? 0 : Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -left-3 top-2 flex h-10 w-10 rotate-[-8deg] items-center justify-center rounded-xl border border-slate-200 bg-white shadow-md shadow-slate-900/5"
          >
            <FileCog className="h-5 w-5 text-slate-400" />
          </motion.div>
          <motion.div
            aria-hidden
            initial={{ opacity: 0.5, y: 0 }}
            animate={{
              y: isDragActive ? -8 : [0, -4, 0],
              opacity: isDragActive ? 0.9 : [0.55, 0.7, 0.55],
            }}
            transition={{
              duration: isDragActive ? 0.3 : 3,
              repeat: isDragActive ? 0 : Infinity,
              ease: 'easeInOut',
              delay: 0.4,
            }}
            className="absolute -right-3 top-3 flex h-10 w-10 rotate-[10deg] items-center justify-center rounded-xl border border-slate-200 bg-white shadow-md shadow-slate-900/5"
          >
            <Boxes className="h-5 w-5 text-slate-400" />
          </motion.div>

          {/* Primary icon */}
          <motion.div
            animate={{
              scale: isDragActive ? 1.05 : 1,
              y: isDragActive ? -4 : 0,
            }}
            transition={{ duration: 0.25, ease: easeOut }}
            className="relative z-10 mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-xl shadow-blue-500/30"
          >
            <UploadCloud className="h-10 w-10" strokeWidth={2} />
            <motion.span
              aria-hidden
              initial={{ opacity: 0.5, scale: 1 }}
              animate={{ opacity: 0, scale: 1.7 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-2xl ring-2 ring-blue-400/40"
            />
          </motion.div>
        </div>

        {/* Copy */}
        <div className="text-center">
          <motion.h3
            key={isDragActive ? 'drag' : 'idle'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900"
          >
            {isDragActive ? 'Release to upload' : 'Drop your CAD file to begin'}
          </motion.h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            We&apos;ll auto-detect length, bends and cuts in seconds — no signup required.{' '}
            <span className="whitespace-nowrap font-medium text-blue-600 underline-offset-4 group-hover:underline">
              Browse files
            </span>
          </p>

          {/* Format chips */}
          <div className="mt-6 grid gap-2 text-xs sm:grid-cols-3">
            {[
              ['step', 'stp'],
              ['iges', 'igs'],
              ['dxf'],
              ['dwg'],
              ['ai'],
              ['eps'],
            ].map(group => {
              const capability = CAD_FORMAT_CAPABILITIES[group[0] as CADFileType]
              return (
                <div
                  key={group.join('-')}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm"
                >
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                    {group.map(ext => `.${ext}`).join(' / ')}
                  </div>
                  <div className="mt-1 text-[11px] leading-snug text-slate-500">
                    {capability.badge}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="relative border-t border-slate-200/70 bg-slate-50/60 px-6 py-3 sm:px-12">
        <div className="grid grid-cols-1 gap-2 text-[12px] text-slate-600 sm:grid-cols-3">
          <TrustItem icon={ShieldCheck} label="Instant analysis where geometry is supported" />
          <TrustItem icon={HardDrive} label={`Up to 50 MB · ${ACCEPTED_CAD_EXTENSIONS.map(ext => ext.toUpperCase()).join(', ')}`} />
          <TrustItem icon={Boxes} label="DWG, AI, and EPS need engineering review" />
        </div>
      </div>
    </div>
  )
}

function TrustItem({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
      <span className="truncate">{label}</span>
    </div>
  )
}

function FileCard({
  uploadData,
  formatFileSize,
  onRemove,
  embedded = false,
}: {
  uploadData: FileUploadData
  formatFileSize: (bytes: number) => string
  onRemove: () => void
  embedded?: boolean
}) {
  const status = uploadData.parseStatus
  const isWorking = status === 'parsing' || status === 'accepted'
  const capability = getCadFormatCapabilityForFileName(uploadData.fileName)
  const tone =
    status === 'failed'
      ? { bar: 'from-rose-400 to-red-500', icon: 'text-rose-600', bg: 'bg-rose-50', label: 'Parse failed', dot: 'bg-rose-500', text: 'text-rose-700' }
      : status === 'review_required'
        ? { bar: 'from-amber-300 to-orange-400', icon: 'text-amber-700', bg: 'bg-amber-50', label: 'Review required', dot: 'bg-amber-500', text: 'text-amber-700' }
      : status === 'parsed'
        ? { bar: 'from-emerald-400 to-green-500', icon: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Ready to quote', dot: 'bg-emerald-500', text: 'text-emerald-700' }
        : { bar: 'from-blue-400 to-cyan-400', icon: 'text-blue-700', bg: 'bg-blue-50', label: 'Analyzing…', dot: 'bg-blue-500', text: 'text-blue-700' }

  // Best-effort split: long.name.with.dots.STEP -> "long.name.with.dots" + "STEP"
  const dot = uploadData.fileName.lastIndexOf('.')
  const baseName = dot > 0 ? uploadData.fileName.slice(0, dot) : uploadData.fileName
  const ext = dot > 0
    ? uploadData.fileName.slice(dot + 1).toUpperCase()
    : uploadData.fileType.toUpperCase()

  const wrapperClass = embedded
    ? 'relative overflow-hidden border-b border-slate-200 bg-white'
    : 'relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'

  return (
    <div className={wrapperClass}>
      {/* hairline progress bar at top edge */}
      <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
        {isWorking ? (
          <motion.div
            className={`h-full w-1/3 bg-gradient-to-r ${tone.bar}`}
            animate={{ x: ['-100%', '300%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-r ${tone.bar}`} />
        )}
      </div>

      <div className="flex items-center gap-3 px-3.5 py-2.5 sm:px-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone.bg}`}>
          <FileCog className={`h-4 w-4 ${tone.icon}`} strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4
              className="truncate text-sm font-semibold text-slate-900"
              title={uploadData.fileName}
            >
              {baseName}
            </h4>
            <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-px font-mono text-[10px] font-medium tracking-wide text-slate-600">
              {ext}
            </span>
            {status === 'parsed' && (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-500">
            <span className="relative flex h-1.5 w-1.5">
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${tone.dot} opacity-60 ${
                  isWorking ? 'animate-ping' : ''
                }`}
              />
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${tone.dot}`} />
            </span>
            <span className={`font-medium ${tone.text}`}>
              {isWorking ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {tone.label}
                </span>
              ) : (
                tone.label
              )}
            </span>
            <span className="text-slate-300">·</span>
            <span>{formatFileSize(uploadData.fileSize)}</span>
            {capability && (
              <>
                <span className="text-slate-300">·</span>
                <span>{capability.badge}</span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-500"
          aria-label="Remove file"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
