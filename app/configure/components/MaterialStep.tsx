'use client'

import { useState, useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'

import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'

import { MaterialSelection } from '@/lib/types/configuration'
import { ConfigurationFormData } from '@/lib/schemas/configuration'
import { MATERIALS, TUBE_DIAMETERS, WALL_THICKNESS_OPTIONS } from '@/lib/utils/pricing'

interface MaterialStepProps {
  data: MaterialSelection
  onComplete: (data: MaterialSelection) => void
  form: UseFormReturn<ConfigurationFormData>
}

export default function MaterialStep({ data, onComplete, form }: MaterialStepProps) {
  const [selection, setSelection] = useState<MaterialSelection>(data)

  const selectedMaterial = MATERIALS.find(m => m.id === selection.materialId)

  useEffect(() => {
    onComplete(selection)
    form.setValue('materialSelection', selection)
  }, [selection, onComplete, form])

  const handleMaterialChange = (materialId: string) => {
    setSelection(prev => ({ ...prev, materialId }))
  }

  const handleTubeSpecChange = (field: keyof typeof selection.tubeSpec, value: string | number) => {
    setSelection(prev => ({
      ...prev,
      tubeSpec: { ...prev.tubeSpec, [field]: value }
    }))
  }

  return (
    <div className="space-y-8">
      {/* Material Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Material</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MATERIALS.map((material) => (
            <Card
              key={material.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selection.materialId === material.id
                  ? 'ring-2 ring-blue-600 border-blue-600'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleMaterialChange(material.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{material.name}</h4>
                  {material.available ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Available
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      Out of Stock
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{material.description}</p>
                <div className="text-lg font-semibold text-blue-600">
                  ${material.basePrice.toFixed(2)}/ft
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Selected Material Details */}
      {selectedMaterial && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">{selectedMaterial.name}</h4>
                <p className="text-sm text-gray-600">{selectedMaterial.description}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-blue-600">
                  ${selectedMaterial.basePrice.toFixed(2)}/ft
                </div>
                <div className="text-sm text-gray-500">Base price</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tube Specifications */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tube Specifications</h3>
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Diameter */}
          <FormField
            control={form.control}
            name="materialSelection.tubeSpec.diameter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Outside Diameter</FormLabel>
                <FormControl>
                  <Select
                    value={selection.tubeSpec.diameter}
                    onValueChange={(value) => {
                      handleTubeSpecChange('diameter', value)
                      field.onChange(value)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select diameter" />
                    </SelectTrigger>
                    <SelectContent>
                      {TUBE_DIAMETERS.map((diameter) => (
                        <SelectItem key={diameter} value={diameter}>
                          {diameter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Wall Thickness */}
          <FormField
            control={form.control}
            name="materialSelection.tubeSpec.wallThickness"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wall Thickness</FormLabel>
                <FormControl>
                  <Select
                    value={selection.tubeSpec.wallThickness}
                    onValueChange={(value) => {
                      handleTubeSpecChange('wallThickness', value)
                      field.onChange(value)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select thickness" />
                    </SelectTrigger>
                    <SelectContent>
                      {WALL_THICKNESS_OPTIONS.map((thickness) => (
                        <SelectItem key={thickness} value={thickness}>
                          {thickness}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Length */}
          <FormField
            control={form.control}
            name="materialSelection.tubeSpec.length"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Length (inches)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter length"
                    min="1"
                    max="240"
                    step="0.25"
                    value={selection.tubeSpec.length || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0
                      handleTubeSpecChange('length', value)
                      field.onChange(value)
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Material Properties */}
      {selectedMaterial && selection.tubeSpec.diameter && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Material Properties</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-gray-600">Material Type:</Label>
                <p className="font-medium">{selectedMaterial.name}</p>
              </div>
              <div>
                <Label className="text-gray-600">Base Price:</Label>
                <p className="font-medium">${selectedMaterial.basePrice.toFixed(2)} per foot</p>
              </div>
              {selection.tubeSpec.diameter && (
                <div>
                  <Label className="text-gray-600">Outer Diameter:</Label>
                  <p className="font-medium">{selection.tubeSpec.diameter}</p>
                </div>
              )}
              {selection.tubeSpec.wallThickness && (
                <div>
                  <Label className="text-gray-600">Wall Thickness:</Label>
                  <p className="font-medium">{selection.tubeSpec.wallThickness}</p>
                </div>
              )}
              {selection.tubeSpec.length > 0 && (
                <div>
                  <Label className="text-gray-600">Total Length:</Label>
                  <p className="font-medium">{selection.tubeSpec.length}" ({(selection.tubeSpec.length / 12).toFixed(2)} ft)</p>
                </div>
              )}
              {selection.tubeSpec.length > 0 && (
                <div>
                  <Label className="text-gray-600">Estimated Material Cost:</Label>
                  <p className="font-medium text-blue-600">
                    ${(selectedMaterial.basePrice * (selection.tubeSpec.length / 12)).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Design Guidelines */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Tube Bending Guidelines</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Minimum bend radius is typically 3x the tube diameter</li>
            <li>• Wall thickness affects bendability - thinner walls may collapse</li>
            <li>• Maximum recommended length is 20 feet (240 inches)</li>
            <li>• Material choice affects bend quality and tooling requirements</li>
            <li>• Stainless steel requires higher forming forces than carbon steel</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}