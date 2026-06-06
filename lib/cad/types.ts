import type { BufferGeometry } from 'three'
import type { CADAnalysis, CADFileType, CADPreviewKind } from '@/lib/types/configuration'

export interface ParsedCADMesh {
  geometry: BufferGeometry
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  renderMode?: 'mesh' | 'lines'
}

export interface ParsedGeometry {
  meshes: ParsedCADMesh[]
  analysis: CADAnalysis
}

export interface CADArtifact {
  kind: 'source' | 'mesh' | 'vector' | 'raster' | 'document' | 'metadata'
  format: string
  url?: string
  bytes?: number
}

export interface CADParseResult extends ParsedGeometry {
  sourceFormat: CADFileType
  previewKind: CADPreviewKind
  confidence: number
  warnings: string[]
  artifacts: CADArtifact[]
}
