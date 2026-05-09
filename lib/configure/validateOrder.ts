import { z } from 'zod'

import { calculateQuote, type PricingConfig, type QuoteBreakdown } from '@/lib/utils/quoteCalculator'

import { findMaterial, isValidGauge } from './materials'

const SERVICE_VALUES = [
  'tube-bending',
  'tube-laser',
  'sheet-laser',
  'straight-cut',
  '3d-printing',
] as const

const fileSchema = z.object({
  name: z.string().min(1).max(255),
  lengthMm: z.number().positive().max(50_000),
  lengthInches: z.number().positive().max(2_000),
  originalUnits: z.string().max(20).optional(),
  bends: z.number().int().min(0).max(100),
  cuts: z.number().int().min(0).max(100),
  laserFeatures: z.number().int().min(0).max(500).optional(),
  storagePath: z.string().min(1).max(512).optional(),
  fileSize: z.number().int().min(0).max(100 * 1024 * 1024).optional(),
})

const quoteSchema = z.object({
  materialCost: z.number().min(0),
  bendingCost: z.number().min(0),
  cuttingCost: z.number().min(0),
  setupCost: z.number().min(0),
  laborCost: z.number().min(0),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().positive(),
  pricePerPart: z.number().positive(),
  service: z.enum(SERVICE_VALUES).optional(),
  appliedOps: z
    .object({
      bending: z.boolean(),
      cutting: z.boolean(),
      laserFeatures: z.number().int().min(0),
      printing: z.boolean(),
    })
    .optional(),
  details: z.object({
    materialWeight: z.number().min(0),
    bendingRate: z.number().min(0),
    cuttingRate: z.number().min(0),
    setupRate: z.number().min(0),
    laborHours: z.number().min(0),
    laborRate: z.number().min(0),
  }),
})

export const orderPayloadSchema = z.object({
  materialId: z.string().min(1).max(64),
  materialName: z.string().min(1).max(120),
  gauge: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(10_000),
  service: z.enum(SERVICE_VALUES).optional(),
  quote: quoteSchema,
  file: fileSchema,
  createdAt: z.string(),
  idempotencyKey: z.string().uuid().optional(),
})

export type ValidatedOrderPayload = z.infer<typeof orderPayloadSchema>

const DRIFT_TOLERANCE = 0.05

export type ValidationResult =
  | { ok: true; payload: ValidatedOrderPayload; canonicalQuote: QuoteBreakdown }
  | { ok: false; error: string }

export function validateAndRecompute(input: unknown, config?: PricingConfig): ValidationResult {
  const parsed = orderPayloadSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.errors[0]
    return { ok: false, error: `Invalid order data: ${issue.path.join('.')} — ${issue.message}` }
  }
  const payload = parsed.data

  const material = findMaterial(payload.materialId)
  if (!material) {
    return { ok: false, error: `Unknown material: ${payload.materialId}` }
  }

  if (!isValidGauge(payload.materialId, payload.gauge)) {
    return { ok: false, error: `Unsupported gauge "${payload.gauge}" for ${material.name}.` }
  }

  if (payload.materialName !== material.name) {
    return { ok: false, error: 'Material name does not match catalog. Refresh and try again.' }
  }

  const canonicalQuote = calculateQuote(
    {
      material: { id: material.id, name: material.name, pricePerLb: material.pricePerLb },
      quantity: payload.quantity,
      gauge: payload.gauge,
      length: payload.file.lengthInches,
      bends: payload.file.bends,
      cuts: payload.file.cuts,
      service: payload.service ?? payload.quote.service ?? 'tube-bending',
      laserFeatures: payload.file.laserFeatures ?? 0,
    },
    config,
  )

  const drift = Math.abs(canonicalQuote.total - payload.quote.total)
  if (drift > DRIFT_TOLERANCE) {
    return {
      ok: false,
      error: 'Quote total no longer matches our pricing. Please refresh and try again.',
    }
  }

  return { ok: true, payload, canonicalQuote }
}
