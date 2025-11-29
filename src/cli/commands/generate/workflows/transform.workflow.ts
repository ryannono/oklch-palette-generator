/**
 * Transform workflows - complete partial inputs to full inputs.
 *
 * Handles SingleTransform, ManyTransform, and BatchTransform modes.
 */

import { Array as Arr, Effect, Option as O, pipe, Schema } from "effect"
import { ColorSpaceSchema } from "../../../../domain/color/color.schema.js"
import { type StopPosition, StopPositionSchema } from "../../../../domain/palette/palette.schema.js"
import { PromptService } from "../../../../services/PromptService/index.js"
import { promptForOutputFormat, promptForPaletteName, promptForStop } from "../../../prompts.js"
import {
  type BatchTransformComplete,
  BatchTransformCompleteSchema,
  type BatchTransformPartial,
  type PartialTransformationItem,
  type TransformationItem
} from "../inputSpecs/batchTransform.input.js"
import {
  type ManyTransformComplete,
  ManyTransformCompleteSchema,
  type ManyTransformPartial
} from "../inputSpecs/manyTransform.input.js"
import {
  type SingleTransformComplete,
  SingleTransformCompleteSchema,
  type SingleTransformPartial
} from "../inputSpecs/singleTransform.input.js"
import {
  forEachNonEmpty,
  refineOption,
  resolveWithFallback,
  resolveWithPrompt,
  type WorkflowCompletionError
} from "./shared/index.js"

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
// Required Field Resolution
// ============================================================================

/**
 * Resolve a required field, dying if missing.
 *
 * Used for fields that must be provided and cannot be prompted for.
 */
const resolveRequired = <T>(value: T | undefined, fieldName: string): Effect.Effect<T, never, never> =>
  pipe(
    O.fromNullable(value),
    O.match({
      onNone: () => Effect.die(new Error(`Missing required field: ${fieldName}`)),
      onSome: Effect.succeed
    })
  )

/**
 * Resolve a required NonEmptyReadonlyArray field, dying if missing.
 */
const resolveRequiredArray = <T>(
  value: Arr.NonEmptyReadonlyArray<T> | undefined,
  fieldName: string
): Effect.Effect<Arr.NonEmptyReadonlyArray<T>, never, never> =>
  pipe(
    O.fromNullable(value),
    O.match({
      onNone: () => Effect.die(new Error(`Missing required field: ${fieldName}`)),
      onSome: Effect.succeed
    })
  )

// ============================================================================
// SingleTransform Workflow
// ============================================================================

/**
 * Complete a partial SingleTransform input by prompting for missing fields.
 */
export const completeSingleTransformInput = (
  partial: SingleTransformPartial,
  patternFromContext: string
): Effect.Effect<SingleTransformComplete, WorkflowCompletionError, PromptService> =>
  pipe(
    Effect.all({
      reference: resolveRequired(partial.reference, "reference"),
      target: resolveRequired(partial.target, "target"),
      stop: resolveStop(partial.stop),
      format: resolveFormat(partial.format),
      name: resolveName(partial.name, "transformed"),
      pattern: Effect.succeed(resolveWithFallback(patternFromContext)(partial.pattern))
    }),
    Effect.flatMap((resolved) => Schema.decode(SingleTransformCompleteSchema)(resolved))
  )

// ============================================================================
// ManyTransform Workflow
// ============================================================================

/**
 * Complete a partial ManyTransform input by prompting for missing fields.
 */
export const completeManyTransformInput = (
  partial: ManyTransformPartial,
  patternFromContext: string
): Effect.Effect<ManyTransformComplete, WorkflowCompletionError, PromptService> =>
  pipe(
    Effect.all({
      reference: resolveRequired(partial.reference, "reference"),
      targets: resolveRequiredArray(partial.targets, "targets"),
      stop: resolveStop(partial.stop),
      format: resolveFormat(partial.format),
      name: resolveName(partial.name, "transformed"),
      pattern: Effect.succeed(resolveWithFallback(patternFromContext)(partial.pattern))
    }),
    Effect.flatMap((resolved) => Schema.decode(ManyTransformCompleteSchema)(resolved))
  )

// ============================================================================
// BatchTransform Workflow
// ============================================================================

