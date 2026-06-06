# CAD Format Support TODO

Last reviewed: 2026-05-23

## Current App Status

The configure flow already has a serious CAD foundation:

- `app/configure/components/FileUploadStep.tsx` accepts STEP, STP, IGES, IGS, DXF, EPS, AI, and DWG up to 50 MB.
- `app/configure/components/CADViewer/CADViewer.tsx` lazy-loads the Three.js viewer, parses files with a 30 second client-side timeout, renders meshes or line segments, and reports parse status back to the wizard.
- `lib/utils/cadFileParser.ts` has real STEP/STP/IGES support through `occt-import-js`, with triangulation, unit handling, bounding boxes, feature heuristics, file hashing, and STEP topology analysis for bends, sheet bends, and holes.
- DXF is parsed client-side through `three-dxf-loader`, but only common 2D entities are handled: `LINE`, `ARC`, `CIRCLE`, `POLYLINE`, and `LWPOLYLINE`.
- EPS, AI, and DWG are accepted but not rendered. They currently return empty geometry plus `requiresManualReview: true`.
- `npm run lint` and `npm run build` pass, with existing warnings unrelated to CAD support.

The important product gap: the UI copy implies broad CAD/vector support, but only STEP/STP/IGES are strongly renderable today. DXF is a limited 2D preview. DWG, AI, and EPS are upload-only manual-review formats.

## Format Reality Check

| Format | Current state | Target state | Best implementation path |
| --- | --- | --- | --- |
| `.step`, `.stp` | Strong client-side 3D render through OCCT WASM | Keep and harden | Keep `occt-import-js`, move heavy parsing to a Web Worker, add regression fixtures |
| `.dxf` | Basic 2D line render | Reliable 2D quote preview and optional 3D extrusion for sheet parts | Use a stronger DXF parser/extractor, normalize layers/blocks/splines, generate SVG/Three line geometry |
| `.dwg` | Accepted only, no preview | Render after conversion or via licensed SDK/cloud derivative | Server-side converter using ODA/Autodesk, then feed DXF/SVG/GLTF into existing viewer |
| `.ai` | Accepted only, no preview | Render PDF-compatible AI as 2D vector preview | Detect PDF-compatible AI, convert PDF page to SVG/PNG, fall back to manual review |
| `.eps` | Accepted only, no preview | Render 2D vector preview | Server-side Ghostscript/pstoedit pipeline to PDF/SVG/DXF, sandboxed |

## Architecture Decision

Do not try to support all six formats purely in the browser.

Recommended target architecture:

1. Keep browser-side STEP/STP rendering for fast previews, but move it into a dedicated Web Worker to protect the UI thread.
2. Add a server-side conversion pipeline for DWG, AI, and EPS.
3. Normalize every uploaded file into one of these internal preview artifacts:
   - `glb` or Three-compatible mesh JSON for 3D solids.
   - `svg` plus parsed vector geometry JSON for 2D drawings.
   - `dxf` as an intermediate when DWG/EPS conversion is cleaner than direct SVG.
4. Store the original source file, the preview artifact, parser metadata, warnings, and quote confidence.
5. Make quote eligibility explicit: `previewable`, `analyzable`, `instantQuoteEligible`, and `manualReviewRequired` should be separate fields.

## Recommended Tooling

Primary sources checked:

