declare module 'dxf' {
  export interface DxfPolyline {
    rgb?: [number, number, number]
    layer?: unknown
    vertices: Array<[number, number, number?]>
  }

  export interface DxfPolylinesResult {
    bbox: unknown
    polylines: DxfPolyline[]
  }

  export class Helper {
    constructor(contents: string)
    parse(): unknown
    readonly parsed: unknown
    denormalise(): unknown
    readonly denormalised: unknown
    toPolylines(): DxfPolylinesResult
    toSVG(): string
  }

  export const colors: Record<number, [number, number, number]>
  export function denormalise(parsed: unknown): unknown
  export function groupEntitiesByLayer(entities: unknown): Record<string, unknown[]>
}
