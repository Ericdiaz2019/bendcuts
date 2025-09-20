'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Calculator, Truck, CheckCircle, Star, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const ACCEPTED_FILE_TYPES = ['step', 'stp', 'iges', 'igs', 'dxf']
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function HomePage() {
  const router = useRouter()
  const [isDragActive, setIsDragActive] = useState(false)
  const [error, setError] = useState('')

  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { isValid: false, error: 'File size must be under 50MB' }
    }

    // Check file extension
    const extension = file.name.toLowerCase().split('.').pop()
    
    if (!extension || !ACCEPTED_FILE_TYPES.includes(extension)) {
      return { 
        isValid: false, 
        error: 'File must be in STEP (.step, .stp), IGES (.iges, .igs), or DXF (.dxf) format' 
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
    
    // Store file in sessionStorage to pass to configure page
    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }
    sessionStorage.setItem('uploadedFile', JSON.stringify(fileData))
    
    // Create a temporary URL for the file and store it
    const fileUrl = URL.createObjectURL(file)
    sessionStorage.setItem('uploadedFileUrl', fileUrl)
    
    // Navigate to configure page
    router.push('/configure')
  }, [validateFile, router])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  const handleUploadClick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.step,.stp,.iges,.igs,.dxf'
    input.onchange = handleFileSelect
    input.click()
  }, [handleFileSelect])
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-gray-900">TubeBend</div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 font-medium">
                How it Works
              </a>
              <a href="#materials" className="text-gray-600 hover:text-gray-900 font-medium">
                Materials
              </a>
              <a href="/contact" className="text-gray-600 hover:text-gray-900 font-medium">
                Contact
              </a>
              <div className="flex items-center space-x-4 ml-8">
                <a href="/auth/login" className="text-gray-600 hover:text-gray-900 font-medium">
                  Sign In
                </a>
                <a href="/auth/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
                  Get Started
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Custom Tube Bending
              <br />
              <span className="text-blue-600">Upload, Quote, Order</span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
              Professional tube bending from your CAD files in 3-5 days. Get transparent pricing in under 30 seconds.
            </p>

            {/* File Upload Area */}
            <div className="max-w-2xl mx-auto">
              <div 
                className={`border-2 border-dashed rounded-2xl p-12 transition-colors cursor-pointer group ${
                  isDragActive 
                    ? 'border-blue-500 bg-blue-100' 
                    : 'border-blue-300 bg-blue-50/50 hover:bg-blue-50'
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleUploadClick}
              >
                <div className="text-center">
                  <Upload className={`w-16 h-16 text-blue-600 mx-auto mb-6 transition-transform ${
                    isDragActive ? 'scale-110' : 'group-hover:scale-110'
                  }`} />
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                    {isDragActive 
                      ? 'Drop your CAD file here' 
                      : 'Drop your CAD file here or click to browse'
                    }
                  </h3>
                  <p className="text-gray-600 mb-6">STEP, IGES, DXF files accepted • Max 50MB</p>
                  {error && (
                    <p className="text-red-600 text-sm mb-4">{error}</p>
                  )}
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg">
                    Upload File & Get Quote
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4 text-center">
                ✓ Instant pricing • ✓ No account required • ✓ Secure file handling
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Proof Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* 3D Preview */}
            <div className="order-2 lg:order-1">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">See Your Part Before You Order</h3>
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mb-6">
                  <img
                    src="/placeholder.svg?height=300&width=300"
                    alt="3D tube bending preview"
                    className="w-64 h-64 object-contain"
                  />
                </div>
                <p className="text-gray-600">
                  Interactive 3D preview shows exactly how your tube will be bent, with precise measurements and bend
                  angles.
                </p>
              </div>
            </div>

            {/* Pricing Preview */}
            <div className="order-1 lg:order-2">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">Transparent Pricing</h3>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Material (1" Steel Tube)</span>
                    <span className="font-semibold">$24.50</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Bending (3 bends)</span>
                    <span className="font-semibold">$18.00</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Finishing</span>
                    <span className="font-semibold">$12.00</span>
                  </div>
                  <div className="flex justify-between items-center py-3 text-lg font-bold">
                    <span>Total per part</span>
                    <span className="text-blue-600">$54.50</span>
                  </div>
                </div>
                <Badge variant="secondary" className="mb-4">
                  Ready to ship in 3-5 days
                </Badge>
                <p className="text-gray-600 text-sm">
                  Unlike competitors' black box pricing, see exactly what you're paying for.
                </p>
              </div>
            </div>
          </div>

          {/* Trust Signals */}
          <div className="mt-16 text-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">1,247</div>
                <div className="text-gray-600">Parts Manufactured</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">97%</div>
                <div className="text-gray-600">Ship Within Promise</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">4.9★</div>
                <div className="text-gray-600">Customer Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From CAD file to finished part in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">1. Upload Your CAD File</h3>
              <p className="text-gray-600">
                Drop your STEP, IGES, or DXF file. Our system automatically analyzes your design and calculates bend
                requirements.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calculator className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">2. Get Instant Quote</h3>
              <p className="text-gray-600">
                Receive transparent pricing in under 30 seconds. See material costs, bending fees, and delivery timeline
                upfront.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Truck className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">3. We Manufacture & Ship</h3>
              <p className="text-gray-600">
                Your parts are precision bent and shipped within 3-5 days. Track your order every step of the way.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Differentiators */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Why Choose TubeBend?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're tube bending specialists, not a general manufacturing platform
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <CheckCircle className="w-12 h-12 text-green-600 mb-6" />
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Tube Bending Specialists</h3>
                <p className="text-gray-600">
                  Unlike Xometry or other platforms that do everything, we focus exclusively on tube bending. This means
                  better quality and faster turnaround.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <CheckCircle className="w-12 h-12 text-green-600 mb-6" />
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Transparent Pricing</h3>
                <p className="text-gray-600">
                  No black box pricing. See exactly what you're paying for with detailed breakdowns of material,
                  bending, and finishing costs.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <CheckCircle className="w-12 h-12 text-green-600 mb-6" />
                <h3 className="text-xl font-semibold text-gray-900 mb-4">No Minimum Orders</h3>
                <p className="text-gray-600">
                  From garage makers to Fortune 500 companies. Order one part or thousands - we treat every customer the
                  same.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Materials Section */}
      <section id="materials" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Materials We Work With</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">High-quality materials for every application</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: "Steel", desc: "Carbon steel tubing" },
              { name: "Aluminum", desc: "6061-T6 aluminum" },
              { name: "Stainless", desc: "304 & 316 stainless" },
              { name: "Copper", desc: "Pure copper tubing" },
            ].map((material) => (
              <Card key={material.name} className="text-center p-6 hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
                  <h3 className="font-semibold text-gray-900 mb-2">{material.name}</h3>
                  <p className="text-sm text-gray-600">{material.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">What Our Customers Say</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "Mike Chen",
                company: "Precision Fabrication",
                text: "TubeBend's transparent pricing saved us hours of back-and-forth quotes. Quality is consistently excellent.",
                rating: 5,
              },
              {
                name: "Sarah Johnson",
                company: "Custom Motorcycle Shop",
                text: "As a small shop, I love that there's no minimum order. Perfect for prototypes and small production runs.",
                rating: 5,
              },
              {
                name: "David Rodriguez",
                company: "Industrial Design Co.",
                text: "The 3D preview feature is game-changing. We can catch issues before manufacturing starts.",
                rating: 5,
              },
            ].map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6">"{testimonial.text}"</p>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.company}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-12">
            Upload your CAD file and get an instant quote in under 30 seconds
          </p>
          <Button 
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg"
            onClick={handleUploadClick}
          >
            Upload File & Get Quote
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold mb-4">TubeBend</div>
              <p className="text-gray-400">Professional tube bending from your CAD files.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Services</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Tube Bending</li>
                <li>Custom Fabrication</li>
                <li>Prototyping</li>
                <li>Production Runs</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Materials</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Steel</li>
                <li>Aluminum</li>
                <li>Stainless Steel</li>
                <li>Copper</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Contact Us</li>
                <li>Design Guidelines</li>
                <li>Material Specs</li>
                <li>Shipping Info</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 TubeBend. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
