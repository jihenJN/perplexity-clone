import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

// Only keep what the model actually needs — cuts input tokens ~60%
function compactResults(results) {
  return results
    .slice(0, 5)
    .map(({ title, description }, i) =>
      `[${i + 1}] ${title}: ${description ?? ""}`.trim()
    )
    .join("\n");
}

export async function POST(req) {
  const { searchInput, searchResult } = await req.json();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      thinkingConfig: {
        thinkingBudget: 0, // ✅ disables thinking — not needed for summarization
      },
      temperature: 0.7,
    },
  });

  const prompt = `You are an expert AI search assistant. Answer the query using ALL search results provided.

## Rules
- Synthesize across ALL sources — do not rely on just one
- Match tone and format to the query type (recipe, technical, factual, news, etc.)
- Use ## headers (not ###), **bold** key terms, bullet points, code blocks where needed
- Limit examples to 5–7 max — never exhaustively list items
- Be concise — no filler, no repetition, aim for 200–300 words
- Never mention sources, URLs, or links
- Never start with "Based on..." or "According to..."

## Structure
1. One clear direct answer (1–2 sentences)
2. ## [Relevant Header] — detailed breakdown
3. ## Key Takeaways — only if tips genuinely add value
4. ## Related Questions — ALWAYS include exactly 4 follow-up questions as bullets

Query: ${searchInput}
Results:
${compactResults(searchResult)}`;

  try {
    const result = await model.generateContentStream(prompt);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            controller.enqueue(new TextEncoder().encode(chunk.text()));
          }
        } catch {
          controller.enqueue(
            new TextEncoder().encode("\n\n⚠️ Error while generating response.")
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });

  } catch (err) {
    const msg = err.message ?? "";
    if (msg.includes("429"))
      return new Response("⚠️ Rate limit reached. Wait a moment and retry.", { status: 429 });
    if (msg.includes("API_KEY") || msg.includes("403"))
      return new Response("⚠️ Invalid or missing Gemini API key.", { status: 403 });
    return new Response("⚠️ Something went wrong. Please try again.", { status: 500 });
  }
}