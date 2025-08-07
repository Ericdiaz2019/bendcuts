'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Download, Mail, Clock } from 'lucide-react'
import { QuoteBreakdown, formatCurrency } from '@/lib/utils/quoteCalculator'

interface QuoteDisplayProps {
  quote: QuoteBreakdown
  materialName: string
  gauge: string
  quantity: number
  fileInfo: {
    fileName: string
    length: number
    bends: number
    cuts: number
    units?: string
  }
  onStartNewQuote: () => void
}

// Helper function to format length with units
function formatLength(length: number, units?: string): string {
  const formattedLength = length.toFixed(2)
  
  switch (units?.toLowerCase()) {
    case 'millimeter':
    case 'mm':
      return `${formattedLength} mm`
    case 'centimeter':
    case 'cm':
      return `${formattedLength} cm`
    case 'meter':
    case 'm':
      return `${formattedLength} m`
    case 'inch':
    case 'inches':
    case 'in':
      return `${formattedLength}"`
    case 'foot':
    case 'feet':
    case 'ft':
      return `${formattedLength}'`
    default:
      // If units are unknown, make a reasonable guess based on magnitude
      if (length < 50) {
        return `${formattedLength}"` // Likely inches
      } else if (length < 500) {
        return `${formattedLength} mm` // Likely millimeters
      } else {
        return `${formattedLength} mm` // Default to mm for larger values
      }
  }
}

export default function QuoteDisplay({
  quote,
  materialName,
  gauge,
  quantity,
  fileInfo,
  onStartNewQuote
}: QuoteDisplayProps) {
  const handleDownloadQuote = () => {
    console.log('📄 Downloading quote PDF')
    // TODO: Implement PDF generation
  }

  const handleRequestQuote = () => {
    console.log('📧 Requesting formal quote')
    // TODO: Implement quote request
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Quote</h1>
        <p className="text-gray-600">Instant pricing for your tube bending project</p>
      </div>

      {/* Project Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Project Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Part Specifications</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">File:</span>
                  <span className="font-medium">{fileInfo.fileName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Length:</span>
                  <span className="font-medium">{formatLength(fileInfo.length, fileInfo.units)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bends:</span>
                  <span className="font-medium">{fileInfo.bends}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cuts:</span>
                  <span className="font-medium">{fileInfo.cuts}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Material & Quantity</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Material:</span>
                  <span className="font-medium">{materialName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gauge:</span>
                  <span className="font-medium">{gauge}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium">{quantity} parts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Weight per part:</span>
                  <span className="font-medium">{quote.details.materialWeight.toFixed(2)} lbs</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Breakdown */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="text-xl text-center text-blue-900">Pricing Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            
            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <div>
                  <span className="font-medium">Material Cost</span>
                  <p className="text-xs text-gray-500">
                    {quote.details.materialWeight.toFixed(2)} lbs × {quantity} parts
                  </p>
                </div>
                <span className="font-semibold">{formatCurrency(quote.materialCost)}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <div>
                  <span className="font-medium">Bending Operations</span>
                  <p className="text-xs text-gray-500">
                    {fileInfo.bends} bends × {quantity} parts
                  </p>
                </div>
                <span className="font-semibold">{formatCurrency(quote.bendingCost)}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <div>
                  <span className="font-medium">Cutting Operations</span>
                  <p className="text-xs text-gray-500">
                    {fileInfo.cuts} cuts × {quantity} parts
                  </p>
                </div>
                <span className="font-semibold">{formatCurrency(quote.cuttingCost)}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <div>
                  <span className="font-medium">Labor</span>
                  <p className="text-xs text-gray-500">
                    {quote.details.laborHours.toFixed(1)} hours @ ${quote.details.laborRate}/hr
                  </p>
                </div>
                <span className="font-semibold">{formatCurrency(quote.laborCost)}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <div>
                  <span className="font-medium">Setup & Tooling</span>
                  <p className="text-xs text-gray-500">One-time setup cost</p>
                </div>
                <span className="font-semibold">{formatCurrency(quote.setupCost)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center py-2">
              <span className="font-medium">Subtotal</span>
              <span className="font-semibold">{formatCurrency(quote.subtotal)}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Tax (8.875%)</span>
              <span className="font-semibold">{formatCurrency(quote.tax)}</span>
            </div>

            <Separator />

            <div className="flex justify-between items-center py-3 text-lg">
              <span className="font-bold">Total</span>
              <span className="font-bold text-blue-600">{formatCurrency(quote.total)}</span>
            </div>

            {/* Price per part */}
            <div className="text-center bg-blue-50 rounded-lg p-4">
              <div className="text-lg font-bold text-blue-900">
                {formatCurrency(quote.pricePerPart)} per part
              </div>
              {quantity > 1 && (
                <div className="text-sm text-blue-700 mt-1">
                  Total for {quantity} parts: {formatCurrency(quote.total)}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead Time & Guarantees */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">Lead Time</h3>
            </div>
            <p className="text-2xl font-bold text-blue-600 mb-2">3-5 Business Days</p>
            <p className="text-sm text-gray-600">
              Standard production time for {quantity} part{quantity !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-900">Quality Guarantee</h3>
            </div>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Precision tube bending to your specs</li>
              <li>• Full dimensional inspection</li>
              <li>• 30-day quality guarantee</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          type="button"
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={handleRequestQuote}
        >
          <Mail className="w-4 h-4 mr-2" />
          Request Formal Quote
        </Button>
        
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={handleDownloadQuote}
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
        
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={onStartNewQuote}
        >
          Start New Quote
        </Button>
      </div>

      {/* Note */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <p className="text-sm text-gray-600 text-center">
            <strong>Note:</strong> This is an instant estimate based on your file analysis. 
            Final pricing may vary based on detailed engineering review. 
            Request a formal quote for guaranteed pricing.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}