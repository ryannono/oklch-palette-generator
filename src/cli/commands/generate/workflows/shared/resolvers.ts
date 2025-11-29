/**
 * Resolver utilities for workflow modules
 *
 * Provides generic higher-order functions for resolving optional values
 * by prompting when missing or using fallback values.
 */

import { Effect, Option as O, pipe } from "effect"

// ============================================================================
// Higher-Order Functions
// ============================================================================

/**
 * Create a resolver that prompts when a value is missing.
 *
 * Returns a function that checks if a value is present:
 * - If present, wraps it in Effect.succeed
 * - If missing, calls the provided prompt function
 *
 * @example
 * ```ts
 * const resolveFormat = resolveWithPrompt(promptForOutputFormat)
 * const result = resolveFormat(undefined) // prompts user
 * const existing = resolveFormat("hex") // Effect.succeed("hex")
 * ```
 */
export const resolveWithPrompt =
  <T, E, R>(promptFn: () => Effect.Effect<T, E, R>) => (value: T | undefined): Effect.Effect<T, E, R> =>
    pipe(
      O.fromNullable(value),
      O.match({
        onNone: () => promptFn(),
        onSome: Effect.succeed
      })
    )

/**
 * Create a resolver that uses a fallback when a value is missing.
 *
 * Pure function (no prompting) - returns the value or fallback immediately.
 *
 * @example
 * ```ts
 * const resolvePattern = resolveWithFallback(defaultPattern)
 * const result = resolvePattern(undefined) // returns defaultPattern
 * const existing = resolvePattern("custom") // returns "custom"
 * ```
 */
export const resolveWithFallback = <T>(fallback: T) => (value: T | undefined): T =>
  pipe(O.fromNullable(value), O.getOrElse(() => fallback))
