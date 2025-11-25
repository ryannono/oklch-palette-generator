/**
 * Generate commands for palette generation
 *
 * Provides both direct (all flags required) and interactive modes
 * Supports single palette and batch generation with export options
 */

import * as clack from "@clack/prompts"
import { Command, Options } from "@effect/cli"
import { Effect, Either, Option as O } from "effect"
import type { ColorStopPair } from "../../schemas/batch.js"
import { ColorSpace, ColorString } from "../../schemas/color.js"
import { type ExportConfig, ExportTarget } from "../../schemas/export.js"
import { StopPosition } from "../../schemas/palette.js"
import { ExportService } from "../../services/ExportService.js"
import { PaletteService } from "../../services/PaletteService.js"
import { getPairsWithMissingStops, parseBatchPairsInput, type ParsedPair, setPairStop } from "../parse-batch-input.js"
import {
  promptForBatchInputMode,
  promptForBatchPaste,
  promptForColor,
  promptForExportTarget,
  promptForJsonPath,
  promptForOutputFormat,
  promptForPaletteName,
  promptForStop
} from "../prompts.js"
import {
  displayBatchInteractive,
  displayPaletteInteractive,
  displayPaletteSimple,
  generateAndDisplay
} from "./shared.js"

/**
 * Color input option - can be comma-separated for batch mode
 * Examples:
 * - Single: -c "#2D72D2"
 * - Batch: -c "#2D72D2::500,#DB2C6F::600"
 */
const colorOption = Options.text("color").pipe(
  Options.withAlias("c"),
  Options.optional,
  Options.withDescription("Color(s): single color or comma-separated pairs (e.g., #2D72D2::500,#DB2C6F::600)")
)

/**
 * Stop position option (optional - prompts if missing)
 */
const stopOption = Options.integer("stop").pipe(
  Options.withAlias("s"),
  Options.optional,
  Options.withDescription("Stop position (100-1000)")
)

/**
 * Output format option (optional - prompts if missing)
 */
const formatOption = Options.text("format").pipe(
  Options.withAlias("f"),
  Options.optional,
  Options.withDescription("Output format: hex, rgb, oklch, oklab")
)

/**
 * Palette name option (optional - prompts if missing)
 */
const nameOption = Options.text("name").pipe(
  Options.withAlias("n"),
  Options.optional,
  Options.withDescription("Palette name")
)

/**
 * Pattern source option (for advanced users)
 */
const patternOption = Options.text("pattern").pipe(
  Options.withAlias("p"),
  Options.withDefault("test/fixtures/palettes/example-blue.json"),
  Options.withDescription("Pattern source file path")
)

/**
 * Export target option
 */
const exportOption = Options.text("export").pipe(
  Options.withAlias("e"),
  Options.optional,
  Options.withDescription("Export target: none, json, clipboard")
)

/**
 * Export path option (for JSON export)
 */
const exportPathOption = Options.text("export-path").pipe(
  Options.optional,
  Options.withDescription("File path for JSON export")
)

/**
 * Handle batch mode palette generation
 */
const handleBatchMode = ({
  exportOpt,
  exportPath,
  formatOpt,
  isInteractive,
  nameOpt,
  pairs,
  pattern
}: {
  exportOpt: O.Option<string>
  exportPath: O.Option<string>
  formatOpt: O.Option<string>
  isInteractive: boolean
  nameOpt: O.Option<string>
  pairs: Array<ParsedPair>
  pattern: string
}) =>
  Effect.gen(function*() {
    if (isInteractive) {
      clack.log.success(`Found ${pairs.length} color(s)`)
    }

    // Prompt for missing stops
    const missingStops = getPairsWithMissingStops(pairs)
    if (missingStops.length > 0) {
      if (isInteractive) {
        clack.log.warn(`${missingStops.length} color(s) missing stop position`)
      }

      for (const pair of missingStops) {
        if (isInteractive) {
          clack.log.info(`For color: ${pair.color}`)
        }
        const stop = yield* promptForStop()
        const updated = yield* setPairStop(pair, stop)
        // Update in pairs array
        const index = pairs.findIndex((p) => p.raw === pair.raw)
        if (index !== -1) {
          pairs[index] = updated
        }
      }
    }

    // Convert to ColorStopPair array
    const colorStopPairs: Array<ColorStopPair> = pairs.map((p) => ({
      color: p.color,
      stop: p.stop!
    }))

    // Get output format
    const format = yield* O.match(formatOpt, {
      onNone: () => promptForOutputFormat(),
      onSome: (value) => ColorSpace(value)
    })

    // Get group name
    const groupName = yield* O.match(nameOpt, {
      onNone: () => promptForPaletteName("batch"),
      onSome: (value) => Effect.succeed(value)
    })

    // Generate batch palettes
    const service = yield* PaletteService

    const spinner = isInteractive ? clack.spinner() : undefined
    if (spinner) {
      spinner.start(`Generating ${colorStopPairs.length} palette(s)...`)
    }

    const batchResult = yield* service.generateBatch({
      pairs: colorStopPairs,
      outputFormat: format,
      paletteGroupName: groupName,
      patternSource: pattern
    })

    if (spinner) {
      if (batchResult.partial) {
        spinner.stop(`⚠️  Generated ${batchResult.palettes.length} palette(s) with some failures`)
      } else {
        spinner.stop(`✅ Generated ${batchResult.palettes.length} palette(s)`)
      }
    }

    // Display results
    yield* displayBatchInteractive(batchResult)

    // Handle export
    const exportTarget = yield* O.match(exportOpt, {
      onNone: () => promptForExportTarget(),
      onSome: (value) => ExportTarget(value)
    })

    if (exportTarget !== "none") {
      let jsonPathValue = O.getOrUndefined(exportPath)
      if (exportTarget === "json" && !jsonPathValue) {
        jsonPathValue = yield* promptForJsonPath()
      }

      const exportConfig: ExportConfig = {
        target: exportTarget,
        jsonPath: jsonPathValue,
        includeOKLCH: true
      }

      const exportService = yield* ExportService
      yield* exportService.exportBatch(batchResult, exportConfig)
      clack.log.success(
        exportTarget === "json"
          ? `Exported to ${exportConfig.jsonPath}`
          : "Copied to clipboard!"
      )
    }

    return batchResult
  })

