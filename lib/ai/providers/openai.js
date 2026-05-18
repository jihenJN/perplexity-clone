import { createOpenAICompatibleProvider } from "./openai-compatible"

export const openAIProvider = createOpenAICompatibleProvider({
  name: "OpenAI",
  apiKey: process.env.OPENAI_API_KEY,
  envKey: "OPENAI_API_KEY",
})

export async function streamOpenAI(prompt, providerModelId) {
  return openAIProvider.stream({ prompt, model: providerModelId })
}
