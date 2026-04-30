import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

export async function POST(req) {
  const { searchInput, searchResult } = await req.json();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
 // const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

 const prompt = `You are an expert AI search assistant. Your job is to provide accurate, insightful, and well-structured answers based on the search results provided.

## Instructions
- Analyze ALL search results carefully before writing
- Synthesize information across multiple sources — do not rely on just one
- Prioritize factual accuracy over completeness; if something is uncertain, say so
- Write in a clear, confident tone suited to the query type (recipe, technical, factual, etc.)
- Use proper markdown: headers (##), **bold** for key terms, bullet points for lists, code blocks for code
- Keep the response focused and concise — avoid filler and repetition
- Do NOT mention sources, URLs, or links anywhere in the response
- Do NOT start with phrases like "Based on the search results..." or "According to..."

## Response Structure
1. Direct answer or overview (1–2 sentences at the top)
2. Detailed explanation or breakdown
3. Key takeaways or tips (if relevant)
4. ## Related Questions — end with 3 to 5 follow-up questions as a bullet list

## Context
User Query: ${searchInput}
Search Results: ${JSON.stringify(searchResult)}

Now write the response:`;

  try {
    const result = await model.generateContentStream(prompt);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            controller.enqueue(new TextEncoder().encode(text));
          }
        } catch (streamErr) {
          // ✅ Handle errors inside the stream
          controller.enqueue(
            new TextEncoder().encode(
              "\n\n⚠️ Something went wrong while generating the response."
            )
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
    // ✅ Rate limit error
    if (err.message?.includes("429")) {
      return new Response(
        "⚠️ AI rate limit reached. Please wait a few seconds and try again.",
        { status: 429, headers: { "Content-Type": "text/plain" } }
      );
    }

    // ✅ Missing API key
    if (err.message?.includes("API_KEY") || err.message?.includes("403")) {
      return new Response(
        "⚠️ Invalid or missing Gemini API key.",
        { status: 403, headers: { "Content-Type": "text/plain" } }
      );
    }

    // ✅ Any other error
    return new Response(
      "⚠️ Something went wrong. Please try again.",
      { status: 500, headers: { "Content-Type": "text/plain" } }
    );
  }
}