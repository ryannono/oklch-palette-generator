/**
 * Test script to verify palette generation
 */

import { Effect } from "effect"
import { oklchToHex } from "../src/domain/color/conversions.js"
import { smoothPattern } from "../src/domain/math/interpolation.js"
import { generatePaletteFromStop } from "../src/domain/palette/generator.js"
import { learnFromSinglePalette } from "../src/programs/learn-patterns.js"
import { parseColorStringToOKLCH } from "../src/schemas/color.js"

const program = Effect.gen(function*() {
  console.log("🎨 Testing Palette Generation\n")

  // Step 1: Learn pattern from example palette
  console.log("Step 1: Learning pattern from example blue palette...")
  const { pattern } = yield* learnFromSinglePalette("test/fixtures/palettes/example-blue.json")
  const smoothed = smoothPattern(pattern)
  console.log("✅ Pattern learned and smoothed\n")

  // Step 2: Test with a new color - let's use a red
  const testColor = "#E63946" // A nice red
  console.log(`Step 2: Generating palette from ${testColor} at stop 500...`)

  const inputColor = yield* parseColorStringToOKLCH(testColor)
  console.log(
    `  Input OKLCH: L=${inputColor.l.toFixed(3)} C=${inputColor.c.toFixed(3)} H=${inputColor.h.toFixed(1)}°`
  )

  const generatedPalette = yield* generatePaletteFromStop(inputColor, 500, smoothed, "test-red")
  console.log("✅ Palette generated\n")

  // Step 3: Convert to hex and display
  console.log("Step 3: Generated palette (hex):")
  for (const stop of generatedPalette.stops) {
    const hex = yield* oklchToHex(stop.color)
    console.log(
      `  ${stop.position}: ${hex} (L=${stop.color.l.toFixed(3)} C=${stop.color.c.toFixed(3)} H=${
        stop.color.h.toFixed(1)
      }°)`
    )
  }

  // Step 4: Test with different anchor stops
  console.log("\nStep 4: Testing with same color at different stops...")

  const at400 = yield* generatePaletteFromStop(inputColor, 400, smoothed, "test-red-400")
  const at600 = yield* generatePaletteFromStop(inputColor, 600, smoothed, "test-red-600")

  console.log("\nIf input is stop 400:")
  console.log(`  100: ${yield* oklchToHex(at400.stops[0].color)}`)
  console.log(`  500: ${yield* oklchToHex(at400.stops[4].color)}`)
  console.log(`  1000: ${yield* oklchToHex(at400.stops[9].color)}`)

  console.log("\nIf input is stop 600:")
  console.log(`  100: ${yield* oklchToHex(at600.stops[0].color)}`)
  console.log(`  500: ${yield* oklchToHex(at600.stops[4].color)}`)
  console.log(`  1000: ${yield* oklchToHex(at600.stops[9].color)}`)

  console.log("\n✅ All tests passed!")
})

Effect.runPromise(program).catch(console.error)
