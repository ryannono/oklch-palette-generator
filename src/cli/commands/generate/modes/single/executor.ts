/**
 * Single palette mode handler
 *
 * Generates a single palette from a color and anchor stop position.
 */

import { Effect, Option as O } from "effect"
import { promptForPaletteName } from "../../../../prompts.js"
import type { SinglePaletteComplete } from "../../inputSpecs/singlePalette.input.js"
import { buildExportConfig, displayPalette, executePaletteExport, generateAndDisplay } from "../../output/formatter.js"
import { validateColor, validateFormat, validateStop } from "../../validation.js"

// ============================================================================
// Types
// ============================================================================

interface SingleModeOptions {
  readonly colorOpt: O.Option<string>
  readonly exportOpt: O.Option<string>
  readonly exportPath: O.Option<string>
  readonly formatOpt: O.Option<string>
  readonly nameOpt: O.Option<string>
  readonly pattern: string
  readonly stopOpt: O.Option<number>
}

interface SingleModeExecuteOptions {
  readonly exportOpt: O.Option<string>
  readonly exportPath: O.Option<string>
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Execute single palette mode with complete, validated input.
 *
 * This is the new workflow-based API that receives fully validated input.
 * No prompting or validation happens here - just pure execution.
 */
export const executeSinglePalette = (
  input: SinglePaletteComplete,
  options: SingleModeExecuteOptions
) =>
  Effect.gen(function*() {
    const result = yield* generateAndDisplay({
      color: input.color,
      format: input.format,
      name: input.name,
      pattern: input.pattern,
      stop: input.stop
    })
    yield* displayPalette(result)

    const exportConfig = yield* buildExportConfig(options.exportOpt, options.exportPath)
    yield* O.match(exportConfig, {
      onNone: () => Effect.void,
      onSome: (config) => executePaletteExport(result, config)
    })

    return result
  })

/**
 * Handle single palette mode generation (legacy API)
 *
 * Validates inputs (prompting for missing required values), generates
 * a palette using the configured pattern, displays the result, and
 * optionally exports to JSON or clipboard.
 *
 * @deprecated Use executeSinglePalette with WorkflowCoordinator instead
 */
export const handleSingleMode = ({
  colorOpt,
  exportOpt,
  exportPath,
  formatOpt,
  nameOpt,
  pattern,
  stopOpt
}: SingleModeOptions) =>
  Effect.gen(function*() {
    const color = yield* validateColor(colorOpt)
    const stop = yield* validateStop(stopOpt)
    const format = yield* validateFormat(formatOpt)

    const name = yield* O.match(nameOpt, {
      onNone: () => promptForPaletteName("generated"),
      onSome: Effect.succeed
    })

    const result = yield* generateAndDisplay({ color, format, name, pattern, stop })
    yield* displayPalette(result)

    const exportConfig = yield* buildExportConfig(exportOpt, exportPath)
    yield* O.match(exportConfig, {
      onNone: () => Effect.void,
      onSome: (config) => executePaletteExport(result, config)
    })

    return result
  })
