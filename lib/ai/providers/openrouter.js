
import OpenAI from "openai"

// OpenAI SDK works perfectly with OpenRouter's OpenAI-compatible endpoint
const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.SITE_URL ?? "http://localhost:3000",
    "X-Title": process.env.SITE_NAME ?? "AI Search App",
  },
})

/**
 * @param {string} prompt
 * @param {string} providerModelId  e.g. "moonshotai/kimi-k2"
 * @returns {Promise<ReadableStream>}
 */
export async function streamOpenRouter(prompt, providerModelId) {
  const enc = new TextEncoder()

  const stream = await client.chat.completions.create({
    model: providerModelId,
    stream: true,
    temperature: 0.7,
    messages: [{ role: "user", content: prompt }],
  })

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content
          if (text) {
            controller.enqueue(enc.encode(text))
          }
        }
      } catch {
        controller.enqueue(enc.encode("\n\n⚠️ OpenRouter stream error."))
      } finally {
        controller.close()
      }
    },
  })
}
