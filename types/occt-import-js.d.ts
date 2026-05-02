declare module 'occt-import-js' {
  interface OcctImportOptions {
    locateFile?: (path: string) => string
  }

  interface OcctTriangulationParams {
    linearUnit?: 'millimeter' | 'centimeter' | 'meter' | 'inch' | 'foot'
    linearDeflectionType?: 'bounding_box_ratio' | 'absolute_value'
    linearDeflection?: number
    angularDeflection?: number
  }

  interface OcctImporter {
    ReadStepFile(content: Uint8Array, params: OcctTriangulationParams | null): any
    ReadIgesFile(content: Uint8Array, params: OcctTriangulationParams | null): any
    ReadBrepFile(content: Uint8Array, params: OcctTriangulationParams | null): any
  }

  export default function occtimportjs(options?: OcctImportOptions): Promise<OcctImporter>
}
