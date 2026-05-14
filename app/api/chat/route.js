import { streamCompletion } from "@/lib/ai/gateway"

export const runtime = "edge"

// Trim search results to reduce input tokens
function compactResults(results = []) {
  return results
    .slice(0, 5)
    .map(({ title, description }, i) =>
      `[${i + 1}] ${title}: ${(description ?? "").trim()}`
    )
    .join("\n")
}

function buildPrompt(searchInput, searchResult) {
  return `You are an expert AI search assistant. Answer the query using ALL search results provided.

## Rules
- Synthesize across ALL sources — do not rely on just one
- Match tone and format to the query type
- Use ## headers, **bold** key terms, bullet points, code blocks where needed
- Be concise — aim for 200–300 words
- Never mention sources, URLs, or links
- Never start with "Based on..." or "According to..."

## Structure
1. One clear direct answer (1–2 sentences)
2. ## [Relevant Header] — detailed breakdown
3. ## Key Takeaways — only if tips genuinely add value
4. ## Related Questions — ALWAYS include exactly 4 follow-up questions as bullets

Query: ${searchInput}
Results:
${compactResults(searchResult)}`
}

export async function POST(req) {
  const {
    searchInput,
    searchResult,
    modelId,   // e.g. "claude-sonnet-4"  — sent from the frontend
    intent,    // e.g. "quality" | "speed" | "cost" — optional smart routing
  } = await req.json()

  if (!searchInput?.trim()) {
    return new Response("⚠️ searchInput is required.", { status: 400 })
  }

  const prompt = buildPrompt(searchInput, searchResult ?? [])

  try {
    const stream = await streamCompletion(prompt, modelId, intent)

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (err) {
    const msg = err?.message ?? ""
    console.error("[/api/chat]", msg)

    if (msg.includes("429"))
      return new Response("⚠️ Rate limit reached. Please wait and retry.", { status: 429 })
    if (msg.includes("401") || msg.includes("403") || msg.includes("API_KEY"))
      return new Response("⚠️ Invalid or missing API key.", { status: 403 })

    return new Response("⚠️ Something went wrong. Please try again.", { status: 500 })
  }
}