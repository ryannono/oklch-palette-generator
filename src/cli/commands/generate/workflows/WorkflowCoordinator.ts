/**
 * WorkflowCoordinator - Effect.Service for orchestrating CLI workflows.
 *
 * Provides a centralized service for workflow operations like completing partial inputs,
 * validating inputs, and routing to executors.
 */

import { Effect } from "effect"
import type { ParseError } from "effect/ParseResult"
import { CancelledError, PromptService } from "../../../../services/PromptService/index.js"
import type { SinglePaletteComplete, SinglePalettePartial } from "../inputSpecs/singlePalette.input.js"
import { completeSinglePaletteInput } from "./singlePalette.workflow.js"

// ============================================================================
// Service
// ============================================================================

/**
 * WorkflowCoordinator service using Effect.Service pattern.
 *
 * Responsible for completing partial inputs into validated complete inputs.
 * Each mode has a corresponding completion method.
 */
export class WorkflowCoordinator extends Effect.Service<WorkflowCoordinator>()(
  "WorkflowCoordinator",
  {
    effect: Effect.succeed({
      /**
       * Complete a partial SinglePalette input by prompting for missing fields.
       */
      completeSinglePalette: (
        partial: SinglePalettePartial,
        pattern: string
      ): Effect.Effect<SinglePaletteComplete, CancelledError | ParseError, PromptService> =>
        completeSinglePaletteInput(partial, pattern)
    })
  }
) {}
