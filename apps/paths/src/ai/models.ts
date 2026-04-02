export interface ModelConfig {
  provider: string
  model: string
  maxOutputTokens: number
  costPerInputToken: number
  costPerOutputToken: number
}

export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  tutor: {
    provider: 'default',
    model: 'openai/gpt-4o-mini',
    maxOutputTokens: 1024,
    costPerInputToken: 0.00000015,
    costPerOutputToken: 0.0000006,
  },
  quizGeneration: {
    provider: 'default',
    model: 'openai/gpt-4o-mini',
    maxOutputTokens: 2048,
    costPerInputToken: 0.00000015,
    costPerOutputToken: 0.0000006,
  },
  discover: {
    provider: 'default',
    model: 'openai/gpt-4o-mini',
    maxOutputTokens: 1024,
    costPerInputToken: 0.00000015,
    costPerOutputToken: 0.0000006,
  },
  actionPlan: {
    provider: 'default',
    model: 'openai/gpt-4o-mini',
    maxOutputTokens: 4096,
    costPerInputToken: 0.00000015,
    costPerOutputToken: 0.0000006,
  },
  dailyProtocol: {
    provider: 'default',
    model: 'openai/gpt-4o-mini',
    maxOutputTokens: 2048,
    costPerInputToken: 0.00000015,
    costPerOutputToken: 0.0000006,
  },
}

export function getModelConfig(useCase: string): ModelConfig {
  const config = MODEL_REGISTRY[useCase]
  if (!config) {
    throw new Error(`No model configured for use case "${useCase}"`)
  }
  return config
}

export function estimateCost(useCase: string, inputTokens: number, outputTokens: number): number {
  const config = getModelConfig(useCase)
  return inputTokens * config.costPerInputToken + outputTokens * config.costPerOutputToken
}
