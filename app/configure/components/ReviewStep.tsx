'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock, FileText, Settings, Package, Palette, Download, Edit } from 'lucide-react'

import { FileUploadData, MaterialSelection, ManufacturingSpec, PricingBreakdown } from '@/lib/types/configuration'
import { MATERIALS } from '@/lib/utils/pricing'

interface ReviewStepProps {
  fileUpload: FileUploadData
  materialSelection: MaterialSelection
  specifications: ManufacturingSpec
  pricing: PricingBreakdown
}

const FINISHING_LABELS = {
  'none': 'No Finishing',
  'deburr': 'Deburring',
  'polish': 'Polishing',
  'paint': 'Paint',
  'powder-coat': 'Powder Coating'
}

export default function ReviewStep({
  fileUpload,
  materialSelection,
  specifications,
  pricing
}: ReviewStepProps) {
  
  const selectedMaterial = MATERIALS.find(m => m.id === materialSelection.materialId)
  const finishingLabel = FINISHING_LABELS[specifications.finishing.type as keyof typeof FINISHING_LABELS]

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`

  return (
    <div className="space-y-8">
      
      {/* Configuration Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* File Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              CAD File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-gray-600">File Name:</Label>
              <span className="font-medium text-sm">{fileUpload.fileName}</span>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-600">File Type:</Label>
              <Badge variant="secondary">{fileUpload.fileType.toUpperCase()}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-600">File Size:</Label>
              <span className="text-sm">{(fileUpload.fileSize / 1024 / 1024).toFixed(1)} MB</span>
            </div>
            <div className="flex items-center text-green-600 text-sm">
              <CheckCircle className="w-4 h-4 mr-2" />
              File validated successfully
            </div>
          </CardContent>
        </Card>

        {/* Material Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Settings className="w-5 h-5 mr-2 text-blue-600" />
              Material & Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-gray-600">Material:</Label>
              <span className="font-medium text-sm">{selectedMaterial?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-600">Diameter:</Label>
              <span className="text-sm">{materialSelection.tubeSpec.diameter}</span>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-600">Wall Thickness:</Label>
              <span className="text-sm">{materialSelection.tubeSpec.wallThickness}</span>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-600">Length:</Label>
              <span className="text-sm">{materialSelection.tubeSpec.length}"</span>
            </div>
          </CardContent>
        </Card>

        {/* Manufacturing Specifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Package className="w-5 h-5 mr-2 text-blue-600" />
              Manufacturing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-gray-600">Quantity:</Label>
              <span className="font-medium">{specifications.quantity} parts</span>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-600">Bend Angle Tolerance:</Label>
              <span className="text-sm">±{specifications.tolerances.bendAngle}°</span>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-600">Centerline Tolerance:</Label>
              <span className="text-sm">±{specifications.tolerances.centerlineRadius}"</span>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-600">Length Tolerance:</Label>
              <span className="text-sm">±{specifications.tolerances.length}"</span>
            </div>
            {specifications.rushOrder && (
              <Badge variant="destructive" className="w-full justify-center">
                Rush Order - 1-2 Days
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Finishing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Palette className="w-5 h-5 mr-2 text-blue-600" />
              Finishing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-gray-600">Finishing Type:</Label>
              <span className="font-medium">{finishingLabel}</span>
            </div>
            {specifications.finishing.notes && (
              <div>
                <Label className="text-gray-600 block mb-1">Special Instructions:</Label>
                <p className="text-sm bg-gray-50 rounded p-2">{specifications.finishing.notes}</p>
              </div>
            )}
            <div className="flex items-center text-gray-500 text-sm">
              <Clock className="w-4 h-4 mr-2" />
              Lead Time: {pricing.leadTime}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Breakdown */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="text-xl text-center">Quote Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            
            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <div>
                  <span className="text-gray-600">Material Cost</span>
                  <p className="text-xs text-gray-500">
                    {selectedMaterial?.name} • {materialSelection.tubeSpec.length}" × {specifications.quantity} parts
                  </p>
                </div>
                <span className="font-semibold">{formatCurrency(pricing.materialCost)}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <div>
                  <span className="text-gray-600">Bending Operations</span>
                  <p className="text-xs text-gray-500">
                    Setup + bending × {specifications.quantity} parts
                  </p>
                </div>
                <span className="font-semibold">{formatCurrency(pricing.bendingCost)}</span>
              </div>

              {pricing.finishingCost > 0 && (
                <div className="flex justify-between items-center py-2">
                  <div>
                    <span className="text-gray-600">Finishing</span>
                    <p className="text-xs text-gray-500">{finishingLabel}</p>
                  </div>
                  <span className="font-semibold">{formatCurrency(pricing.finishingCost)}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2">
                <div>
                  <span className="text-gray-600">Setup & Tooling</span>
                  <p className="text-xs text-gray-500">One-time setup cost</p>
                </div>
                <span className="font-semibold">{formatCurrency(pricing.setupCost)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">{formatCurrency(pricing.subtotal)}</span>
            </div>

            {pricing.rushFee > 0 && (
              <div className="flex justify-between items-center py-2 text-amber-700">
                <span>Rush Order Fee (25%)</span>
                <span className="font-semibold">{formatCurrency(pricing.rushFee)}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Tax</span>
              <span className="font-semibold">{formatCurrency(pricing.tax)}</span>
            </div>

            <Separator />

            <div className="flex justify-between items-center py-3 text-lg">
              <span className="font-bold">Total</span>
              <span className="font-bold text-blue-600">{formatCurrency(pricing.total)}</span>
            </div>

            {/* Unit Price */}
            <div className="text-center text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <strong>{formatCurrency(pricing.total / specifications.quantity)} per part</strong>
              {specifications.quantity > 1 && (
                <span className="block mt-1">
                  Total for {specifications.quantity} parts
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quality Guarantee */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-start">
            <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-green-900 mb-2">Quality Guarantee</h4>
              <p className="text-green-800 text-sm mb-3">
                All parts are manufactured to your specified tolerances with full inspection reports. 
                We guarantee 100% conformance to your requirements.
              </p>
              <ul className="text-green-700 text-sm space-y-1">
                <li>• Full dimensional inspection</li>
                <li>• Material certifications included</li>
                <li>• 30-day quality guarantee</li>
                <li>• Real-time production updates</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Button variant="outline" className="flex-1 flex items-center justify-center">
          <Download className="w-4 h-4 mr-2" />
          Download Quote PDF
        </Button>
        <Button variant="outline" className="flex-1 flex items-center justify-center">
          <Edit className="w-4 h-4 mr-2" />
          Modify Configuration
        </Button>
      </div>
    </div>
  )
}