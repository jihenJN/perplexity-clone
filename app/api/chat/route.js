import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

export async function POST(req) {
  const { searchInput, searchResult } = await req.json();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
 // const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

  const prompt = `Depends on user input sources, Summarize and search about topic. Give a markdown text with proper formatting.
  
User Input: ${searchInput}
Search Results: ${JSON.stringify(searchResult)}`;

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