import { GoogleGenerativeAI } from "@google/generative-ai"

const apiKey = process.env.GEMINI_API_KEY
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

function createMissingKeyStream() {
  const encoder = new TextEncoder()

  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("\n\nProvider Gemini is missing GEMINI_API_KEY."))
      controller.close()
    },
  })
}

export const geminiProvider = {
  name: "Gemini",
  isConfigured: Boolean(apiKey),

  async stream({ prompt, model, temperature = 0.7 }) {
    if (!genAI) return createMissingKeyStream()

    const generativeModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        thinkingConfig: { thinkingBudget: 0 },
        temperature,
      },
    })

    const result = await generativeModel.generateContentStream(prompt)
    const encoder = new TextEncoder()

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            controller.enqueue(encoder.encode(chunk.text()))
          }
        } catch {
          controller.enqueue(encoder.encode("\n\nGemini stream error."))
        } finally {
          controller.close()
        }
      },
    })
  },
}

export async function streamGoogle(prompt, providerModelId) {
  return geminiProvider.stream({ prompt, model: providerModelId })
}
