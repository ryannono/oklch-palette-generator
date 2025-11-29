/**
 * Input specification for SingleTransform mode.
 *
 * Single source of truth for SingleTransform inputs.
 * Complete schema defines required fields; Partial derives all-optional for progressive completion.
 */

import { Schema } from "effect"
import { ColorSpaceSchema, ColorStringSchema } from "../../../../domain/color/color.schema.js"
import { PaletteNameSchema, StopPositionSchema } from "../../../../domain/palette/palette.schema.js"

// ============================================================================
// Complete Input Schema
// ============================================================================

/**
 * Complete SingleTransform input - all fields required.
 * This is the single source of truth for what SingleTransform needs.
 */
export const SingleTransformCompleteSchema = Schema.Struct({
  /** Reference color (source of lightness + chroma) */
  reference: ColorStringSchema,

  /** Target color (hue to preserve) */
  target: ColorStringSchema,

  /** Stop position for the transformed palette */
  stop: StopPositionSchema,

  /** Output color format */
  format: ColorSpaceSchema,

  /** Palette name for output */
  name: PaletteNameSchema,

  /** Pattern file path for generation */
  pattern: Schema.String
}).pipe(
  Schema.annotations({
    identifier: "SingleTransformComplete",
    description: "Complete input for single transformation - all fields required"
  })
)

export type SingleTransformComplete = typeof SingleTransformCompleteSchema.Type

// ============================================================================
// Partial Input Schema (Derived)
// ============================================================================

/**
 * Partial SingleTransform input - all fields optional.
 * Derived from Complete via Schema.partial for DRY.
 */
export const SingleTransformPartialSchema = SingleTransformCompleteSchema.pipe(
  Schema.partial,
  Schema.annotations({
    identifier: "SingleTransformPartial",
    description: "Partial input for single transformation - all fields optional for progressive completion"
  })
)

export type SingleTransformPartial = typeof SingleTransformPartialSchema.Type

// ============================================================================
// Decoders
// ============================================================================

/** Decode unknown value to Complete type */
export const decodeSingleTransformComplete = Schema.decodeUnknown(SingleTransformCompleteSchema)

/** Decode unknown value to Partial type */
export const decodeSingleTransformPartial = Schema.decodeUnknown(SingleTransformPartialSchema)