/**
 * Complete a partial BatchTransform input by prompting for missing stops.
 */
export const completeBatchTransformInput = (
  partial: BatchTransformPartial,
  patternFromContext: string
): Effect.Effect<BatchTransformComplete, WorkflowCompletionError, PromptService> =>
  pipe(
    Effect.all({
      transformations: completeTransformations(partial.transformations),
      format: resolveFormat(partial.format),
      name: resolveName(partial.name, "transformed"),
      pattern: Effect.succeed(resolveWithFallback(patternFromContext)(partial.pattern))
    }),
    Effect.flatMap((resolved) => Schema.decode(BatchTransformCompleteSchema)(resolved))
  )

/**
 * Complete all transformations by prompting for missing stops.
 * Uses forEachNonEmpty to preserve non-empty guarantee without type casting.
 */
const completeTransformations = (
  items: Arr.NonEmptyReadonlyArray<PartialTransformationItem>
): Effect.Effect<Arr.NonEmptyReadonlyArray<TransformationItem>, WorkflowCompletionError, PromptService> =>
  forEachNonEmpty(items, (item, _index) => completeTransformationItem(item))

/**
 * Complete a single transformation item by prompting for stop if missing.
 * Builds complete item explicitly to avoid type casting.
 */
const completeTransformationItem = (
  item: PartialTransformationItem
): Effect.Effect<TransformationItem, WorkflowCompletionError, PromptService> => {
  const buildComplete = (stop: StopPosition): TransformationItem =>
    "targets" in item
      ? { reference: item.reference, targets: item.targets, stop }
      : { reference: item.reference, target: item.target, stop }

  return pipe(
    O.fromNullable(item.stop),
    O.match({
      onNone: () => pipe(promptForStop(), Effect.map(buildComplete)),
      onSome: (stop) => Effect.succeed(buildComplete(stop))
    })
  )
}

// ============================================================================
// Conversion Helpers
// ============================================================================

/**
 * Build a partial SingleTransform input from CLI options.
 * Uses type-safe Schema refinement instead of unsafe type casts.
 */
export const buildSingleTransformPartial = (options: {
  readonly reference: string | undefined
  readonly target: string | undefined
  readonly stopOpt: O.Option<number>
  readonly formatOpt: O.Option<string>
  readonly nameOpt: O.Option<string>
  readonly patternOpt: O.Option<string>
}): SingleTransformPartial => ({
  reference: options.reference,
  target: options.target,
  stop: O.getOrUndefined(refineStopOption(options.stopOpt)),
  format: O.getOrUndefined(refineFormatOption(options.formatOpt)),
  name: O.getOrUndefined(options.nameOpt),
  pattern: O.getOrUndefined(options.patternOpt)
})

/**
 * Build a partial ManyTransform input from CLI options.
 * Uses type-safe Schema refinement instead of unsafe type casts.
 */
export const buildManyTransformPartial = (options: {
  readonly reference: string
  readonly targets: Arr.NonEmptyReadonlyArray<string>
  readonly stopOpt: O.Option<number>
  readonly formatOpt: O.Option<string>
  readonly nameOpt: O.Option<string>
  readonly patternOpt: O.Option<string>
}): ManyTransformPartial => ({
  reference: options.reference,
  targets: options.targets,
  stop: O.getOrUndefined(refineStopOption(options.stopOpt)),
  format: O.getOrUndefined(refineFormatOption(options.formatOpt)),
  name: O.getOrUndefined(options.nameOpt),
  pattern: O.getOrUndefined(options.patternOpt)
})

/**
 * Build a partial BatchTransform input from parsed transformations.
 * Uses type-safe Schema refinement instead of unsafe type casts.
 */
export const buildBatchTransformPartial = (options: {
  readonly transformations: Arr.NonEmptyReadonlyArray<PartialTransformationItem>
  readonly formatOpt: O.Option<string>
  readonly nameOpt: O.Option<string>
  readonly patternOpt: O.Option<string>
}): BatchTransformPartial => ({
  transformations: options.transformations,
  format: O.getOrUndefined(refineFormatOption(options.formatOpt)),
  name: O.getOrUndefined(options.nameOpt),
  pattern: O.getOrUndefined(options.patternOpt)
})
