import {
  DEFAULT_MODEL_ID,
  INTENT_DEFAULTS,
  MODEL_MAP,
  PROVIDERS,
} from "./models"
import { agentRouterProvider } from "./providers/agentrouter"
import { cerebrasProvider } from "./providers/cerebras"
import { geminiProvider } from "./providers/google"
import { groqProvider } from "./providers/groq"
import { nvidiaProvider } from "./providers/nvidia"
import { openAIProvider } from "./providers/openai"
import { openRouterProvider } from "./providers/openrouter"

export const providerRegistry = {
  [PROVIDERS.GROQ]: groqProvider,
  [PROVIDERS.CEREBRAS]: cerebrasProvider,
  [PROVIDERS.NVIDIA]: nvidiaProvider,
  [PROVIDERS.OPENROUTER]: openRouterProvider,
  [PROVIDERS.AGENTROUTER]: agentRouterProvider,
  [PROVIDERS.GEMINI]: geminiProvider,
  [PROVIDERS.OPENAI]: openAIProvider,
}

function resolveModel(modelId, intent) {
  const resolvedId =
    modelId ??
    (intent ? INTENT_DEFAULTS[intent] : null) ??
    DEFAULT_MODEL_ID

  const modelConfig = MODEL_MAP[resolvedId]

  if (!modelConfig) {
    throw new Error(`Unknown model id: "${resolvedId}"`)
  }

  return modelConfig
}

/**
 * Streams a completion from the selected model.
 *
 * Step 2 keeps this intentionally as direct dispatch. Retries, fallback,
 * timeout handling, health checks, and weighted routing are added in Step 3.
 *
 * @param {string} prompt
 * @param {string} [modelId]
 * @param {string} [intent]
 * @returns {Promise<ReadableStream>}
 */
export async function streamCompletion(prompt, modelId, intent) {
  const modelConfig = resolveModel(modelId, intent)
  const provider = providerRegistry[modelConfig.provider]

  if (!provider) {
    throw new Error(`No provider registered for: "${modelConfig.provider}"`)
  }

  return provider.stream({
    prompt,
    model: modelConfig.providerModel,
  })
}
