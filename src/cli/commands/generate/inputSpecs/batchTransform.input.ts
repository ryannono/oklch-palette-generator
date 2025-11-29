/**
 * Input specification for BatchTransform mode.
 *
 * Single source of truth for BatchTransform (multiple transformations) inputs.
 * Complete schema defines required fields; Partial derives all-optional for progressive completion.
 */

import { Schema } from "effect"
import { ColorSpaceSchema, ColorStringSchema } from "../../../../domain/color/color.schema.js"
import { PaletteNameSchema, StopPositionSchema } from "../../../../domain/palette/palette.schema.js"

// ============================================================================
// Component Schemas
// ============================================================================

/** Complete single transformation within a batch */
const BatchTransformItemSchema = Schema.Struct({
  reference: ColorStringSchema,
  target: ColorStringSchema,
  stop: StopPositionSchema
}).pipe(
  Schema.annotations({
    identifier: "BatchTransformItem",
    description: "A single transformation with reference, target, and stop"
  })
)

export type BatchTransformItem = typeof BatchTransformItemSchema.Type

/** Complete one-to-many transformation within a batch */
const BatchTransformManyItemSchema = Schema.Struct({
  reference: ColorStringSchema,
  targets: Schema.NonEmptyArray(ColorStringSchema),
  stop: StopPositionSchema
}).pipe(
  Schema.annotations({
    identifier: "BatchTransformManyItem",
    description: "A one-to-many transformation with reference, targets, and stop"
  })
)

export type BatchTransformManyItem = typeof BatchTransformManyItemSchema.Type

/** Union of transformation types within a batch */
const TransformationItemSchema = Schema.Union(
  BatchTransformItemSchema,
  BatchTransformManyItemSchema
).pipe(
  Schema.annotations({
    identifier: "TransformationItem",
    description: "A single or one-to-many transformation"
  })
)

export type TransformationItem = typeof TransformationItemSchema.Type

// ============================================================================
// Complete Input Schema
// ============================================================================

/**
 * Complete BatchTransform input - all fields required.
 * This is the single source of truth for what BatchTransform needs.
 */
export const BatchTransformCompleteSchema = Schema.Struct({
  /** Array of transformations (each with complete stop) */
  transformations: Schema.NonEmptyArray(TransformationItemSchema),

  /** Output color format */
  format: ColorSpaceSchema,

  /** Base name for output palettes */
  name: PaletteNameSchema,

  /** Pattern file path for generation */
  pattern: Schema.String
}).pipe(
  Schema.annotations({
    identifier: "BatchTransformComplete",
    description: "Complete input for batch transformations - all fields required"
  })
)

export type BatchTransformComplete = typeof BatchTransformCompleteSchema.Type

// ============================================================================
// Partial Component Schemas
// ============================================================================

/** Partial single transformation - stop is optional */
const PartialBatchTransformItemSchema = Schema.Struct({
  reference: ColorStringSchema,
  target: ColorStringSchema,
  stop: Schema.optional(StopPositionSchema)
}).pipe(
  Schema.annotations({
    identifier: "PartialBatchTransformItem",
    description: "A single transformation with optional stop"
  })
)

export type PartialBatchTransformItem = typeof PartialBatchTransformItemSchema.Type

/** Partial one-to-many transformation - stop is optional */
const PartialBatchTransformManyItemSchema = Schema.Struct({
  reference: ColorStringSchema,
  targets: Schema.NonEmptyArray(ColorStringSchema),
  stop: Schema.optional(StopPositionSchema)
}).pipe(
  Schema.annotations({
    identifier: "PartialBatchTransformManyItem",
    description: "A one-to-many transformation with optional stop"
  })
)

export type PartialBatchTransformManyItem = typeof PartialBatchTransformManyItemSchema.Type

/** Union of partial transformation types */
const PartialTransformationItemSchema = Schema.Union(
  PartialBatchTransformItemSchema,
  PartialBatchTransformManyItemSchema
).pipe(
  Schema.annotations({
    identifier: "PartialTransformationItem",
    description: "A single or one-to-many transformation with optional stop"
  })
)

export type PartialTransformationItem = typeof PartialTransformationItemSchema.Type

// ============================================================================
// Partial Input Schema
// ============================================================================

/**
 * Partial BatchTransform input - for progressive completion.
 * Transformations are required but stops within them can be optional.
 */
export const BatchTransformPartialSchema = Schema.Struct({
  /** Array of transformations (stops may be missing) */
  transformations: Schema.NonEmptyArray(PartialTransformationItemSchema),

  /** Output color format (optional) */
  format: Schema.optional(ColorSpaceSchema),

  /** Base name for output palettes (optional) */
  name: Schema.optional(PaletteNameSchema),

  /** Pattern file path for generation (optional) */
  pattern: Schema.optional(Schema.String)
}).pipe(
  Schema.annotations({
    identifier: "BatchTransformPartial",
    description: "Partial input for batch transformations - for progressive completion"
  })
)

export type BatchTransformPartial = typeof BatchTransformPartialSchema.Type

// ============================================================================
// Decoders
// ============================================================================

/** Decode unknown value to Complete type */
export const decodeBatchTransformComplete = Schema.decodeUnknown(BatchTransformCompleteSchema)

/** Decode unknown value to Partial type */
export const decodeBatchTransformPartial = Schema.decodeUnknown(BatchTransformPartialSchema)
