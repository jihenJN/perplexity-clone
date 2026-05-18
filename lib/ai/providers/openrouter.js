import { createOpenAICompatibleProvider } from "./openai-compatible"

export const openRouterProvider = createOpenAICompatibleProvider({
  name: "OpenRouter",
  apiKey: process.env.OPENROUTER_API_KEY,
  envKey: "OPENROUTER_API_KEY",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.SITE_URL ?? "http://localhost:3000",
    "X-Title": process.env.SITE_NAME ?? "AI Search App",
  },
})

export async function streamOpenRouter(prompt, providerModelId) {
  return openRouterProvider.stream({ prompt, model: providerModelId })
}
