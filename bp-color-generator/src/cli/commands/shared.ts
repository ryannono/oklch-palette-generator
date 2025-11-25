/**
 * Shared command logic for palette generation
 */

import * as clack from "@clack/prompts"
import { Effect } from "effect"
import { generatePalette } from "../../programs/generate-palette.js"
import type { BatchGeneratedPaletteOutput } from "../../schemas/batch.js"
import type { ColorSpace } from "../../schemas/color.js"
import { GeneratePaletteInput } from "../../schemas/generate-palette.js"
import type { StopPosition } from "../../schemas/palette.js"

/**
 * Generate and display palette
 */
export const generateAndDisplay = ({
  color,
  format,
  name,
  pattern,
  stop
}: {
  color: string
  format: ColorSpace
  name: string
  pattern: string
  stop: StopPosition
}) =>
  Effect.gen(function*() {
    // Validate and create input using schema
    const input = yield* GeneratePaletteInput({
      anchorStop: stop,
      inputColor: color,
      outputFormat: format,
      paletteName: name,
      patternSource: pattern
    })

    // Generate palette
    const result = yield* generatePalette(input)

    return result
  })

/**
 * Display palette with simple formatting (for direct CLI)
 */
export const displayPaletteSimple = (
  result: Effect.Effect.Success<ReturnType<typeof generateAndDisplay>>
) =>
  Effect.sync(() => {
    console.log(`\n🎨 Generated Palette: ${result.name}`)
    console.log(`   Input: ${result.inputColor} at stop ${result.anchorStop}`)
    console.log(`   Format: ${result.outputFormat}\n`)

    for (const stop of result.stops) {
      console.log(`   ${stop.position}: ${stop.value}`)
    }
    console.log()
  })

/**
 * Display palette with clack formatting (for interactive CLI)
 */
export const displayPaletteInteractive = (
  result: Effect.Effect.Success<ReturnType<typeof generateAndDisplay>>
) =>
  Effect.sync(() => {
    clack.note(
      `Input: ${result.inputColor} at stop ${result.anchorStop}\nFormat: ${result.outputFormat}\n\n${
        result.stops.map((s) => `  ${s.position}: ${s.value}`).join("\n")
      }`,
      `Palette: ${result.name}`
    )

    clack.outro("Done! 🎉")
  })

/**
 * Display batch results with simple formatting (for direct CLI)
 */
export const displayBatchSimple = (batch: BatchGeneratedPaletteOutput) =>
  Effect.sync(() => {
    const status = batch.partial ? "⚠️  Partial results" : "✅ All palettes generated"

    console.log(`\n${status}`)
    console.log(`   Group: ${batch.groupName}`)
    console.log(`   Format: ${batch.outputFormat}`)
    console.log(`   Generated: ${new Date(batch.generatedAt).toLocaleString()}`)
    console.log(`   Count: ${batch.palettes.length} palette(s)\n`)

    for (const palette of batch.palettes) {
      console.log(`━━━ ${palette.name} ━━━`)
      console.log(`Input: ${palette.inputColor} at stop ${palette.anchorStop}\n`)

      for (const stop of palette.stops) {
        console.log(`  ${stop.position}: ${stop.value}`)
      }
      console.log()
    }
  })

/**
 * Display batch results with clack formatting (for interactive CLI)
 */
export const displayBatchInteractive = (batch: BatchGeneratedPaletteOutput) =>
  Effect.sync(() => {
    const status = batch.partial ? "⚠️  Generated with some failures" : "✅ All generated successfully"

    clack.log.success(`${status}: ${batch.palettes.length} palette(s)`)
    clack.log.info(`Group: ${batch.groupName}`)
    clack.log.info(`Format: ${batch.outputFormat}`)

    for (const palette of batch.palettes) {
      clack.note(
        `Input: ${palette.inputColor} at stop ${palette.anchorStop}\n\n${
          palette.stops.map((s) => `  ${s.position}: ${s.value}`).join("\n")
        }`,
        palette.name
      )
    }

    clack.outro("Done! 🎉")
  })
