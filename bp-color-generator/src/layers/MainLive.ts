/**
 * Main layer composition for the application
 *
 * Combines all service layers into a single layer that can be provided
 * to the application at the top level.
 */

import { Layer } from "effect"
import { NodeContext } from "@effect/platform-node"
import { ConfigService } from "../services/ConfigService.js"
import { PatternService } from "../services/PatternService.js"
import { ExportService } from "../services/ExportService.js"
import { PaletteService } from "../services/PaletteService.js"

/**
 * Main live layer - combines all application services
 *
 * Provides:
 * - ConfigService
 * - PatternService
 * - ExportService
 * - PaletteService
 * - NodeContext (FileSystem, Path, etc.)
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function*() {
 *   const palette = yield* PaletteService
 *   const result = yield* palette.generate({ ... })
 * })
 *
 * const runnable = program.pipe(Effect.provide(MainLive))
 * ```
 */
export const MainLive = Layer.mergeAll(
  ConfigService.Default,
  PatternService.Default,
  ExportService.Default,
  PaletteService.Default
).pipe(Layer.provide(NodeContext.layer))