/**
 * Smart generate command - automatically prompts for missing options
 * Detects batch mode from color input (comma-separated values)
 * Supports single and batch modes with export options
 */
export const generate = Command.make("generate", {
  color: colorOption,
  export: exportOption,
  exportPath: exportPathOption,
  format: formatOption,
  name: nameOption,
  pattern: patternOption,
  stop: stopOption
}).pipe(
  Command.withHandler(
    (
      {
        color: colorOpt,
        export: exportOpt,
        exportPath,
        format: formatOpt,
        name: nameOpt,
        pattern,
        stop: stopOpt
      }
    ) =>
      Effect.gen(function*() {
        // Determine if interactive mode
        const hasColorInput = O.isSome(colorOpt)
        const isInteractive = !hasColorInput || O.isSome(stopOpt) === false

        // Try to detect batch mode from color input
        let pairs: Array<ParsedPair> | undefined
        let isBatchMode = false

        if (hasColorInput) {
          const colorValue = O.getOrThrow(colorOpt)
          // Try parsing as batch input (comma or newline separated)
          const batchParseResult = yield* Effect.either(parseBatchPairsInput(colorValue))

          if (Either.isRight(batchParseResult)) {
            const parsed = batchParseResult.right
            // If we got multiple pairs, it's batch mode
            if (parsed.length > 1) {
              isBatchMode = true
              pairs = parsed
            } else if (parsed.length === 1) {
              // Single pair - could be batch or single mode
              // If it has :: or : separator, treat as batch
              if (colorValue.includes("::") || colorValue.includes(":")) {
                isBatchMode = true
                pairs = parsed
              }
            }
          }
        } else {
          // No color provided - prompt for mode
          if (isInteractive) {
            clack.intro("🎨 BP Color Palette Generator")
            const inputMode = yield* promptForBatchInputMode()

            if (inputMode === "paste") {
              const pasteInput = yield* promptForBatchPaste()
              const parsedPairs = yield* parseBatchPairsInput(pasteInput)
              isBatchMode = true
              pairs = parsedPairs
            } else {
              clack.log.info("Cycle mode not yet implemented. Using single palette mode.")
            }
          }
        }

        // BATCH MODE FLOW
        if (isBatchMode && pairs) {
          return yield* handleBatchMode({
            exportOpt,
            exportPath,
            formatOpt,
            isInteractive,
            nameOpt,
            pairs,
            pattern
          })
        }

        // SINGLE PALETTE MODE
        if (isInteractive) {
          clack.intro("🎨 BP Color Palette Generator")
        }

        // Prompt for missing values with retry on error
        let color: string
        while (true) {
          const colorResult = yield* Effect.either(
            O.match(colorOpt, {
              onNone: () => promptForColor(),
              onSome: (value) => ColorString(value)
            })
          )
          if (Either.isRight(colorResult)) {
            color = colorResult.right
            break
          }
          // On error, always prompt interactively
          clack.log.error("Invalid color format. Please try again.")
          const retryColor = yield* promptForColor()
          const retryResult = yield* Effect.either(ColorString(retryColor))
          if (Either.isRight(retryResult)) {
            color = retryResult.right
            break
          }
        }

        let stop: StopPosition
        while (true) {
          const stopResult = yield* Effect.either(
            O.match(stopOpt, {
              onNone: () => promptForStop(),
              onSome: (value) => StopPosition(value)
            })
          )
          if (Either.isRight(stopResult)) {
            stop = stopResult.right
            break
          }
          // On error, always prompt interactively
          clack.log.error("Invalid stop position. Please try again.")
          const retryStop = yield* promptForStop()
          const retryResult = yield* Effect.either(StopPosition(retryStop))
          if (Either.isRight(retryResult)) {
            stop = retryResult.right
            break
          }
        }

        let format: ColorSpace
        while (true) {
          const formatResult = yield* Effect.either(
            O.match(formatOpt, {
              onNone: () => promptForOutputFormat(),
              onSome: (value) => ColorSpace(value)
            })
          )
          if (Either.isRight(formatResult)) {
            format = formatResult.right
            break
          }
          // On error, always prompt interactively
          clack.log.error("Invalid format. Please try again.")
          const retryFormat = yield* promptForOutputFormat()
          const retryResult = yield* Effect.either(ColorSpace(retryFormat))
          if (Either.isRight(retryResult)) {
            format = retryResult.right
            break
          }
        }

        const name = yield* O.match(nameOpt, {
          onNone: () => promptForPaletteName("generated"),
          onSome: (value) => Effect.succeed(value)
        })

        // Create spinner for generation if interactive
        const spinner = isInteractive ? clack.spinner() : undefined
        if (spinner) {
          spinner.start("Generating palette...")
        }

        // Generate palette
        const result = yield* generateAndDisplay({ color, format, name, pattern, stop })

        if (spinner) {
          spinner.stop("✅ Palette generated!")
        }

        // Display with appropriate formatting
        if (isInteractive) {
          yield* displayPaletteInteractive(result)
        } else {
          yield* displayPaletteSimple(result)
        }

        return result
      })
  ),
  Command.withDescription("Generate a color palette (interactive if options missing)")
)
