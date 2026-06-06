import type { CADFileType, CADPreviewKind } from '@/lib/types/configuration'

export type CADCapabilityTier = 'instant-3d' | 'limited-2d' | 'manual-review'

export interface CADFormatCapability {
  extension: CADFileType
  label: string
  tier: CADCapabilityTier
  previewKind: CADPreviewKind
  badge: string
  description: string
  instantQuoteEligible: boolean
}

export const CAD_FORMAT_CAPABILITIES: Record<CADFileType, CADFormatCapability> = {
  step: {
    extension: 'step',
    label: 'STEP',
    tier: 'instant-3d',
    previewKind: 'mesh3d',
    badge: '3D preview + analysis',
    description: 'Best format for bent tubes, sheet brackets, and 3D geometry.',
    instantQuoteEligible: true,
  },
  stp: {
    extension: 'stp',
    label: 'STP',
    tier: 'instant-3d',
    previewKind: 'mesh3d',
    badge: '3D preview + analysis',
    description: 'Alias for STEP with the same 3D preview and analysis path.',
    instantQuoteEligible: true,
  },
  iges: {
    extension: 'iges',
    label: 'IGES',
    tier: 'instant-3d',
    previewKind: 'mesh3d',
    badge: '3D preview + analysis',
    description: '3D preview and geometry analysis for compatible IGES solids.',
    instantQuoteEligible: true,
  },
  igs: {
    extension: 'igs',
    label: 'IGS',
    tier: 'instant-3d',
    previewKind: 'mesh3d',
    badge: '3D preview + analysis',
    description: 'Alias for IGES with the same 3D preview and analysis path.',
    instantQuoteEligible: true,
  },
  dxf: {
    extension: 'dxf',
    label: 'DXF',
    tier: 'instant-3d',
    previewKind: 'mesh3d',
    badge: '3D preview + analysis',
    description: 'Flat profiles are extruded to give you a true 3D preview of the cut part.',
    instantQuoteEligible: true,
  },
  dwg: {
    extension: 'dwg',
    label: 'DWG',
    tier: 'instant-3d',
    previewKind: 'mesh3d',
    badge: '3D preview + analysis',
    description: 'Auto-converted to DXF on upload. Flat profiles render as extruded sheet metal.',
    instantQuoteEligible: true,
  },
  ai: {
    extension: 'ai',
    label: 'AI',
    tier: 'manual-review',
    previewKind: 'none',
    badge: 'PDF preview if compatible',
    description: 'PDF-compatible Illustrator files preview in-browser. Quote analysis still needs review.',
    instantQuoteEligible: false,
  },
  eps: {
    extension: 'eps',
    label: 'EPS',
    tier: 'manual-review',
    previewKind: 'none',
    badge: 'Engineering review',
    description: 'Accepted for review. Rendering needs server-side EPS/vector conversion.',
    instantQuoteEligible: false,
  },
}

export const ACCEPTED_CAD_EXTENSIONS = Object.keys(CAD_FORMAT_CAPABILITIES) as CADFileType[]

export function getCadFormatCapability(extension: string | undefined | null): CADFormatCapability | null {
  const normalized = extension?.toLowerCase()
  if (!normalized || !(normalized in CAD_FORMAT_CAPABILITIES)) {
    return null
  }
  return CAD_FORMAT_CAPABILITIES[normalized as CADFileType]
}

export function getCadFormatCapabilityForFileName(fileName: string): CADFormatCapability | null {
  return getCadFormatCapability(fileName.split('.').pop())
}
