/**
 * Option refinement utilities for workflow modules
 *
 * Provides generic higher-order functions for refining Option types
 * using Effect Schema validation.
 */

import { Option as O, pipe, Schema } from "effect"

// ============================================================================
// Higher-Order Functions
// ============================================================================

/**
 * Refine an Option<I> to Option<A> using Schema validation.
 * Invalid values become O.none.
 *
 * The Schema's encoded type (I) determines what input type is accepted.
 * This provides full type safety without requiring separate functions
 * for string vs number inputs.
 *
 * @example
 * ```ts
 * const refineFormat = refineOption(ColorSpaceSchema)
 * const result = refineFormat(O.some("hex")) // O.some("hex") as Option<ColorSpace>
 * const invalid = refineFormat(O.some("invalid")) // O.none
 *
 * const refineStop = refineOption(StopPositionSchema)
 * const result = refineStop(O.some(500)) // O.some(500) as Option<StopPosition>
 * ```
 */
export const refineOption = <A, I>(schema: Schema.Schema<A, I>) =>
// Input accepts broader type to work with exactOptionalPropertyTypes
// Schema.decodeUnknownOption validates the runtime value regardless
(opt: O.Option<I extends string ? string : I extends number ? number : I>): O.Option<A> =>
  pipe(
    opt,
    O.flatMap((value) => Schema.decodeUnknownOption(schema)(value))
  )
