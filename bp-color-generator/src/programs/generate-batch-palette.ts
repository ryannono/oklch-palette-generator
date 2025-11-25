/**
 * Batch palette generation program
 *
 * Generates multiple palettes in parallel with error collection
 */

import { Array as Arr, Data, Effect, Either, Option } from "effect"
import type { BatchGeneratedPaletteOutput, BatchGeneratePaletteInput } from "../schemas/batch.js"
import type { GeneratedPaletteOutput } from "../schemas/generate-palette.js"
import { generatePalette } from "./generate-palette.js"

/**
 * Error during batch palette generation
 */
export class BatchGenerationError extends Data.TaggedError("BatchGenerationError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Generate multiple palettes in parallel
 *
 * Uses Effect.all with mode: "either" to collect all results (successes and failures)
 * instead of failing fast on first error.
 *
 * @param input - Batch generation input with color/stop pairs and config
 * @returns Effect with batch output containing all successful palettes and partial flag
 */
export const generateBatchPalette = (
  input: BatchGeneratePaletteInput
): Effect.Effect<BatchGeneratedPaletteOutput, never> => {
  const { outputFormat, pairs, paletteGroupName, patternSource } = input

  const generateAll = Effect.all(
    pairs.map((pair) =>
      generatePalette({
        inputColor: pair.color,
        anchorStop: pair.stop,
        outputFormat,
        paletteName: `${paletteGroupName}-${pair.color}`,
        patternSource
      }).pipe(
        Effect.mapError((error) =>
          new BatchGenerationError({ message: `Failed to generate palette for ${pair.color}`, cause: error })
        ),
        Effect.either
      )
    ),
    { concurrency: 3, mode: "either" }
  )

  return generateAll.pipe(
    Effect.map((results) => {
      const successes: Array<GeneratedPaletteOutput> = []
      const failures: Array<unknown> = []

      for (const result of results) {
        if (Either.isRight(result)) {
          if (Either.isRight(result.right)) {
            successes.push(result.right.right)
          } else {
            failures.push(result.right.left)
          }
        } else {
          failures.push(result.left)
        }
      }

      return {
        groupName: paletteGroupName,
        outputFormat,
        generatedAt: new Date().toISOString(),
        palettes: successes,
        partial: failures.length > 0
      } satisfies BatchGeneratedPaletteOutput
    })
  )
}

/**
 * Get error information from generation results
 */
export const getGenerationErrors = (
  results: Array<Either.Either<GeneratedPaletteOutput, BatchGenerationError>>
): Array<{ index: number; error: BatchGenerationError }> => {
  return Arr.filterMap(results, (result, index) =>
    Either.match(result, {
      onLeft: (error) => Option.some({ index, error }),
      onRight: () => Option.none()
    }))
}

/**
 * Check if all generation attempts succeeded
 */
export const allSucceeded = (
  results: Array<Either.Either<GeneratedPaletteOutput, BatchGenerationError>>
): boolean => {
  return results.every(Either.isRight)
}

/**
 * Get successful palette outputs from results
 */
export const getSuccessfulPalettes = (
  results: Array<Either.Either<GeneratedPaletteOutput, BatchGenerationError>>
): Array<GeneratedPaletteOutput> => {
  return Arr.filterMap(results, (result) =>
    Either.match(result, {
      onLeft: () => Option.none(),
      onRight: (palette) => Option.some(palette)
    }))
}
