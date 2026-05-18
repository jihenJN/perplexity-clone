import { createOpenAICompatibleProvider } from "./openai-compatible"

export const cerebrasProvider = createOpenAICompatibleProvider({
  name: "Cerebras",
  apiKey: process.env.CEREBRAS_API_KEY,
  envKey: "CEREBRAS_API_KEY",
  baseURL: "https://api.cerebras.ai/v1",
})

export async function streamCerebras(prompt, providerModelId) {
  return cerebrasProvider.stream({ prompt, model: providerModelId })
}
