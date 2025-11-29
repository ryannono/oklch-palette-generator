/**
 * Input specification for ManyTransform mode.
 *
 * Single source of truth for ManyTransform (one-to-many transformation) inputs.
 * Complete schema defines required fields; Partial derives all-optional for progressive completion.
 */

import { Schema } from "effect"
import { ColorSpaceSchema, ColorStringSchema } from "../../../../domain/color/color.schema.js"
import { PaletteNameSchema, StopPositionSchema } from "../../../../domain/palette/palette.schema.js"

// ============================================================================
// Complete Input Schema
// ============================================================================

/**
 * Complete ManyTransform input - all fields required.
 * This is the single source of truth for what ManyTransform needs.
 */
export const ManyTransformCompleteSchema = Schema.Struct({
  /** Reference color (source of lightness + chroma) */
  reference: ColorStringSchema,

  /** Target colors (hues to preserve) */
  targets: Schema.NonEmptyArray(ColorStringSchema),

  /** Stop position for all transformed palettes */
  stop: StopPositionSchema,

  /** Output color format */
  format: ColorSpaceSchema,

  /** Base palette name for output (individual palettes get suffixed) */
  name: PaletteNameSchema,

  /** Pattern file path for generation */
  pattern: Schema.String
}).pipe(
  Schema.annotations({
    identifier: "ManyTransformComplete",
    description: "Complete input for one-to-many transformation - all fields required"
  })
)

export type ManyTransformComplete = typeof ManyTransformCompleteSchema.Type

// ============================================================================
// Partial Input Schema (Derived)
// ============================================================================

/**
 * Partial ManyTransform input - all fields optional.
 * Derived from Complete via Schema.partial for DRY.
 */
export const ManyTransformPartialSchema = ManyTransformCompleteSchema.pipe(
  Schema.partial,
  Schema.annotations({
    identifier: "ManyTransformPartial",
    description: "Partial input for one-to-many transformation - all fields optional for progressive completion"
  })
)

export type ManyTransformPartial = typeof ManyTransformPartialSchema.Type

// ============================================================================
// Decoders
// ============================================================================

/** Decode unknown value to Complete type */
export const decodeManyTransformComplete = Schema.decodeUnknown(ManyTransformCompleteSchema)

/** Decode unknown value to Partial type */
export const decodeManyTransformPartial = Schema.decodeUnknown(ManyTransformPartialSchema)