- `occt-import-js`: browser STEP/IGES/BREP import via OpenCascade WASM. Source: https://github.com/kovacsv/occt-import-js
- Open CASCADE documents STEP, IGES, STL, VRML, glTF, and related CAD exchange capabilities. Source: https://dev.opencascade.org/doc/overview/html/index.html
- Open Cascade CAD Assistant confirms practical support for STEP, IGES, glTF, OBJ, STL, DXF, SAT, and Parasolid in its product stack. Source: https://www.opencascade.com/products/cad-assistant/
- Open Design Alliance Drawings SDK supports DWG/DGN/DXF access, viewing, editing, and export to formats including SVG, Three.js, STL, raster, and PDF. Source: https://www.opendesign.com/products/drawings
- Autodesk Platform Services Model Derivative API supports cloud conversion/viewing workflows for 2D and 3D derivatives. Source: https://aps.autodesk.com/model-derivative-api-2d-3d-conversions
- Ghostscript can interpret PostScript/EPS/PDF for raster/vector conversion workflows. Source: https://ghostscript.readthedocs.io/en/gs10.02.1/Use.html
- pstoedit converts PostScript graphics into formats including DXF and SVG. Source: https://www.calvina.de/pstoedit/
- Poppler `pdftocairo` converts PDF to PNG/JPEG/TIFF/PDF/PS/EPS/SVG. Source: https://manpages.debian.org/testing/poppler-utils/pdftocairo.1.en.html
- Adobe documents modern AI files as PDF-compatible when saved with embedded PDF content. Source: https://www.adobe.com/creativecloud/file-types/image/vector/ai-file.html

## SOTA Implementation TODO

### Phase 0: Tighten Truth in the UI

- [x] Rename "supported formats" to distinguish instant preview from upload/manual review.
- [x] Add per-format badges in upload UI:
  - STEP/STP: `3D preview + analysis`
  - DXF: `2D preview + limited analysis`
  - DWG/AI/EPS: `conversion pending` or `engineering review`
- [x] Replace generic `isValid` with richer status fields in `FileUploadData` and `CADAnalysis`.
- [x] Prevent manual-review files from looking quote-ready unless the price is explicitly labeled indicative.

### Phase 1: Parser Contract Refactor

- [ ] Split `lib/utils/cadFileParser.ts` into format modules:
  - `lib/cad/formats/step.ts`
  - `lib/cad/formats/dxf.ts`
  - `lib/cad/formats/manualReview.ts`
  - `lib/cad/analysis/geometry.ts`
  - `lib/cad/analysis/features.ts`
- [x] Define a single `CADParseResult` contract with:
  - `sourceFormat`
  - `previewKind: 'mesh3d' | 'vector2d' | 'none'`
  - `geometry`
  - `analysis`
  - `confidence`
  - `warnings`
  - `artifacts`
- [x] Move file hashing to a shared upload utility so parsing does not need to re-read large files multiple times.
- [ ] Add parser fixtures under `tests/fixtures/cad/` once test tooling is introduced.

### Phase 2: STEP/STP Hardening

- [ ] Move `occt-import-js` parsing into a Web Worker.
- [ ] Add progress and cancellation support for large files.
- [ ] Keep original-unit parsing, but add fixture coverage for inch, millimeter, meter, and unitless STEP files.
- [ ] Add analysis confidence snapshots for known tube, flat sheet, sheet bracket, and invalid STEP fixtures.
- [ ] Cap or downsample mesh complexity before rendering to avoid WebGL stalls.

### Phase 3: DXF 2D Support

- [ ] Replace or supplement `three-dxf-loader` with a parser that exposes full entity metadata consistently.
- [ ] Support blocks/inserts, layers, splines, ellipses, text annotations, dimensions, and unit variables.
- [ ] Build an internal 2D vector model: paths, closed contours, holes, layers, bounding box, units.
- [ ] Render 2D DXF as lines/paths in Three.js or as SVG overlay.
- [ ] Detect closed contours and holes for sheet-laser quoting.
- [ ] Add warnings for unsupported entities rather than silently dropping them.

### Phase 4: DWG Conversion

- [ ] Decide between ODA SDK, Autodesk Platform Services, or a managed CAD conversion service.
- [ ] Implement server-side upload storage before conversion. Do not process proprietary files only in browser memory.
- [ ] Convert DWG to DXF/SVG for 2D drawings and GLB/STL/mesh artifact for 3D solids when available.
- [ ] Preserve layers, units, model-space/paper-space distinction, blocks, and dimensions in metadata.
- [ ] Add conversion job states: queued, converting, converted, failed, manual_review.
- [ ] Add licensing and cost review before committing to ODA or Autodesk.

