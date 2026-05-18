import OpenAI from "openai"

const DEFAULT_TEMPERATURE = 0.7

function createMissingKeyStream(providerName, envKey) {
  const encoder = new TextEncoder()

  return new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`\n\nProvider ${providerName} is missing ${envKey}.`)
      )
      controller.close()
    },
  })
}

export function createOpenAICompatibleProvider({
  name,
  apiKey,
  envKey,
  baseURL,
  defaultHeaders,
}) {
  const client = apiKey
    ? new OpenAI({
        apiKey,
        baseURL,
        defaultHeaders,
      })
    : null

  return {
    name,
    isConfigured: Boolean(apiKey),

    async stream({ prompt, model, temperature = DEFAULT_TEMPERATURE }) {
      if (!client) {
        return createMissingKeyStream(name, envKey)
      }

      const encoder = new TextEncoder()
      const stream = await client.chat.completions.create({
        model,
        stream: true,
        temperature,
        messages: [{ role: "user", content: prompt }],
      })

      return new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const text = chunk.choices?.[0]?.delta?.content
              if (text) controller.enqueue(encoder.encode(text))
            }
          } catch {
            controller.enqueue(encoder.encode(`\n\n${name} stream error.`))
          } finally {
            controller.close()
          }
        },
      })
    },
  }
}
