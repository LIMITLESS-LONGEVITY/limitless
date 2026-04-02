import type { PayloadRequest } from 'payload'
import { estimateCost } from './models'

/**
 * Maps feature identifiers (used in ai-usage logs) to model registry use case keys.
 * Feature names are extensible strings; use case keys match MODEL_REGISTRY.
 */
const FEATURE_TO_USE_CASE: Record<string, string> = {
  'tutor-chat': 'tutor',
  'quiz-generate': 'quizGeneration',
  'quiz-save': 'quizGeneration',
}

export interface UsageLogEntry {
  feature: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  contextCollection?: string
  contextId?: string
  refused?: boolean
  durationMs?: number
}

/**
 * Log an AI usage event to the ai-usage collection.
 * Runs fire-and-forget — does not block the AI response.
 * Falls back silently on error (usage logging should never break AI features).
 */
export async function logUsage(req: PayloadRequest, entry: UsageLogEntry): Promise<void> {
  try {
    const useCase = FEATURE_TO_USE_CASE[entry.feature] ?? entry.feature
    const cost = estimateCost(useCase, entry.inputTokens, entry.outputTokens)

    // Fire-and-forget — do not await in the calling endpoint
    req.payload.create({
      collection: 'ai-usage',
      data: {
        user: req.user?.id,
        feature: entry.feature,
        provider: entry.provider,
        model: entry.model,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        estimatedCost: cost,
        contextCollection: entry.contextCollection,
        contextId: entry.contextId,
        refused: entry.refused ?? false,
        durationMs: entry.durationMs,
      },
      req,
    }).catch((err) => {
      console.error('[AI Usage Logger] Failed to log usage:', err.message)
    })
  } catch (err) {
    console.error('[AI Usage Logger] Error preparing usage log:', (err as Error).message)
  }
}
