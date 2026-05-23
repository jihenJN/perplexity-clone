import { createOpenAICompatibleProvider } from "./openai-compatible"

export const mistralProvider = createOpenAICompatibleProvider({
  name: "Mistral",
  apiKey: process.env.MISTRAL_API_KEY,
  envKey: "MISTRAL_API_KEY",
  baseURL: "https://api.mistral.ai/v1",
})

export async function streamMistral(prompt, providerModelId) {
  return mistralProvider.stream({ prompt, model: providerModelId })
}