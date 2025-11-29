/**
 * Integration tests for the generate CLI command
 */

import { Array as Arr, Effect, Option as O, pipe } from "effect"
import { describe, expect, it } from "vitest"
import { handleGenerate } from "../../src/cli/commands/generate/handler.js"
import { executeBatchPalettes } from "../../src/cli/commands/generate/modes/batch/executor.js"
import { executeSinglePalette } from "../../src/cli/commands/generate/modes/single/executor.js"
import {
  executeBatchTransform,
  executeManyTransform,
  executeSingleTransform
} from "../../src/cli/commands/generate/modes/transform/executor.js"
import { MainTest } from "../../src/layers/MainTest.js"
import { ConfigService } from "../../src/services/ConfigService.js"

describe("CLI Generate Command Integration", () => {
  describe("Single Palette Mode", () => {
    it("should generate palette with all flags provided", () =>
      Effect.gen(function*() {
        const config = yield* ConfigService
        const appConfig = yield* config.getConfig()

        const result = yield* executeSinglePalette(
          {
            color: "#2D72D2",
            format: "hex",
            name: "test-palette",
            pattern: appConfig.patternSource,
            stop: 500
          },
          {
            exportOpt: O.some("none"),
            exportPath: O.none()
          }
        )

        expect(result.name).toBe("test-palette")
        expect(result.stops).toHaveLength(11)
        expect(result.outputFormat).toBe("hex")
      }).pipe(Effect.provide(MainTest)))

    it("should handle valid RGB color input", () =>
      Effect.gen(function*() {
        const config = yield* ConfigService
        const appConfig = yield* config.getConfig()

        const result = yield* executeSinglePalette(
          {
            color: "rgb(45, 114, 210)",
            format: "oklch",
            name: "rgb-test",
            pattern: appConfig.patternSource,
            stop: 600
          },
          {
            exportOpt: O.some("none"),
            exportPath: O.none()
          }
        )

        expect(result.name).toBe("rgb-test")
        expect(result.stops).toHaveLength(11)
        expect(result.outputFormat).toBe("oklch")
      }).pipe(Effect.provide(MainTest)))

    it("should handle OKLCH color input", () =>
      Effect.gen(function*() {
        const config = yield* ConfigService
        const appConfig = yield* config.getConfig()

        const result = yield* executeSinglePalette(
          {
            color: "oklch(0.5 0.15 250)",
            format: "hex",
            name: "oklch-test",
            pattern: appConfig.patternSource,
            stop: 400
          },
          {
            exportOpt: O.some("none"),
            exportPath: O.none()
          }
        )

        expect(result.name).toBe("oklch-test")
        expect(result.stops).toHaveLength(11)
      }).pipe(Effect.provide(MainTest)))
  })

  describe("Batch Palette Mode", () => {
    it("should generate multiple palettes from pairs with stops", () =>
      Effect.gen(function*() {
        const config = yield* ConfigService
        const appConfig = yield* config.getConfig()

        const result = yield* executeBatchPalettes(
          {
            format: "hex",
            name: "batch-test",
            pairs: [
              { color: "#2D72D2", stop: 500 },
              { color: "#DB2C6F", stop: 600 }
            ],
            pattern: appConfig.patternSource
          },
          {
            exportOpt: O.some("none"),
            exportPath: O.none(),
            isInteractive: false
          }
        )

        expect(result.palettes).toHaveLength(2)
        expect(result.failures).toHaveLength(0)
        pipe(
          Arr.get(result.palettes, 0),
          O.map((p) => expect(p.name).toContain("batch-test"))
        )
        pipe(
          Arr.get(result.palettes, 1),
          O.map((p) => expect(p.name).toContain("batch-test"))
        )
      }).pipe(Effect.provide(MainTest)))

    it("should handle batch with different output formats", () =>
      Effect.gen(function*() {
        const config = yield* ConfigService
        const appConfig = yield* config.getConfig()

        const result = yield* executeBatchPalettes(
          {
            format: "oklch",
            name: "oklch-batch",
            pairs: [
              { color: "#2D72D2", stop: 500 },
              { color: "rgb(219, 44, 111)", stop: 600 }
            ],
            pattern: appConfig.patternSource
          },
          {
            exportOpt: O.some("none"),
            exportPath: O.none(),
            isInteractive: false
          }
        )

        expect(result.palettes).toHaveLength(2)
        pipe(
          Arr.get(result.palettes, 0),
          O.map((p) => expect(p.outputFormat).toBe("oklch"))
        )
        pipe(
          Arr.get(result.palettes, 1),
          O.map((p) => expect(p.outputFormat).toBe("oklch"))
        )
      }).pipe(Effect.provide(MainTest)))
  })

  describe("Main Handler with Mode Detection", () => {
    it("should detect single mode from single color without separator", () =>
      Effect.gen(function*() {
        const config = yield* ConfigService
        const appConfig = yield* config.getConfig()

        const result = yield* handleGenerate({
          colorOpt: O.some("#2D72D2"),
          exportOpt: O.some("none"),
          exportPath: O.none(),
          formatOpt: O.some("hex"),
          nameOpt: O.some("single-detect"),
          patternOpt: O.some(appConfig.patternSource),
          stopOpt: O.some(500)
        })

        // Single mode returns PaletteResult
        expect("name" in result).toBe(true)
        if ("name" in result) {
          expect(result.name).toBe("single-detect")
        }
      }).pipe(Effect.provide(MainTest)))

    it("should detect batch mode from comma-separated input", () =>
      Effect.gen(function*() {
        const config = yield* ConfigService
        const appConfig = yield* config.getConfig()

        const result = yield* handleGenerate({
          colorOpt: O.some("#2D72D2::500,#DB2C6F::600"),
          exportOpt: O.some("none"),
          exportPath: O.none(),
          formatOpt: O.some("hex"),
          nameOpt: O.some("batch-detect"),
          patternOpt: O.some(appConfig.patternSource),
          stopOpt: O.none()
        })

        // Batch mode returns BatchGenerationResult
        expect("palettes" in result).toBe(true)
        if ("palettes" in result) {
          expect(result.palettes).toHaveLength(2)
        }
      }).pipe(Effect.provide(MainTest)))

    it("should detect batch mode from single color with :: separator", () =>
      Effect.gen(function*() {
        const config = yield* ConfigService
        const appConfig = yield* config.getConfig()

        const result = yield* handleGenerate({
          colorOpt: O.some("#2D72D2::500"),
          exportOpt: O.some("none"),
          exportPath: O.none(),
          formatOpt: O.some("hex"),
          nameOpt: O.some("batch-single"),
          patternOpt: O.some(appConfig.patternSource),
          stopOpt: O.none()
        })

        // Batch mode returns BatchGenerationResult
        expect("palettes" in result).toBe(true)
        if ("palettes" in result) {
          expect(result.palettes).toHaveLength(1)
        }
      }).pipe(Effect.provide(MainTest)))
  })

  describe("Transformation Mode", () => {
    it("should handle single transformation without export", () =>
      Effect.gen(function*() {
        const config = yield* ConfigService
        const appConfig = yield* config.getConfig()

        const result = yield* executeSingleTransform(
          {
            format: "hex",
            name: "transform-test",
            pattern: appConfig.patternSource,
            reference: "#2D72D2",
            stop: 500,
            target: "#238551"
          },
          {
            exportOpt: O.none(),
            exportPath: O.none()
          }
        )

        expect(result.name).toBe("transform-test")
        expect(result.stops).toHaveLength(11)
        expect(result.anchorStop).toBe(500)
      }).pipe(Effect.provide(MainTest)))

    it("should handle one-to-many transformation without export", () =>
      Effect.gen(function*() {
        const config = yield* ConfigService
        const appConfig = yield* config.getConfig()

        const results = yield* executeManyTransform(
          {
            format: "hex",
            name: "one-to-many-test",
            pattern: appConfig.patternSource,
            reference: "#BD5200",
            stop: 500,
            targets: ["#2D72D2", "#238551", "#BD5200"]
          },
          {
            exportOpt: O.none(),
            exportPath: O.none()
          }
        )

        expect(results).toHaveLength(3)
        pipe(
          Arr.get(results, 0),
          O.map((r) => expect(r.name).toBe("one-to-many-test-#2D72D2"))
        )
        pipe(
          Arr.get(results, 1),
          O.map((r) => expect(r.name).toBe("one-to-many-test-#238551"))
        )
        pipe(
          Arr.get(results, 2),
          O.map((r) => expect(r.name).toBe("one-to-many-test-#BD5200"))
        )
        Arr.forEach(results, (result) => {
          expect(result.stops).toHaveLength(11)
          expect(result.anchorStop).toBe(500)
        })
      }).pipe(Effect.provide(MainTest)))

    it("should handle batch transformations without export", () =>
      Effect.gen(function*() {
        const config = yield* ConfigService
        const appConfig = yield* config.getConfig()

        const results = yield* executeBatchTransform(
          {
            format: "hex",
            name: "batch-transform",
            pattern: appConfig.patternSource,
            transformations: [
              {
                reference: "#2D72D2",
                target: "#238551",
                stop: 500
              },
              {
                reference: "#BD5200",
                targets: ["#2D72D2", "#238551"],
                stop: 600
              }
            ]
          },
          {
            exportOpt: O.none(),
            exportPath: O.none()
          }
        )

        // Should have 3 results: 1 from single + 2 from one-to-many
        expect(results).toHaveLength(3)
        pipe(
          Arr.get(results, 0),
          O.map((r) => expect(r.name).toBe("batch-transform"))
        )
        pipe(
          Arr.get(results, 1),
          O.map((r) => expect(r.name).toBe("batch-transform-#2D72D2"))
        )
        pipe(
          Arr.get(results, 2),
          O.map((r) => expect(r.name).toBe("batch-transform-#238551"))
        )
      }).pipe(Effect.provide(MainTest)))

    it("should handle one-to-many transformation with export='none'", () =>
      Effect.gen(function*() {
        const config = yield* ConfigService
        const appConfig = yield* config.getConfig()

        // Test that export with 'none' target doesn't throw
        const results = yield* executeManyTransform(
          {
            format: "hex",
            name: "export-none-test",
            pattern: appConfig.patternSource,
            reference: "#BD5200",
            stop: 500,
            targets: ["#2D72D2", "#238551"]
          },
          {
            exportOpt: O.some("none"),
            exportPath: O.none()
          }
        )

        expect(results).toHaveLength(2)
        pipe(
          Arr.get(results, 0),
          O.map((r) => expect(r.outputFormat).toBe("hex"))
        )
        pipe(
          Arr.get(results, 1),
          O.map((r) => expect(r.outputFormat).toBe("hex"))
        )
      }).pipe(Effect.provide(MainTest)))

    it("should handle batch transformations with export='none'", () =>
      Effect.gen(function*() {
        const config = yield* ConfigService
        const appConfig = yield* config.getConfig()

        // Test that batch export with 'none' target doesn't throw
        const results = yield* executeBatchTransform(
          {
            format: "hex",
            name: "batch-export-none",
            pattern: appConfig.patternSource,
            transformations: [
              {
                reference: "#BD5200",
                targets: ["#2D72D2", "#238551"],
                stop: 500
              },
              {
                reference: "#555555",
                target: "#666666",
                stop: 400
              }
            ]
          },
          {
            exportOpt: O.some("none"),
            exportPath: O.none()
          }
        )

        // Should have 3 results: 2 from one-to-many + 1 from single
        expect(results).toHaveLength(3)
      }).pipe(Effect.provide(MainTest)))
  })
})