### Phase 5: AI and EPS Vector Conversion

- [x] Detect whether AI is PDF-compatible by checking for embedded PDF structure.
- [x] Preview PDF-compatible AI files in-browser as embedded PDF documents.
- [ ] For PDF-compatible AI: extract first page or selected artboard to SVG/PNG through Poppler or a hardened PDF renderer.
- [ ] For legacy AI/EPS: convert through Ghostscript and/or pstoedit in a sandboxed server worker.
- [ ] Normalize converted SVG/DXF into the same 2D vector model as DXF uploads.
- [ ] Mark text, images, clipping masks, gradients, and appearance effects as non-manufacturing geometry unless explicitly converted to outlines.
- [ ] Add manual-review fallback for AI files saved without PDF content.

### Phase 6: Backend Conversion Service

- [ ] Add an `uploaded_files` table/storage record for original file, owner, checksum, size, MIME, extension, and status.
- [ ] Add a `cad_artifacts` table/storage record for converted SVG/GLB/DXF/PNG/metadata.
- [ ] Add a job runner for conversions. Options:
  - Supabase Edge Function only for lightweight orchestration.
  - Node worker container for Ghostscript/Poppler/pstoedit.
  - Dedicated CAD worker container for ODA/Autodesk integration.
- [ ] Lock down conversion workers:
  - no outbound network unless required by provider
  - CPU/memory/time limits
  - temp directory isolation
  - antivirus or malware scan before processing
- [ ] Return parse/conversion progress to the UI.

### Phase 7: Viewer Upgrade

- [ ] Add a `Vector2DViewer` path alongside the current `CADFileGeometry` 3D path.
- [ ] Add view modes: `3D`, `Top`, `Front`, `Side`, and `2D`.
- [ ] For 2D vectors, show contours, holes, dimensions, layer toggles, and measurement tools.
- [ ] For converted DWG/AI/EPS, show conversion warnings in the viewer.
- [ ] Keep screenshot export, but add SVG/PDF preview artifact download for admins.

### Phase 8: Quote and DFM Logic

- [ ] Split quoting by service:
  - tube bending requires centerline length, bends, end cuts, OD/wall/material
  - tube laser requires tube profile plus feature count/path complexity
  - sheet laser requires area, perimeter, holes, thickness, material
  - 3D printing requires volume/material/process
- [ ] Do not use tube centerline length for flat vectors.
- [ ] Add `quoteConfidence` and `quoteBlockingReasons`.
- [ ] For AI/EPS/DWG, require conversion to validated vector geometry before instant quoting.
- [ ] Add DFM checks for minimum hole size, slot width, bridge/web distance, max sheet size, and bend proximity.

### Phase 9: Tests and Fixtures

- [ ] Add Playwright smoke tests for uploading each format class.
- [ ] Add parser unit tests once test framework is installed.
- [ ] Add golden metadata fixtures:
  - simple STEP cube
  - bent tube STEP
  - flat DXF with holes
  - DXF with blocks/splines
  - PDF-compatible AI
  - legacy EPS
  - DWG converted to DXF
- [ ] Track parse time, converted artifact size, entity count, and warning count.
- [ ] Add visual regression screenshots for 2D and 3D viewer modes.

## Suggested First PR

Start with a non-risky PR that makes the app honest and creates the target parser contract:

1. [x] Add format capability metadata.
2. [x] Update upload UI copy and badges.
3. [x] Add `previewKind`, `instantQuoteEligible`, and `quoteConfidence` fields.
4. [x] Keep behavior unchanged for STEP/STP/IGES/DXF.
5. [x] Keep DWG/AI/EPS as manual-review until server conversion exists.

This gives users accurate expectations immediately and sets up the backend conversion work without destabilizing the existing STEP parser.
