import { z } from 'zod'

export const fileUploadSchema = z.object({
  file: z.instanceof(File).nullable(),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().positive('File size must be positive').max(50 * 1024 * 1024, 'File size must be under 50MB'),
  fileType: z.enum(['step', 'iges', 'dxf', 'stp', 'igs'], {
    errorMap: () => ({ message: 'File must be STEP, IGES, or DXF format' })
  }),
  isValid: z.boolean(),
  preview: z.string().optional()
})

export const tubeSpecificationSchema = z.object({
  diameter: z.string().min(1, 'Diameter is required'),
  wallThickness: z.string().min(1, 'Wall thickness is required'),
  length: z.number().positive('Length must be positive').max(240, 'Maximum length is 20 feet')
})

export const materialSelectionSchema = z.object({
  materialId: z.string().min(1, 'Material selection is required'),
  tubeSpec: tubeSpecificationSchema
})

export const toleranceSchema = z.object({
  bendAngle: z.number().min(0.1).max(5, 'Bend angle tolerance must be between 0.1° and 5°').default(1),
  centerlineRadius: z.number().min(0.001).max(0.5, 'Centerline radius tolerance must be between 0.001" and 0.5"').default(0.125),
  length: z.number().min(0.005).max(0.25, 'Length tolerance must be between 0.005" and 0.25"').default(0.02)
})

export const finishingSchema = z.object({
  type: z.enum(['none', 'deburr', 'polish', 'paint', 'powder-coat']).default('none'),
  notes: z.string().max(500, 'Notes must be under 500 characters').optional()
})

export const manufacturingSpecSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(10000, 'Maximum quantity is 10,000'),
  tolerances: toleranceSchema,
  finishing: finishingSchema,
  rushOrder: z.boolean().default(false)
})

export const configurationSchema = z.object({
  fileUpload: fileUploadSchema,
  materialSelection: materialSelectionSchema,
  specifications: manufacturingSpecSchema
})

export type FileUploadFormData = z.infer<typeof fileUploadSchema>
export type MaterialSelectionFormData = z.infer<typeof materialSelectionSchema>
export type ManufacturingSpecFormData = z.infer<typeof manufacturingSpecSchema>
export type ConfigurationFormData = z.infer<typeof configurationSchema>