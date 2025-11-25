/**
 * Export service for palette output
 */

import { FileSystem, Path } from "@effect/platform"
import clipboardy from "clipboardy"
import { Effect } from "effect"
import type { BatchGeneratedPaletteOutput } from "../schemas/batch.js"
import type { ExportConfig } from "../schemas/export.js"
import type { GeneratedPaletteOutput } from "../schemas/generate-palette.js"

export const exportPalette = (
  palette: GeneratedPaletteOutput,
  _config: ExportConfig
): Effect.Effect<void, Error, FileSystem.FileSystem | Path.Path> => {
  const { jsonPath, target } = _config

  const json = JSON.stringify(palette, null, 2)

  if (target === "none") {
    return Effect.void
  }

  if (target === "clipboard") {
    return Effect.tryPromise({
      try: () => clipboardy.write(json),
      catch: (error) => new Error(`Failed to copy to clipboard: ${String(error)}`)
    })
  }

  if (target === "json") {
    if (!jsonPath) {
      return Effect.fail(new Error("JSON export requires a file path"))
    }

    return Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const dir = path.dirname(jsonPath)
      yield* fs.makeDirectory(dir, { recursive: true })
      yield* fs.writeFileString(jsonPath, json)
    })
  }

  return Effect.void
}

export const exportBatchPalette = (
  batch: BatchGeneratedPaletteOutput,
  config: ExportConfig
): Effect.Effect<void, Error, FileSystem.FileSystem | Path.Path> => {
  const { jsonPath, target } = config

  const json = JSON.stringify(batch, null, 2)

  if (target === "none") {
    return Effect.void
  }

  if (target === "clipboard") {
    return Effect.tryPromise({
      try: () => clipboardy.write(json),
      catch: (error) => new Error(`Failed to copy to clipboard: ${String(error)}`)
    })
  }

  if (target === "json") {
    if (!jsonPath) {
      return Effect.fail(new Error("JSON export requires a file path"))
    }

    return Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const dir = path.dirname(jsonPath)
      yield* fs.makeDirectory(dir, { recursive: true })
      yield* fs.writeFileString(jsonPath, json)
    })
  }

  return Effect.void
}
