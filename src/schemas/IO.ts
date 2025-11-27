/**
 * Schemas for export configuration
 */

import { Either, Schema } from "effect"

/**
 * File path for JSON export
 */
export const JSONPathSchema = Schema.String.pipe(
  Schema.nonEmptyString(),
  Schema.filter((path) => {
    if (path.includes("\0")) return false
    if (path.trim() !== path) return false
    return true
  }, {
    message: () => "Invalid file path"
  }),
  Schema.filter(
    (s) => [".json", ".JSON"].some((ext) => s.endsWith(ext)),
    { message: () => "File extension must be .json" }
  ),
  Schema.brand("JSONPath"),
  Schema.annotations({
    identifier: "JSONPath",
    description: "File path for JSON export"
  })
)

export const JSONPathSync = Schema.decodeSync(JSONPathSchema)
export const JSONPath = Schema.decodeUnknown(JSONPathSchema)
export type JSONPath = typeof JSONPathSchema.Type
export function isValideJSONPath(path: string): path is JSONPath {
  return Either.match(Schema.decodeUnknownEither(JSONPathSchema)(path), {onLeft: () => false, onRight: () => true})
}

/**
 * Export target options
 */
export const ExportTargetSchema = Schema.Literal("none", "json", "clipboard").pipe(
  Schema.annotations({
    identifier: "ExportTarget",
    description: "Where to export the generated palette(s)"
  })
)

export const ExportTarget = Schema.decodeUnknown(ExportTargetSchema)
export type ExportTarget = typeof ExportTargetSchema.Type

/**
 * Batch input mode
 */
export const BatchInputModeSchema = Schema.Literal("paste", "cycle", "transform").pipe(
  Schema.annotations({
    identifier: "BatchInputMode",
    description: "How to input color/stop pairs in batch mode"
  })
)

export const BatchInputMode = Schema.decodeUnknown(BatchInputModeSchema)
export type BatchInputMode = typeof BatchInputModeSchema.Type

/**
 * Batch paste input
 */
export const BatchPasteInputSchema = Schema.String.pipe(
  Schema.nonEmptyString(),
  Schema.filter((input) => {
    const trimmed = input.trim()
    return trimmed.length > 0
  }, {
    message: () => "Batch input cannot be empty"
  }),
  Schema.annotations({
    identifier: "BatchPasteInput",
    description: "Multi-line or comma-separated color/stop pairs"
  })
)

export const BatchPasteInput = Schema.decodeUnknown(BatchPasteInputSchema)
export type BatchPasteInput = typeof BatchPasteInputSchema.Type

/**
 * Export configuration
 */
export const ExportConfigSchema = Schema.Struct({
  target: ExportTargetSchema,
  jsonPath: Schema.optional(Schema.String),
  includeOKLCH: Schema.optionalWith(Schema.Boolean, {
    default: () => true,
    annotations: {
      description: "Include raw OKLCH color data in export (default: true)"
    }
  })
}).pipe(
  Schema.annotations({
    identifier: "ExportConfig",
    description: "Configuration for exporting generated palettes"
  })
)

export const ExportConfig = Schema.decodeUnknown(ExportConfigSchema)
export type ExportConfig = typeof ExportConfigSchema.Type
