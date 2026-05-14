import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * @param {string} prompt
 * @param {string} providerModelId  e.g. "claude-sonnet-4-20250514"
 * @returns {Promise<ReadableStream>}
 */
export async function streamAnthropic(prompt, providerModelId) {
  const enc = new TextEncoder()

  // SDK returns a stream helper — we pipe it into a plain ReadableStream
  const sdkStream = await client.messages.stream({
    model: providerModelId,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  })

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of sdkStream) {
          // SDK emits typed events — we only want text deltas
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(enc.encode(chunk.delta.text))
          }
        }
      } catch {
        controller.enqueue(enc.encode("\n\n⚠️ Anthropic stream error."))
      } finally {
        controller.close()
      }
    },
  })
}