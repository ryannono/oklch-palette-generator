/**
 * Input specification for SinglePalette mode.
 *
 * Single source of truth for SinglePalette inputs.
 * Complete schema defines required fields; Partial derives all-optional for progressive completion.
 */

import { Schema } from "effect"
import { ColorSpaceSchema, ColorStringSchema } from "../../../../domain/color/color.schema.js"
import { PaletteNameSchema, StopPositionSchema } from "../../../../domain/palette/palette.schema.js"

// ============================================================================
// Complete Input Schema
// ============================================================================

/**
 * Complete SinglePalette input - all fields required.
 * This is the single source of truth for what SinglePalette needs.
 */
export const SinglePaletteCompleteSchema = Schema.Struct({
  /** Base color for palette generation */
  color: ColorStringSchema,

  /** Stop position where base color appears */
  stop: StopPositionSchema,

  /** Output color format */
  format: ColorSpaceSchema,

  /** Palette name for output */
  name: PaletteNameSchema,

  /** Pattern file path for generation */
  pattern: Schema.String
}).pipe(
  Schema.annotations({
    identifier: "SinglePaletteComplete",
    description: "Complete input for single palette generation - all fields required"
  })
)

export type SinglePaletteComplete = typeof SinglePaletteCompleteSchema.Type

// ============================================================================
// Partial Input Schema (Derived)
// ============================================================================

/**
 * Partial SinglePalette input - all fields optional.
 * Derived from Complete via Schema.partial for DRY.
 * Used during input gathering when some fields may come from flags and others from prompts.
 */
export const SinglePalettePartialSchema = SinglePaletteCompleteSchema.pipe(
  Schema.partial,
  Schema.annotations({
    identifier: "SinglePalettePartial",
    description: "Partial input for single palette generation - all fields optional for progressive completion"
  })
)

export type SinglePalettePartial = typeof SinglePalettePartialSchema.Type

// ============================================================================
// Decoders
// ============================================================================

/** Decode unknown value to Complete type */
export const decodeSinglePaletteComplete = Schema.decodeUnknown(SinglePaletteCompleteSchema)

/** Decode unknown value to Partial type */
export const decodeSinglePalettePartial = Schema.decodeUnknown(SinglePalettePartialSchema)
