'use client'

import { useState, useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Clock, Zap } from 'lucide-react'

import { ManufacturingSpec } from '@/lib/types/configuration'
import { ConfigurationFormData } from '@/lib/schemas/configuration'

interface SpecificationStepProps {
  data: ManufacturingSpec
  onComplete: (data: ManufacturingSpec) => void
  form: UseFormReturn<ConfigurationFormData>
}

const FINISHING_OPTIONS = [
  { value: 'none', label: 'No Finishing', description: 'As-bent finish', price: 0 },
  { value: 'deburr', label: 'Deburring', description: 'Remove sharp edges', price: 2.50 },
  { value: 'polish', label: 'Polishing', description: 'Smooth surface finish', price: 8.00 },
  { value: 'paint', label: 'Paint', description: 'Standard paint coating', price: 12.00 },
  { value: 'powder-coat', label: 'Powder Coating', description: 'Durable powder coat finish', price: 15.00 }
]

export default function SpecificationStep({ data, onComplete, form }: SpecificationStepProps) {
  const [specs, setSpecs] = useState<ManufacturingSpec>(data)

  const selectedFinishing = FINISHING_OPTIONS.find(option => option.value === specs.finishing.type)

  useEffect(() => {
    onComplete(specs)
    form.setValue('specifications', specs)
  }, [specs, onComplete, form])

  const handleSpecChange = <K extends keyof ManufacturingSpec>(
    key: K,
    value: ManufacturingSpec[K]
  ) => {
    setSpecs(prev => ({ ...prev, [key]: value }))
  }

  const handleToleranceChange = (
    field: keyof ManufacturingSpec['tolerances'],
    value: number
  ) => {
    setSpecs(prev => ({
      ...prev,
      tolerances: { ...prev.tolerances, [field]: value }
    }))
  }

  const handleFinishingChange = (field: keyof ManufacturingSpec['finishing'], value: any) => {
    setSpecs(prev => ({
      ...prev,
      finishing: { ...prev.finishing, [field]: value }
    }))
  }

  return (
    <div className="space-y-8">
      
      {/* Quantity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Quantity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="specifications.quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Parts</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter quantity"
                    min="1"
                    max="10000"
                    value={specs.quantity || ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1
                      handleSpecChange('quantity', value)
                      field.onChange(value)
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Quantity affects unit pricing and lead time
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Quantity Pricing Tiers */}
          <div className="bg-gray-50 rounded-lg p-4">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Quantity Discounts</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="text-center">
                <div className="font-semibold">1-10</div>
                <div className="text-gray-600">Standard pricing</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">11-50</div>
                <div className="text-gray-600">5% discount</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">51-100</div>
                <div className="text-gray-600">10% discount</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">100+</div>
                <div className="text-gray-600">15% discount</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tolerances */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Manufacturing Tolerances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Bend Angle Tolerance */}
            <FormField
              control={form.control}
              name="specifications.tolerances.bendAngle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bend Angle Tolerance (±degrees)</FormLabel>
                  <FormControl>
                    <Select
                      value={specs.tolerances.bendAngle.toString()}
                      onValueChange={(value) => {
                        const numValue = parseFloat(value)
                        handleToleranceChange('bendAngle', numValue)
                        field.onChange(numValue)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">±0.5° (Tight)</SelectItem>
                        <SelectItem value="1">±1° (Standard)</SelectItem>
                        <SelectItem value="2">±2° (Loose)</SelectItem>
                        <SelectItem value="3">±3° (Very Loose)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Centerline Radius Tolerance */}
            <FormField
              control={form.control}
              name="specifications.tolerances.centerlineRadius"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Centerline Radius (±inches)</FormLabel>
                  <FormControl>
                    <Select
                      value={specs.tolerances.centerlineRadius.toString()}
                      onValueChange={(value) => {
                        const numValue = parseFloat(value)
                        handleToleranceChange('centerlineRadius', numValue)
                        field.onChange(numValue)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.062">±0.062" (Tight)</SelectItem>
                        <SelectItem value="0.125">±0.125" (Standard)</SelectItem>
                        <SelectItem value="0.250">±0.250" (Loose)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Length Tolerance */}
            <FormField
              control={form.control}
              name="specifications.tolerances.length"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Length Tolerance (±inches)</FormLabel>
                  <FormControl>
                    <Select
                      value={specs.tolerances.length.toString()}
                      onValueChange={(value) => {
                        const numValue = parseFloat(value)
                        handleToleranceChange('length', numValue)
                        field.onChange(numValue)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.010">±0.010" (Tight)</SelectItem>
                        <SelectItem value="0.020">±0.020" (Standard)</SelectItem>
                        <SelectItem value="0.050">±0.050" (Loose)</SelectItem>
                        <SelectItem value="0.125">±0.125" (Very Loose)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">Tolerance Information</p>
                <p className="text-blue-700">
                  Tighter tolerances require additional setup time and may increase cost. 
                  Standard tolerances are suitable for most applications.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finishing Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Surface Finishing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <FormField
            control={form.control}
            name="specifications.finishing.type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Finishing Type</FormLabel>
                <FormControl>
                  <div className="grid md:grid-cols-2 gap-4">
                    {FINISHING_OPTIONS.map((option) => (
                      <Card
                        key={option.value}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          specs.finishing.type === option.value
                            ? 'ring-2 ring-blue-600 border-blue-600'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          handleFinishingChange('type', option.value)
                          field.onChange(option.value)
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900">{option.label}</h4>
                            <Badge variant="secondary">
                              {option.price === 0 ? 'Free' : `+$${option.price.toFixed(2)}`}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{option.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Selected Finishing Details */}
          {selectedFinishing && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900">{selectedFinishing.label}</h4>
                    <p className="text-sm text-gray-600">{selectedFinishing.description}</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {selectedFinishing.price === 0 ? 'Included' : `+$${selectedFinishing.price.toFixed(2)}`}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Finishing Notes */}
          <FormField
            control={form.control}
            name="specifications.finishing.notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Special Instructions (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any special finishing requirements or notes..."
                    value={specs.finishing.notes || ''}
                    onChange={(e) => {
                      handleFinishingChange('notes', e.target.value)
                      field.onChange(e.target.value)
                    }}
                    maxLength={500}
                  />
                </FormControl>
                <FormDescription>
                  {(specs.finishing.notes || '').length}/500 characters
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Rush Order */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Delivery Options</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="specifications.rushOrder"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base flex items-center">
                    <Zap className="w-4 h-4 mr-2 text-yellow-600" />
                    Rush Order
                  </FormLabel>
                  <FormDescription>
                    1-2 day turnaround (+25% rush fee)
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={specs.rushOrder}
                    onCheckedChange={(checked) => {
                      handleSpecChange('rushOrder', checked)
                      field.onChange(checked)
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <Separator className="my-4" />

          {/* Lead Time Display */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              Estimated Lead Time:
            </div>
            <Badge variant={specs.rushOrder ? 'destructive' : 'secondary'}>
              {specs.rushOrder ? '1-2 days' : 
                specs.quantity <= 10 ? '3-5 days' :
                specs.quantity <= 100 ? '5-7 days' : '1-2 weeks'
              }
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}