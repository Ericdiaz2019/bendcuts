declare module 'three-dxf-loader' {
  export interface DXFEntity {
    type: string
    start?: { x: number; y: number; z?: number }
    end?: { x: number; y: number; z?: number }
    vertices?: Array<{ x: number; y: number; z?: number }>
    closed?: boolean
    [key: string]: any
  }

  export interface DXFData {
    entities: DXFEntity[]
    [key: string]: any
  }

  export class DXFLoader {
    constructor()
    parse(data: string): DXFData | null
    load(url: string, onLoad: (data: DXFData) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: ErrorEvent) => void): void
  }
}