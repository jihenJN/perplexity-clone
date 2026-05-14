import { MODEL_MAP, INTENT_DEFAULTS, DEFAULT_MODEL_ID, PROVIDERS } from "./models"
import { streamGoogle }      from "./providers/google"
import { streamOpenAI }      from "./providers/openai"
import { streamOpenRouter }  from "./providers/openrouter"

const providerFns = {
  [PROVIDERS.GOOGLE]:     streamGoogle,
  [PROVIDERS.OPENAI]:     streamOpenAI,
  [PROVIDERS.OPENROUTER]: streamOpenRouter,
}

/**
 * @param {string} prompt          - the fully-built prompt string
 * @param {string} [modelId]       - key from MODELS[].id  e.g. "claude-sonnet-4"
 * @param {string} [intent]        - "quality" | "speed" | "cost" | "long-context"
 * @returns {Promise<ReadableStream>}
 */
export async function streamCompletion(prompt, modelId, intent) {
  // Resolve model: explicit id → intent default → global default
  const resolvedId =
    modelId ??
    (intent ? INTENT_DEFAULTS[intent] : null) ??
    DEFAULT_MODEL_ID

  const modelConfig = MODEL_MAP[resolvedId]

  if (!modelConfig) {
    throw new Error(`Unknown model id: "${resolvedId}"`)
  }

  const providerFn = providerFns[modelConfig.provider]

  if (!providerFn) {
    throw new Error(`No provider function for: "${modelConfig.provider}"`)
  }

  return providerFn(prompt, modelConfig.providerModel)
}