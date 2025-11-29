/**
 * Collection utilities for workflow modules
 *
 * Provides type-safe utilities for working with NonEmptyReadonlyArray
 * while preserving the non-empty guarantee through Effect operations.
 */

import { Array as Arr, Effect } from "effect"

// ============================================================================
// NonEmptyArray Utilities
// ============================================================================

/**
 * Effect.forEach that preserves NonEmptyReadonlyArray type.
 *
 * Uses head/tail pattern to maintain the non-empty guarantee without type casting.
 * Processes items sequentially (concurrency: 1) to maintain order.
 *
 * @example
 * ```ts
 * const result = forEachNonEmpty(
 *   items,
 *   (item, index) => processItem(item, index)
 * )
 * // result: Effect<NonEmptyReadonlyArray<ProcessedItem>, E, R>
 * ```
 */
export const forEachNonEmpty = <A, B, E, R>(
  items: Arr.NonEmptyReadonlyArray<A>,
  f: (item: A, index: number) => Effect.Effect<B, E, R>
): Effect.Effect<Arr.NonEmptyReadonlyArray<B>, E, R> =>
  Effect.gen(function*() {
    const head = yield* f(Arr.headNonEmpty(items), 0)
    const tail = yield* Effect.forEach(Arr.drop(items, 1), (item, index) => f(item, index + 1), {
      concurrency: 1
    })
    return Arr.prepend(tail, head)
  })
