/**
 * SinglePalette workflow - completes partial input to full input.
 *
 * Takes a SinglePalettePartial (from CLI flags) and prompts for any missing fields,
 * producing a validated SinglePaletteComplete that can be passed to the executor.
 */

import { Effect, Option as O, pipe, Schema } from "effect"
import type { ParseError } from "effect/ParseResult"
import { type ColorSpace, ColorSpaceSchema } from "../../../../domain/color/color.schema.js"
import { type StopPosition, StopPositionSchema } from "../../../../domain/palette/palette.schema.js"
import { CancelledError, PromptService } from "../../../../services/PromptService/index.js"
import { promptForColor, promptForOutputFormat, promptForPaletteName, promptForStop } from "../../../prompts.js"
import {
  type SinglePaletteComplete,
  SinglePaletteCompleteSchema,
  type SinglePalettePartial
} from "../inputSpecs/singlePalette.input.js"

// ============================================================================
// Types
// ============================================================================

/** Error types that can occur during workflow completion */
export type WorkflowCompletionError = CancelledError | ParseError

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
      name: resolveName(partial.name),
      pattern: resolvePattern(partial.pattern, patternFromContext)
    }),
    Effect.flatMap((resolved) => Schema.decode(SinglePaletteCompleteSchema)(resolved))
  )

// ============================================================================
// Field Resolution (prompt only when missing)
// ============================================================================

const resolveColor = (
  colorOpt: string | undefined
): Effect.Effect<string, CancelledError | ParseError, PromptService> =>
  pipe(
    O.fromNullable(colorOpt),
    O.match({
      onNone: () => promptForColor(),
      onSome: Effect.succeed
    })
  )

const resolveStop = (
  stopOpt: StopPosition | undefined
): Effect.Effect<StopPosition, CancelledError | ParseError, PromptService> =>
  pipe(
    O.fromNullable(stopOpt),
    O.match({
      onNone: () => promptForStop(),
      onSome: Effect.succeed
    })
  )

const resolveFormat = (
  formatOpt: ColorSpace | undefined
): Effect.Effect<ColorSpace, CancelledError | ParseError, PromptService> =>
  pipe(
    O.fromNullable(formatOpt),
    O.match({
      onNone: () => promptForOutputFormat(),
      onSome: Effect.succeed
    })
  )

const resolveName = (
  nameOpt: string | undefined
): Effect.Effect<string, CancelledError, PromptService> =>
  pipe(
    O.fromNullable(nameOpt),
    O.match({
      onNone: () => promptForPaletteName("palette"),
      onSome: Effect.succeed
    })
  )

const resolvePattern = (
  patternOpt: string | undefined,
  fallback: string
): Effect.Effect<string> =>
  pipe(
    O.fromNullable(patternOpt),
    O.getOrElse(() => fallback),
    Effect.succeed
  )

// ============================================================================
// Type-Safe Option Refinement
// ============================================================================

/**
 * Refine an Option<number> to Option<StopPosition> using Schema validation.
 * Returns O.none if the number is not a valid stop position.
 */
const refineStopOption = (opt: O.Option<number>): O.Option<StopPosition> =>
  pipe(
    opt,
    O.flatMap((n) => Schema.decodeUnknownOption(StopPositionSchema)(n))
  )

/**
 * Refine an Option<string> to Option<ColorSpace> using Schema validation.
 * Returns O.none if the string is not a valid color space.
 */
const refineFormatOption = (opt: O.Option<string>): O.Option<ColorSpace> =>
  pipe(
    opt,
    O.flatMap((s) => Schema.decodeUnknownOption(ColorSpaceSchema)(s))
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
