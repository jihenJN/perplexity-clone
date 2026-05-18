import { createOpenAICompatibleProvider } from "./openai-compatible"

export const groqProvider = createOpenAICompatibleProvider({
  name: "Groq",
  apiKey: process.env.GROQ_API_KEY,
  envKey: "GROQ_API_KEY",
  baseURL: "https://api.groq.com/openai/v1",
})

export async function streamGroq(prompt, providerModelId) {
  return groqProvider.stream({ prompt, model: providerModelId })
}
