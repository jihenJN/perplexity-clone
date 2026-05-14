
import OpenAI from "openai"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * @param {string} prompt
 * @param {string} providerModelId  e.g. "gpt-5"
 * @returns {Promise<ReadableStream>}
 */
export async function streamOpenAI(prompt, providerModelId) {
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
          if (text) controller.enqueue(enc.encode(text))
        }
      } catch {
        controller.enqueue(enc.encode("\n\n⚠️ OpenAI stream error."))
      } finally {
        controller.close()
      }
    },
  })
}