/**
 * Shared types for workflow modules
 */

import type { ParseError } from "effect/ParseResult"
import type { CancelledError } from "../../../../../services/PromptService/index.js"

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error types that can occur during workflow completion.
 *
 * - CancelledError: User cancelled the operation (Ctrl+C)
 * - ParseError: Schema validation failed
 */
export type WorkflowCompletionError = CancelledError | ParseError
