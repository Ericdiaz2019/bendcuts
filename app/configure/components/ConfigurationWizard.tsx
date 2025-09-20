'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Form } from '@/components/ui/form'

import { ConfigurationState, ConfigurationStep } from '@/lib/types/configuration'
import { configurationSchema, ConfigurationFormData } from '@/lib/schemas/configuration'
import { calculateQuote } from '@/lib/utils/quoteCalculator'

import FileUploadStep from './FileUploadStep'
import MaterialSelectionModal from './MaterialSelectionModal'
import QuoteDisplay from './QuoteDisplay'

const STEPS: { id: ConfigurationStep; title: string; description: string }[] = [
  {
    id: 'upload',
    title: 'Upload CAD File',
    description: 'Upload your STEP, IGES, or DXF file'
  },
  {
    id: 'quote',
    title: 'Get Quote',
    description: 'View your instant pricing'
  }
]

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
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [materialSelection, setMaterialSelection] = useState<any>(null)
  const [quote, setQuote] = useState<any>(null)
  const [fileAnalysis, setFileAnalysis] = useState<any>(null)
  const [preloadedFile, setPreloadedFile] = useState<File | null>(null)
  
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
        
        // Fetch the file from the blob URL
        fetch(uploadedFileUrl)
          .then(response => response.blob())
          .then(blob => {
            // Create a new File object
            const file = new File([blob], fileData.name, {
              type: fileData.type,
              lastModified: fileData.lastModified
            })
            
            setPreloadedFile(file)
            
            // Clear session storage
            sessionStorage.removeItem('uploadedFile')
            sessionStorage.removeItem('uploadedFileUrl')
            URL.revokeObjectURL(uploadedFileUrl)
          })
          .catch(error => {
            console.error('Error loading preloaded file:', error)
            // Clear session storage on error
            sessionStorage.removeItem('uploadedFile')
            sessionStorage.removeItem('uploadedFileUrl')
          })
      } catch (error) {
        console.error('Error parsing uploaded file data:', error)
        sessionStorage.removeItem('uploadedFile')
        sessionStorage.removeItem('uploadedFileUrl')
      }
    }
  }, [])

  const currentStepId = STEPS[state.currentStep].id
  const isLastStep = state.currentStep === STEPS.length - 1
  const isFirstStep = state.currentStep === 0

  const updateState = useCallback((updates: Partial<ConfigurationState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const calculateAndUpdatePricing = useCallback(() => {
    const { materialSelection, specifications } = state
    
    if (materialSelection.materialId && materialSelection.tubeSpec.diameter) {
      try {
        // This function would be implemented to bridge to calculateQuote
        console.log('calculatePricing called with:', materialSelection, specifications)
        // const pricing = calculatePricing(materialSelection.materialId, materialSelection.tubeSpec, specifications)
        // updateState({ pricing })
      } catch (error) {
        console.error('Pricing calculation error:', error)
      }
    }
  }, [state, updateState])

  const nextStep = useCallback(async () => {
    if (currentStepId === 'upload' && state.fileUpload.isValid) {
      // Show material selection modal instead of going to next step
      setShowMaterialModal(true)
      return
    }

    if (state.currentStep < STEPS.length - 1) {
      const newStep = state.currentStep + 1
      updateState({ currentStep: newStep })
    }
  }, [currentStepId, state.fileUpload.isValid, state.currentStep, updateState])

  const prevStep = useCallback(() => {
    if (state.currentStep > 0) {
      updateState({ currentStep: state.currentStep - 1 })
    }
  }, [state.currentStep, updateState])

  const handleStepComplete = useCallback((stepData: any) => {
    const stepId = STEPS[state.currentStep].id
    console.log('🎯 handleStepComplete called for step:', stepId, 'with data:', stepData)
    
    switch (stepId) {
      case 'upload':
        console.log('📁 Updating fileUpload state with:', stepData.fileName, stepData.isValid)
        updateState({ fileUpload: stepData })
        
        // Store file analysis if available
        if (stepData.analysis) {
          setFileAnalysis(stepData.analysis)
          console.log('📊 File analysis stored:', stepData.analysis)
        }
        break
    }
  }, [state.currentStep, updateState])

  const handleMaterialSelection = useCallback((selection: any) => {
    console.log('🏗️ Material selected:', selection)
    setMaterialSelection(selection)
    
    // Calculate quote
    if (fileAnalysis && lengthMeasurements) {
      const { lengthMm, lengthInches, originalUnits } = lengthMeasurements
      console.log('📏 Length conversion:', { lengthMm, originalUnits, lengthInches })

      const quoteInputs = {
        material: selection.material,
        quantity: selection.quantity,
        gauge: selection.gauge,
        length: lengthInches,
        bends: fileAnalysis.estimatedBends,
        cuts: fileAnalysis.estimatedCuts
      }
      
      const calculatedQuote = calculateQuote(quoteInputs)
      setQuote(calculatedQuote)
      
      // Move to quote step
      updateState({ currentStep: 1 })
    }
  }, [fileAnalysis, lengthMeasurements, updateState])

  const progress = ((state.currentStep + 1) / STEPS.length) * 100

  // Show quote display if we have a quote
  if (currentStepId === 'quote' && quote && materialSelection && fileAnalysis) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="px-4 sm:px-6 lg:px-8">
          <QuoteDisplay
            quote={quote}
            materialName={materialSelection.material.name}
            materialId={materialSelection.material.id}
            gauge={materialSelection.gauge}
            quantity={materialSelection.quantity}
            fileInfo={{
              fileName: state.fileUpload.fileName,
              lengthMm: lengthMeasurements?.lengthMm ?? 0,
              lengthInches: lengthMeasurements?.lengthInches ?? 0,
              originalUnits: lengthMeasurements?.originalUnits,
              bends: fileAnalysis.estimatedBends,
              cuts: fileAnalysis.estimatedCuts
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Configure Your Tube Bending Order
          </h1>
          <div className="max-w-2xl mx-auto">
            <Progress value={progress} className="mb-4" />
            <div className="flex justify-between text-sm text-gray-600 px-2">
              {STEPS.map((step, index) => (
                <div 
                  key={step.id} 
                  className={`flex items-center ${
                    index <= state.currentStep ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  {index < state.currentStep ? (
                    <CheckCircle className="w-4 h-4 mr-1" />
                  ) : (
                    <div className={`w-4 h-4 rounded-full border-2 mr-1 ${
                      index === state.currentStep 
                        ? 'border-blue-600 bg-blue-600' 
                        : 'border-gray-300'
                    }`} />
                  )}
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {STEPS[state.currentStep].title}
              </h2>
              <p className="text-gray-600">
                {STEPS[state.currentStep].description}
              </p>
            </div>

            <Form {...form}>
              <form className="space-y-6">
                {currentStepId === 'upload' && (
                  <FileUploadStep 
                    data={state.fileUpload}
                    onComplete={handleStepComplete}
                    form={form}
                    preloadedFile={preloadedFile}
                  />
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={isFirstStep}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="text-sm text-gray-500">
            Step {state.currentStep + 1} of {STEPS.length}
          </div>

          <Button 
            type="button"
            onClick={nextStep} 
            disabled={!state.fileUpload.isValid}
            className="flex items-center"
          >
            Continue to Material Selection
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Material Selection Modal */}
        <MaterialSelectionModal
          open={showMaterialModal}
          onClose={() => setShowMaterialModal(false)}
          onConfirm={handleMaterialSelection}
          fileInfo={fileAnalysis && lengthMeasurements ? {
            lengthMm: lengthMeasurements.lengthMm,
            lengthInches: lengthMeasurements.lengthInches,
            originalUnits: lengthMeasurements.originalUnits,
            bends: fileAnalysis.estimatedBends,
            cuts: fileAnalysis.estimatedCuts
          } : undefined}
        />
      </div>
    </div>
  )
}
