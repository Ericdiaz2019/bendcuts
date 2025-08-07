'use client'

import React, { useCallback, useState, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, AlertCircle, CheckCircle, X } from 'lucide-react'
import { UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { FileUploadData } from '@/lib/types/configuration'
import { ConfigurationFormData } from '@/lib/schemas/configuration'
import CADViewer from './CADViewer/CADViewer'

interface FileUploadStepProps {
  data: FileUploadData
  onComplete: (data: FileUploadData) => void
  form: UseFormReturn<ConfigurationFormData>
  preloadedFile?: File | null
}

// Simplified accept - focus on file extensions rather than MIME types
// CAD files often have unclear MIME types so we'll be more permissive
const ACCEPTED_FILE_TYPES = {
  'application/octet-stream': ['.step', '.stp', '.iges', '.igs', '.dxf']
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function FileUploadStep({ data, onComplete, form, preloadedFile }: FileUploadStepProps) {
  console.log('🔄 FileUploadStep render - received data:', !!data.file, data.fileName)
  
  const [uploadData, setUploadData] = useState<FileUploadData>(data)
  const [error, setError] = useState<string>('')
  const [fileAnalysis, setFileAnalysis] = useState<any>(null)
  const fileDataRef = useRef<FileUploadData | null>(null)
  const isInteractingRef = useRef<boolean>(false)
  const hasValidFileRef = useRef<boolean>(false)

  // Stable callback for handling parsing completion
  const handleParsingComplete = useCallback((analysis: any) => {
    console.log('📊 Received file analysis:', analysis)
    setFileAnalysis(analysis)
    
    // Update the complete data when analysis is available
    const completeData = { ...uploadData, analysis }
    onComplete(completeData)
  }, [uploadData, onComplete])

  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { isValid: false, error: 'File size must be under 50MB' }
    }

    // Check file extension
    const extension = file.name.toLowerCase().split('.').pop()
    const validExtensions = ['step', 'stp', 'iges', 'igs', 'dxf']
    
    if (!extension || !validExtensions.includes(extension)) {
      return { 
        isValid: false, 
        error: 'File must be in STEP (.step, .stp), IGES (.iges, .igs), or DXF (.dxf) format' 
      }
    }

    return { isValid: true }
  }, [])

  const handleFileUpload = useCallback((file: File) => {
    console.log('🔥 handleFileUpload called with:', file.name)
    const validation = validateFile(file)
    
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file')
      return
    }

    setError('')
    
    // Determine file type from extension
    const extension = file.name.toLowerCase().split('.').pop()
    let fileType = ''
    
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
      default:
        fileType = extension || ''
    }

    const newUploadData: FileUploadData = {
      file,
      fileName: file.name,
      fileSize: file.size,
      fileType,
      isValid: true,
      preview: undefined // Will be generated when 3D preview is implemented
    }


    setUploadData(newUploadData)
    fileDataRef.current = newUploadData // Store in ref to prevent loss
    
    // Update form first
    form.setValue('fileUpload', newUploadData)
    
    // Then notify parent - this should only happen once per file upload
    console.log('🚀 Calling onComplete with file data:', newUploadData.fileName)
    
    // Include analysis if available
    const completeData = fileAnalysis ? { ...newUploadData, analysis: fileAnalysis } : newUploadData
    onComplete(completeData)
  }, [validateFile, onComplete, form])


  const removeFile = useCallback(() => {
    console.log('❌ Removing file - this should only happen when user clicks X button')
    console.trace('removeFile call stack:')
    const emptyData: FileUploadData = {
      file: null,
      fileName: '',
      fileSize: 0,
      fileType: '',
      isValid: false
    }
    
    // Reset all flags and refs
    hasValidFileRef.current = false
    fileDataRef.current = null
    isInteractingRef.current = false
    
    setUploadData(emptyData)
    setError('')
    onComplete(emptyData)
    form.setValue('fileUpload', emptyData)
  }, [onComplete, form])

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    console.log('📁 File drop/select event:', acceptedFiles.length, 'accepted,', rejectedFiles.length, 'rejected')
    console.log('User interacting?', isInteractingRef.current)
    
    // Don't process file drops while user is interacting with 3D controls
    if (isInteractingRef.current) {
      console.log('🚫 Ignoring file drop - user is interacting with 3D controls')
      return
    }
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      console.log('File rejected:', rejection.errors)
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File size must be under 50MB')
      } else {
        setError('Please upload a valid CAD file (STEP, IGES, or DXF)')
      }
      return
    }

    if (acceptedFiles.length > 0) {
      console.log('Processing accepted file:', acceptedFiles[0].name)
      handleFileUpload(acceptedFiles[0])
    }
  }, [handleFileUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // Removed accept to allow all files - we validate in the handler
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    noClick: false,
    noKeyboard: false,
    disabled: false // Keep enabled to allow file replacement
  })

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Handle preloaded file from landing page
  React.useEffect(() => {
    if (preloadedFile && !uploadData.file) {
      console.log('🚀 Processing preloaded file:', preloadedFile.name)
      handleFileUpload(preloadedFile)
    }
  }, [preloadedFile, uploadData.file, handleFileUpload])

  // Initialize refs
  React.useEffect(() => {
    if (uploadData.isValid && uploadData.file) {
      hasValidFileRef.current = true
      fileDataRef.current = uploadData
    }
  }, [uploadData.isValid, uploadData.file])

  // Prevent data from being reset when props change
  React.useEffect(() => {
    // Don't update state if user is currently interacting
    if (isInteractingRef.current) {
      console.log('🚫 Skipping props update - user is interacting')
      return
    }
    
    // If we have a valid file but props want to reset it, resist!
    if (hasValidFileRef.current && uploadData.file && !data.file) {
      console.log('🛡️ BLOCKING file reset - we have a valid file')
      return
    }
    
    // Only update uploadData if it's truly different and not just a re-render
    if (data.file !== uploadData.file) {
      console.log('📥 Updating uploadData from props:', !!data.file, 'vs current:', !!uploadData.file)
      setUploadData(data)
      fileDataRef.current = data
      if (data.isValid && data.file) {
        hasValidFileRef.current = true
      }
    }
  }, [data, uploadData.file])

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      {!uploadData.isValid ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-blue-300 bg-blue-50/50 hover:bg-blue-50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className={`w-16 h-16 mx-auto mb-6 transition-transform ${
            isDragActive ? 'scale-110 text-blue-600' : 'text-blue-600'
          }`} />
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            {isDragActive
              ? 'Drop your CAD file here'
              : 'Drop your CAD file here or click to browse'
            }
          </h3>
          <p className="text-gray-600 mb-6">
            STEP, IGES, DXF files accepted • Max 50MB
          </p>
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
            Browse Files
          </Button>
        </div>
      ) : (
        /* File Preview */
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <File className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{uploadData.fileName}</h4>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(uploadData.fileSize)} • {uploadData.fileType.toUpperCase()} file
                  </p>
                  <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800">
                    File uploaded successfully
                  </Badge>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeFile}
                className="text-gray-500 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File Requirements */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">File Requirements:</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
            STEP (.step, .stp), IGES (.iges, .igs), or DXF (.dxf) format
          </li>
          <li className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
            Maximum file size: 50MB
          </li>
          <li className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
            Single tube geometry (no assemblies)
          </li>
          <li className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
            Centerline representation preferred
          </li>
        </ul>
      </div>

      {/* 3D Preview */}
      {uploadData.isValid && uploadData.file && (
        <div>
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900">3D Preview</h4>
            <p className="text-sm text-gray-600">Preview of your uploaded CAD file</p>
          </div>

          <CADViewer 
            file={uploadData.file}
            className="w-full"
            interactive={false}
            onParsingComplete={handleParsingComplete}
          />
        </div>
      )}
    </div>
  )
}