import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

/**
 * @param {string} prompt
 * @param {string} providerModelId  e.g. "gemini-2.5-flash-latest"
 * @returns {Promise<ReadableStream>}
 */
export async function streamGoogle(prompt, providerModelId) {
  const model = genAI.getGenerativeModel({
    model: providerModelId,
    generationConfig: {
      thinkingConfig: { thinkingBudget: 0 },
      temperature: 0.7,
    },
  })

  const result = await model.generateContentStream(prompt)

  return new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      try {
        for await (const chunk of result.stream) {
          controller.enqueue(enc.encode(chunk.text()))
        }
      } catch {
        controller.enqueue(enc.encode("\n\n⚠️ Gemini stream error."))
      } finally {
        controller.close()
      }
    },
  })
}