'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle } from 'lucide-react'

// Helper: format analyzed native length and show both native and inches
function formatLength(lengthMm: number, lengthInches: number, originalUnits?: string): string {
  const mm = Number(lengthMm) || 0
  const inches = Number(lengthInches) || 0
  const unit = (originalUnits || '').toLowerCase()

  const mmText = `${mm.toFixed(2)} mm`
  const inchText = `${inches.toFixed(2)}"`

  switch (unit) {
    case 'inch':
    case 'inches':
    case 'in':
      return `${inchText} (${mmText})`
    case 'foot':
    case 'feet':
    case 'ft':
      return `${(inches / 12).toFixed(2)} ft (${inchText}, ${mmText})`
    case 'meter':
    case 'metre':
    case 'm':
      return `${(mm / 1000).toFixed(3)} m (${inchText}, ${mmText})`
    case 'centimeter':
    case 'centimetre':
    case 'cm':
      return `${(mm / 10).toFixed(2)} cm (${inchText}, ${mmText})`
    default:
      return `${mmText} (${inchText})`
  }
}

interface Material {
  id: string
  name: string
  description: string
  pricePerLb: number
  color: string
  gauges: string[]
}

interface MaterialSelection {
  material: Material
  quantity: number
  gauge: string
}

interface MaterialSelectionModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (selection: MaterialSelection) => void
  fileInfo?: {
    lengthMm: number
    lengthInches: number
    originalUnits?: string
    bends: number
    cuts: number
  }
}

const MATERIALS: Material[] = [
  {
    id: 'aluminum',
    name: 'Aluminum',
    description: 'Lightweight, corrosion-resistant, excellent for marine and aerospace applications',
    pricePerLb: 2.50,
    color: '#C0C0C0',
    gauges: ['16 AWG (0.051")', '14 AWG (0.064")', '12 AWG (0.081")', '10 AWG (0.102")', '8 AWG (0.128")']
  },
  {
    id: 'stainless-steel',
    name: 'Stainless Steel',
    description: 'High strength, corrosion-resistant, ideal for food service and chemical applications',
    pricePerLb: 4.75,
    color: '#E8E8E8',
    gauges: ['16 AWG (0.063")', '14 AWG (0.078")', '12 AWG (0.109")', '10 AWG (0.134")', '8 AWG (0.172")']
  },
  {
    id: 'carbon-steel',
    name: 'Carbon Steel',
    description: 'Strong, durable, cost-effective for structural and general purpose applications',
    pricePerLb: 1.85,
    color: '#696969',
    gauges: ['16 AWG (0.065")', '14 AWG (0.083")', '12 AWG (0.109")', '10 AWG (0.134")', '8 AWG (0.165")']
  }
]

export default function MaterialSelectionModal({
  open,
  onClose,
  onConfirm,
  fileInfo
}: MaterialSelectionModalProps) {
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedGauge, setSelectedGauge] = useState('')

  const handleMaterialSelect = (material: Material) => {
    setSelectedMaterial(material)
    setSelectedGauge(material.gauges[1]) // Default to middle gauge
  }

  const handleConfirm = () => {
    if (selectedMaterial && selectedGauge) {
      const selection: MaterialSelection = {
        material: selectedMaterial,
        quantity,
        gauge: selectedGauge
      }
      
      console.log('📋 Material Selection:', {
        material: selectedMaterial.name,
        quantity,
        gauge: selectedGauge,
        fileInfo
      })
      
      onConfirm(selection)
      onClose()
    }
  }

  const canConfirm = selectedMaterial && selectedGauge && quantity > 0

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Select Material & Specifications</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Information */}
          {fileInfo && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Part Analysis</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Length:</span>
                    <span className="ml-2 font-medium">
                      {formatLength(fileInfo.lengthMm, fileInfo.lengthInches, fileInfo.originalUnits)}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Bends:</span>
                    <span className="ml-2 font-medium">{fileInfo.bends}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Cuts:</span>
                    <span className="ml-2 font-medium">{fileInfo.cuts}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Material Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Choose Material</h3>
            <div className="grid gap-4">
              {MATERIALS.map((material) => (
                <Card
                  key={material.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedMaterial?.id === material.id
                      ? 'ring-2 ring-blue-600 border-blue-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleMaterialSelect(material)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div 
                            className="w-6 h-6 rounded border border-gray-300"
                            style={{ backgroundColor: material.color }}
                          />
                          <h4 className="font-semibold text-gray-900">{material.name}</h4>
                          {selectedMaterial?.id === material.id && (
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{material.description}</p>
                        <div className="text-sm font-medium text-green-600">
                          ${material.pricePerLb}/lb
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Specifications */}
          {selectedMaterial && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quantity */}
              <div>
                <Label htmlFor="quantity" className="text-base font-medium">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="10000"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">Number of parts needed</p>
              </div>

              {/* Gauge/Thickness */}
              <div>
                <Label className="text-base font-medium">Gauge (Thickness)</Label>
                <Select value={selectedGauge} onValueChange={setSelectedGauge}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select gauge" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedMaterial.gauges.map((gauge) => (
                      <SelectItem key={gauge} value={gauge}>
                        {gauge}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">Material thickness specification</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continue to Quote
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
