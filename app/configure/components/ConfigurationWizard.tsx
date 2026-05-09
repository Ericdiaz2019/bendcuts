'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { CADAnalysis, FileUploadData, ConfigurationState, ConfigurationStep } from '@/lib/types/configuration'
import { configurationSchema, ConfigurationFormData } from '@/lib/schemas/configuration'
import { calculateQuote, QuoteBreakdown, ManufacturingService } from '@/lib/utils/quoteCalculator'

import FileUploadStep from './FileUploadStep'
import type { PanelMaterial } from './MaterialSelectionPanel'
import QuoteDisplay from './QuoteDisplay'
import { easeOut, fadeUp } from './motion'

const STEPS: { id: ConfigurationStep; title: string; description: string }[] = [
  {
    id: 'upload',
    title: 'Upload & Configure',
    description: 'Drop your CAD file, then pick material and quantity right beside the preview.'
  },
  {
    id: 'quote',
    title: 'Review Your Quote',
    description: 'Transparent line-item pricing — no surprises.'
  }
]

interface QuoteMaterial {
  id: string
  name: string
  pricePerLb: number
}

interface MaterialSelectionResult {
  material: QuoteMaterial
  quantity: number
  gauge: string
  service: ManufacturingService
}

const initialState: ConfigurationState = {
  currentStep: 0,
  fileUpload: {
    file: null,
    fileName: '',
    fileSize: 0,
    fileType: '',
    isValid: false
  },
  materialSelection: {
    materialId: '',
    tubeSpec: {
      diameter: '',
      wallThickness: '',
      length: 0
    }
  },
  specifications: {
    quantity: 1,
    tolerances: {
      bendAngle: 1,
      centerlineRadius: 0.125,
      length: 0.02
    },
    finishing: {
      type: 'none'
    },
    rushOrder: false
  },
  pricing: {
    materialCost: 0,
    bendingCost: 0,
    finishingCost: 0,
    setupCost: 0,
    rushFee: 0,
    subtotal: 0,
    tax: 0,
    total: 0,
    leadTime: '3-5 days'
  },
  isComplete: false
}

