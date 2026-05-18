import { createOpenAICompatibleProvider } from "./openai-compatible"

export const nvidiaProvider = createOpenAICompatibleProvider({
  name: "NVIDIA NIM",
  apiKey: process.env.NVIDIA_API_KEY,
  envKey: "NVIDIA_API_KEY",
  baseURL: "https://integrate.api.nvidia.com/v1",
})

export async function streamNvidia(prompt, providerModelId) {
  return nvidiaProvider.stream({ prompt, model: providerModelId })
}
