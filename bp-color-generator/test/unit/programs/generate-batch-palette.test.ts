/**
 * Tests for batch palette generation
 */

import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { generateBatchPalette } from "../../../src/programs/generate-batch-palette.js"
import type { BatchGeneratePaletteInput } from "../../../src/schemas/batch.js"

describe("generateBatchPalette", () => {
  it.effect("should generate multiple palettes successfully", () =>
    Effect.gen(function*() {
      const input: BatchGeneratePaletteInput = {
        pairs: [
          { color: "#2D72D2", stop: 500 },
          { color: "#DB2C6F", stop: 600 },
          { color: "#5C7CFA", stop: 400 }
        ],
        outputFormat: "hex",
        paletteGroupName: "test-batch",
        patternSource: "test/fixtures/palettes/example-blue.json"
      }

      const result = yield* generateBatchPalette(input)

      expect(result.groupName).toBe("test-batch")
      expect(result.outputFormat).toBe("hex")
      expect(result.palettes).toHaveLength(3)
      expect(result.partial).toBe(false)
      expect(result.generatedAt).toBeDefined()
    }))

  it.effect("should handle single palette", () =>
    Effect.gen(function*() {
      const input: BatchGeneratePaletteInput = {
        pairs: [{ color: "#2D72D2", stop: 500 }],
        outputFormat: "hex",
        paletteGroupName: "single",
        patternSource: "test/fixtures/palettes/example-blue.json"
      }

      const result = yield* generateBatchPalette(input)

      expect(result.palettes).toHaveLength(1)
      expect(result.palettes[0].name).toContain("single")
      expect(result.palettes[0].stops).toHaveLength(10)
      expect(result.partial).toBe(false)
    }))

  it.effect("should generate palettes in different output formats", () =>
    Effect.gen(function*() {
      const input: BatchGeneratePaletteInput = {
        pairs: [
          { color: "#2D72D2", stop: 500 },
          { color: "#DB2C6F", stop: 600 }
        ],
        outputFormat: "oklch",
        paletteGroupName: "oklch-batch",
        patternSource: "test/fixtures/palettes/example-blue.json"
      }

      const result = yield* generateBatchPalette(input)

      expect(result.outputFormat).toBe("oklch")
      expect(result.palettes).toHaveLength(2)
      expect(result.palettes[0].stops[0].value).toContain("oklch")
    }))

  it.effect("should mark partial if any palette fails", () =>
    Effect.gen(function*() {
      const input: BatchGeneratePaletteInput = {
        pairs: [
          { color: "#2D72D2", stop: 500 },
          { color: "invalid-color", stop: 600 },
          { color: "#5C7CFA", stop: 400 }
        ],
        outputFormat: "hex",
        paletteGroupName: "mixed-results",
        patternSource: "test/fixtures/palettes/example-blue.json"
      }

      const result = yield* generateBatchPalette(input)

      expect(result.partial).toBe(true)
      expect(result.palettes.length).toBeGreaterThan(0)
      expect(result.palettes.length).toBeLessThan(3)
    }))

  it.effect("should collect successful palettes even with failures", () =>
    Effect.gen(function*() {
      const input: BatchGeneratePaletteInput = {
        pairs: [
          { color: "#2D72D2", stop: 500 },
          { color: "not-a-valid-color-string", stop: 600 },
          { color: "#5C7CFA", stop: 400 }
        ],
        outputFormat: "hex",
        paletteGroupName: "partial",
        patternSource: "test/fixtures/palettes/example-blue.json"
      }

      const result = yield* generateBatchPalette(input)

      expect(result.palettes.length).toBe(2)
      expect(result.palettes[0].inputColor).toBe("#2D72D2")
      expect(result.palettes[1].inputColor).toBe("#5C7CFA")
    }))
})

describe("getSuccessfulPalettes", () => {
  it.effect("should extract successful palettes from results", () =>
    Effect.gen(function*() {
      const input: BatchGeneratePaletteInput = {
        pairs: [
          { color: "#2D72D2", stop: 500 },
          { color: "invalid", stop: 600 }
        ],
        outputFormat: "hex",
        paletteGroupName: "test",
        patternSource: "test/fixtures/palettes/example-blue.json"
      }

      const result = yield* generateBatchPalette(input)

      expect(result.palettes.length).toBe(1)
      expect(result.palettes[0].inputColor).toBe("#2D72D2")
    }))
})
