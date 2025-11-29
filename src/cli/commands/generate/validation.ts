/**
 * Reusable validation logic with error recovery
 *
 * These helpers add retry logic to schema validations.
 * They are used AFTER mode detection, within each handler.
 */

import * as clack from "@clack/prompts"
import { Effect, Option as O, pipe } from "effect"
import type { ParseError } from "effect/ParseResult"
import { ColorSpace, type ColorSpace as ColorSpaceType, ColorString } from "../../../domain/color/color.schema.js"
import { StopPosition, type StopPosition as StopPositionType } from "../../../domain/palette/palette.schema.js"
import { ExportTarget, type ExportTarget as ExportTargetType } from "../../../services/ExportService/export.schema.js"
import { promptForColor, promptForExportTarget, promptForOutputFormat, promptForStop } from "../../prompts.js"

// ============================================================================
// Generic Validator
// ============================================================================

/**
 * Configuration for creating a validator with retry logic
 * TRawInput is the type accepted by the validator (e.g., string, number)
 * TPromptOutput is the type returned by the prompt (may be same as TRawInput)
 * TOutput is the validated output type
 */
type ValidatorConfig<TRawInput, TPromptOutput, TOutput> = {
  readonly validate: (value: TRawInput) => Effect.Effect<TOutput, ParseError>
  readonly prompt: () => Effect.Effect<TPromptOutput, ParseError>
  readonly errorMessage: string
}

/**
 * Create a validator that retries on failure using recursive Effect composition.
 * Replaces imperative while(true) loops with FP-style recursion.
 */
const createValidator = <TRawInput, TPromptOutput extends TRawInput, TOutput>(
  config: ValidatorConfig<TRawInput, TPromptOutput, TOutput>
) => {
  const logErrorAndRetry: Effect.Effect<TOutput, never> = pipe(
    Effect.sync(() => clack.log.error(config.errorMessage)),
    Effect.flatMap(() => config.prompt()),
    Effect.flatMap(config.validate),
    Effect.catchAll(() => logErrorAndRetry)
  )

  return (opt: O.Option<TRawInput>): Effect.Effect<TOutput, never> =>
    pipe(
      O.match(opt, {
        onNone: () => pipe(config.prompt(), Effect.flatMap(config.validate)),
        onSome: config.validate
      }),
      Effect.catchAll(() => logErrorAndRetry)
    )
}

// ============================================================================
// Specific Validators
// ============================================================================

/**
 * Validate color input with retry on error (for single mode)
 */
export const validateColor = (colorOpt: O.Option<string>): Effect.Effect<string, never> =>
  createValidator<string, string, string>({
    validate: ColorString,
    prompt: promptForColor,
    errorMessage: "Invalid color format. Please try again."
  })(colorOpt)

/**
 * Validate stop position with retry on error
 */
export const validateStop = (stopOpt: O.Option<number>): Effect.Effect<StopPositionType, never> =>
  createValidator<number, StopPositionType, StopPositionType>({
    validate: StopPosition,
    prompt: promptForStop,
    errorMessage: "Invalid stop position. Please try again."
  })(stopOpt)

/**
 * Validate output format with retry on error
 */
export const validateFormat = (formatOpt: O.Option<string>): Effect.Effect<ColorSpaceType, never> =>
  createValidator<string, ColorSpaceType, ColorSpaceType>({
    validate: ColorSpace,
    prompt: promptForOutputFormat,
    errorMessage: "Invalid format. Please try again."
  })(formatOpt)

/**
 * Validate export target with retry on error
 */
export const validateExportTarget = (exportOpt: O.Option<string>): Effect.Effect<ExportTargetType, never> =>
  createValidator<string, ExportTargetType, ExportTargetType>({
    validate: ExportTarget,
    prompt: promptForExportTarget,
    errorMessage: "Invalid export target. Please try again."
  })(exportOpt)
