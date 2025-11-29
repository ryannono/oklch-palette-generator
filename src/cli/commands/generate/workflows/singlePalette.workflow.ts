/**
 * SinglePalette workflow - completes partial input to full input.
 *
 * Takes a SinglePalettePartial (from CLI flags) and prompts for any missing fields,
 * producing a validated SinglePaletteComplete that can be passed to the executor.
 */

import { Effect, Option as O, pipe, Schema } from "effect"
import { ColorSpaceSchema } from "../../../../domain/color/color.schema.js"
import { StopPositionSchema } from "../../../../domain/palette/palette.schema.js"
import { PromptService } from "../../../../services/PromptService/index.js"
import { promptForColor, promptForOutputFormat, promptForPaletteName, promptForStop } from "../../../prompts.js"
import {
  type SinglePaletteComplete,
  SinglePaletteCompleteSchema,
  type SinglePalettePartial
} from "../inputSpecs/singlePalette.input.js"
import { refineOption, resolveWithFallback, resolveWithPrompt, type WorkflowCompletionError } from "./shared/index.js"

// ============================================================================
// Local Schema Refiners (created from generic refineOption)
// ============================================================================

/** Refine Option<number> to Option<StopPosition> using Schema validation */
const refineStopOption = refineOption(StopPositionSchema)

/** Refine Option<string> to Option<ColorSpace> using Schema validation */
const refineFormatOption = refineOption(ColorSpaceSchema)

// ============================================================================
// Local Resolvers (created from generic resolveWithPrompt)
// ============================================================================

/** Resolve color by prompting when missing */
const resolveColor = resolveWithPrompt(promptForColor)

/** Resolve stop by prompting when missing */
const resolveStop = resolveWithPrompt(promptForStop)

/** Resolve format by prompting when missing */
const resolveFormat = resolveWithPrompt(promptForOutputFormat)

/** Resolve name by prompting when missing (with default) */
const resolveName = (
  nameOpt: string | undefined,
  defaultName: string
): Effect.Effect<string, WorkflowCompletionError, PromptService> =>
  pipe(
    O.fromNullable(nameOpt),
    O.match({
      onNone: () => promptForPaletteName(defaultName),
      onSome: Effect.succeed
    })
  )

// ============================================================================
// Workflow Completion
// ============================================================================

/**
 * Complete a partial SinglePalette input by prompting for missing fields.
 *
 * Uses Option pattern matching to prompt only when a field is missing.
 * Validates the final result with Schema.decode for type safety.
 */
export const completeSinglePaletteInput = (
  partial: SinglePalettePartial,
  patternFromContext: string
): Effect.Effect<SinglePaletteComplete, WorkflowCompletionError, PromptService> =>
  pipe(
    Effect.all({
      color: resolveColor(partial.color),
      stop: resolveStop(partial.stop),
      format: resolveFormat(partial.format),
      name: resolveName(partial.name, "palette"),
      pattern: Effect.succeed(resolveWithFallback(patternFromContext)(partial.pattern))
    }),
    Effect.flatMap((resolved) => Schema.decode(SinglePaletteCompleteSchema)(resolved))
  )

// ============================================================================
// Conversion Helpers
// ============================================================================

/**
 * Build a partial input from CLI options.
 * Converts Option types to optional values for the workflow.
 * Uses Schema validation to safely refine types - invalid values become undefined.
 */
export const buildPartialFromOptions = (options: {
  readonly colorOpt: O.Option<string>
  readonly stopOpt: O.Option<number>
  readonly formatOpt: O.Option<string>
  readonly nameOpt: O.Option<string>
  readonly patternOpt: O.Option<string>
}): SinglePalettePartial => ({
  color: O.getOrUndefined(options.colorOpt),
  format: O.getOrUndefined(refineFormatOption(options.formatOpt)),
  name: O.getOrUndefined(options.nameOpt),
  pattern: O.getOrUndefined(options.patternOpt),
  stop: O.getOrUndefined(refineStopOption(options.stopOpt))
})
