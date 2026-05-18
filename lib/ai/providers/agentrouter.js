import { createOpenAICompatibleProvider } from "./openai-compatible"

export const agentRouterProvider = createOpenAICompatibleProvider({
  name: "AgentRouter",
  apiKey: process.env.AGENTROUTER_API_KEY,
  envKey: "AGENTROUTER_API_KEY",
  baseURL: process.env.AGENTROUTER_BASE_URL ?? "https://api.agentrouter.org/v1",
})

export async function streamAgentRouter(prompt, providerModelId) {
  return agentRouterProvider.stream({ prompt, model: providerModelId })
}