export default function ConfigurationWizard() {
  const [state, setState] = useState<ConfigurationState>(initialState)
  const [materialSelection, setMaterialSelection] = useState<MaterialSelectionResult | null>(null)
  const [quote, setQuote] = useState<QuoteBreakdown | null>(null)
  const [fileAnalysis, setFileAnalysis] = useState<CADAnalysis | null>(null)
  const [preloadedFile, setPreloadedFile] = useState<File | null>(null)
  const [selectedMaterial, setSelectedMaterial] = useState<PanelMaterial | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  const [gauge, setGauge] = useState<string>('')
  const [service, setService] = useState<ManufacturingService>('tube-bending')
  const [serviceTouched, setServiceTouched] = useState<boolean>(false)

  // Default the service to the analyzer's recommendation, but stop following it
  // once the user has explicitly picked one.
  useEffect(() => {
    if (serviceTouched) return
    const recommended = fileAnalysis?.recommendedService
    if (recommended && recommended !== service) {
      setService(recommended)
    }
  }, [fileAnalysis?.recommendedService, service, serviceTouched])

  const lengthMeasurements = useMemo(() => {
    if (!fileAnalysis) {
      return null
    }

    const lengthMm = Number(fileAnalysis.totalLength) || 0
    const lengthInches = lengthMm / 25.4
    const originalUnits = (fileAnalysis.originalUnits || fileAnalysis.units || 'millimeter') as string

    return {
      lengthMm,
      lengthInches,
      originalUnits
    }
  }, [fileAnalysis])

  const form = useForm<ConfigurationFormData>({
    resolver: zodResolver(configurationSchema),
    mode: 'onChange',
    defaultValues: {
      fileUpload: initialState.fileUpload,
      materialSelection: initialState.materialSelection,
      specifications: initialState.specifications
    }
  })

  // Check for preloaded file from landing page
  useEffect(() => {
    const uploadedFileData = sessionStorage.getItem('uploadedFile')
    const uploadedFileUrl = sessionStorage.getItem('uploadedFileUrl')

    if (uploadedFileData && uploadedFileUrl) {
      try {
        const fileData = JSON.parse(uploadedFileData)

        fetch(uploadedFileUrl)
          .then(response => response.blob())
          .then(blob => {
            const file = new File([blob], fileData.name, {
              type: fileData.type,
              lastModified: fileData.lastModified
            })

            setPreloadedFile(file)

            sessionStorage.removeItem('uploadedFile')
            sessionStorage.removeItem('uploadedFileUrl')
            URL.revokeObjectURL(uploadedFileUrl)
          })
          .catch(() => {
            sessionStorage.removeItem('uploadedFile')
            sessionStorage.removeItem('uploadedFileUrl')
          })
      } catch {
        sessionStorage.removeItem('uploadedFile')
        sessionStorage.removeItem('uploadedFileUrl')
      }
    }
  }, [])

  const currentStepId = STEPS[state.currentStep].id

  const updateState = useCallback((updates: Partial<ConfigurationState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const handleStepComplete = useCallback((stepData: FileUploadData) => {
    const stepId = STEPS[state.currentStep].id

    switch (stepId) {
      case 'upload':
        updateState({ fileUpload: stepData })
        setFileAnalysis(stepData.analysis || null)
        if (!stepData.file) {
          setSelectedMaterial(null)
          setGauge('')
          setQuantity(1)
          setService('tube-bending')
          setServiceTouched(false)
        }
        break
    }
  }, [state.currentStep, updateState])

  const handleMaterialChange = useCallback((material: PanelMaterial) => {
    setSelectedMaterial(material)
    setGauge(prev => (material.gauges.includes(prev) ? prev : material.gauges[1] || material.gauges[0]))
  }, [])

  const handleQuantityChange = useCallback((value: number) => {
    setQuantity(Math.max(1, Math.min(10000, Math.floor(value) || 1)))
  }, [])

  const handleGaugeChange = useCallback((value: string) => {
    setGauge(value)
  }, [])

  const handleServiceChange = useCallback((value: ManufacturingService) => {
    setService(value)
    setServiceTouched(true)
    // The selected material may not be valid under the new service (e.g. carbon
    // steel can't 3D print). Drop it so the user re-picks from the filtered list.
    setSelectedMaterial(prev => {
      if (!prev) return prev
      const allowed = !prev.services || prev.services.includes(value)
      if (allowed) return prev
      return null
    })
    setGauge('')
  }, [])

  const handleQuoteSubmit = useCallback(() => {
    if (!selectedMaterial || !gauge || quantity < 1) return
    if (!fileAnalysis || !lengthMeasurements) return
    if (fileAnalysis.requiresManualReview) return

    const result: MaterialSelectionResult = {
      material: {
        id: selectedMaterial.id,
        name: selectedMaterial.name,
        pricePerLb: selectedMaterial.pricePerLb,
      },
      quantity,
      gauge,
      service,
    }
    setMaterialSelection(result)

    const calculatedQuote = calculateQuote({
      material: result.material,
      quantity,
      gauge,
      length: lengthMeasurements.lengthInches,
      bends: fileAnalysis.estimatedBends,
      cuts: fileAnalysis.estimatedCuts,
      service,
      laserFeatures: fileAnalysis.laserFeatureCount ?? 0,
    })
    setQuote(calculatedQuote)
    updateState({ currentStep: 1 })
  }, [selectedMaterial, gauge, quantity, fileAnalysis, lengthMeasurements, service, updateState])

  if (currentStepId === 'quote' && quote && materialSelection && fileAnalysis) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <WizardHeader currentStep={1} />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-20 mt-10 sm:mt-12">
          <motion.div initial="initial" animate="animate" variants={fadeUp}>
            <QuoteDisplay
              quote={quote}
              materialName={materialSelection.material.name}
              materialId={materialSelection.material.id}
              gauge={materialSelection.gauge}
              quantity={materialSelection.quantity}
              service={materialSelection.service}
              cadFile={state.fileUpload.file}
              fileInfo={{
                fileName: state.fileUpload.fileName,
                lengthMm: lengthMeasurements?.lengthMm ?? 0,
                lengthInches: lengthMeasurements?.lengthInches ?? 0,
                originalUnits: lengthMeasurements?.originalUnits,
                bends: fileAnalysis.estimatedBends,
                cuts: fileAnalysis.estimatedCuts,
                laserFeatures: fileAnalysis.laserFeatureCount ?? 0,
              }}
            />
          </motion.div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <WizardHeader currentStep={state.currentStep} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-20 mt-10 sm:mt-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeOut }}
          className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 ring-1 ring-white/60"
        >
          <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-10">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-base font-semibold text-white shadow-md shadow-blue-500/25">
                {state.currentStep + 1}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                  Step {state.currentStep + 1} of {STEPS.length}
                </div>
                <h2 className="mt-0.5 text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
                  {STEPS[state.currentStep].title}
                </h2>
              </div>
            </div>
            <p className="text-sm text-slate-600 sm:max-w-xs sm:text-right">
              {STEPS[state.currentStep].description}
            </p>
          </div>

          <div className="px-6 sm:px-10 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStepId}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={fadeUp}
              >
                {currentStepId === 'upload' && (
                  <FileUploadStep
                    data={state.fileUpload}
                    onComplete={handleStepComplete}
                    form={form}
                    preloadedFile={preloadedFile}
                    panel={{
                      selectedMaterial,
                      quantity,
                      gauge,
                      service,
                      isSubmitting: false,
                      onMaterialChange: handleMaterialChange,
                      onQuantityChange: handleQuantityChange,
                      onGaugeChange: handleGaugeChange,
                      onServiceChange: handleServiceChange,
                      onSubmit: handleQuoteSubmit,
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </main>
  )
}

function WizardHeader({ currentStep }: { currentStep: number }) {
  const progress = ((currentStep + 1) / STEPS.length) * 100

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      {/* glow accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-blue-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-cyan-400/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-14 pb-16 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeOut }}
          className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-blue-200/80"
        >
          <span className="inline-block w-6 h-px bg-blue-300/60" />
          Configure your order
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: easeOut, delay: 0.05 }}
          className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight"
        >
          Get an instant quote on your tube
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: easeOut, delay: 0.1 }}
          className="mt-2 max-w-xl text-slate-300"
        >
          Upload your CAD file and we&apos;ll auto-detect length, bends, and cuts — then you pick a material.
        </motion.p>

        {/* Stepper */}
        <div className="mt-10">
          <div className="flex items-center gap-3 sm:gap-5">
            {STEPS.map((step, idx) => {
              const status: 'done' | 'active' | 'todo' =
                idx < currentStep ? 'done' : idx === currentStep ? 'active' : 'todo'

              return (
                <div key={step.id} className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                  <StepIndicator index={idx} status={status} title={step.title} />
                  {idx < STEPS.length - 1 && (
                    <div className="hidden sm:block flex-1 h-px bg-white/10 relative overflow-hidden">
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: idx < currentStep ? 1 : 0 }}
                        transition={{ duration: 0.5, ease: easeOut }}
                        style={{ transformOrigin: 'left' }}
                        className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-300"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Mobile progress bar */}
          <div className="sm:hidden mt-5 h-1 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: easeOut }}
              className="h-full bg-gradient-to-r from-blue-400 to-cyan-300"
            />
          </div>
        </div>
      </div>
    </header>
  )
}

function StepIndicator({
  index,
  status,
  title,
}: {
  index: number
  status: 'done' | 'active' | 'todo'
  title: string
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <motion.div
        animate={{
          scale: status === 'active' ? 1.04 : 1,
          backgroundColor:
            status === 'done'
              ? 'rgb(96 165 250)'
              : status === 'active'
                ? 'rgb(255 255 255)'
                : 'rgba(255,255,255,0.06)',
          color: status === 'active' ? 'rgb(15 23 42)' : 'rgb(255 255 255)',
          borderColor:
            status === 'todo' ? 'rgba(255,255,255,0.18)' : 'transparent',
        }}
        transition={{ duration: 0.3, ease: easeOut }}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
      >
        {status === 'done' ? (
          <Check className="w-4 h-4" strokeWidth={3} />
        ) : (
          <span>{index + 1}</span>
        )}
        {status === 'active' && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full ring-2 ring-blue-300/50"
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </motion.div>
      <div className="min-w-0">
        <div
          className={`text-sm font-medium truncate ${
            status === 'todo' ? 'text-slate-400' : 'text-white'
          }`}
        >
          {title}
        </div>
        <div className="text-[11px] uppercase tracking-wider text-slate-400">
          {status === 'done' ? 'Complete' : status === 'active' ? 'In progress' : 'Up next'}
        </div>
      </div>
    </div>
  )
}
