/**
 * Branded domain types for improved type safety
 *
 * Provides branded string types for domain concepts to prevent mixing
 * different kinds of strings.
 */

import { Schema } from "effect"

/**
 * Palette name with validation
 *
 * Valid palette names:
 * - Non-empty
 * - Max 100 characters
 * - Alphanumeric, spaces, dashes, and underscores only
 */
export const PaletteNameSchema = Schema.String.pipe(
  Schema.nonEmptyString(),
  Schema.maxLength(100),
  Schema.filter((name) => {
    // Valid palette name: alphanumeric, dash, underscore, space
    return /^[a-zA-Z0-9\s\-_]+$/.test(name)
  }, {
    message: () => "Palette name must contain only alphanumeric characters, spaces, dashes, and underscores"
  }),
  Schema.brand("PaletteName"),
  Schema.annotations({
    identifier: "PaletteName",
    description: "Valid palette name"
  })
)

export type PaletteName = typeof PaletteNameSchema.Type
export const PaletteName = Schema.decodeUnknown(PaletteNameSchema)
