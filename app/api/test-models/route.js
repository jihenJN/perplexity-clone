import { NextResponse } from "next/server";

const MODELS = [
  { provider: "groq", id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
  { provider: "groq", id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
  { provider: "cerebras", id: "llama3.1-8b", label: "Llama 3.1 8B" },
  { provider: "cerebras", id: "gpt-oss-120b", label: "GPT OSS 120B" },
  { provider: "cerebras", id: "qwen-3-235b-a22b-instruct-2507", label: "Qwen 3 235B Preview" },
  { provider: "nvidia", id: "nvidia/llama-3.1-nemotron-70b-instruct", label: "Nemotron 70B" },
  { provider: "nvidia", id: "meta/llama-3.1-8b-instruct", label: "Llama 3.1 8B" },
  { provider: "agentrouter", id: "auto", label: "Auto Router" },
  { provider: "openrouter", id: "deepseek/deepseek-v4-flash:free", label: "DeepSeek V4 Flash" },
  { provider: "openrouter", id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B" },
  { provider: "openrouter", id: "qwen/qwen3-coder:free", label: "Qwen3 Coder 480B" },
  { provider: "openrouter", id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super 120B" },
  { provider: "openrouter", id: "openai/gpt-oss-120b:free", label: "GPT OSS 120B" },
  { provider: "openrouter", id: "openai/gpt-oss-20b:free", label: "GPT OSS 20B" },
  { provider: "openrouter", id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B" },
  { provider: "openrouter", id: "openrouter/free", label: "OpenRouter Free Router" },
  { provider: "gemini", id: "gemini-flash-lite-latest", label: "Flash Lite" },
  { provider: "gemini", id: "gemini-flash-latest", label: "Flash" },
];

const TEST_PROMPT = `You are given a broken JavaScript function:

\`\`\`js
function fetchData(url) {
  let result;
  fetch(url).then(res => res.json()).then(data => {
    result = data;
  });
  return result;
}
\`\`\`

Do the following:
1. Explain why this function is broken
2. Fix it
3. Add error handling
4. Give one real-world use case for it

Be concise and clear.`;

async function testModel(model, origin) {
  const start = Date.now();

  try {
    const res = await fetch(`${origin}/api/test-models/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(50_000),
      body: JSON.stringify({
        provider: model.provider,
        modelId: model.id,
        prompt: TEST_PROMPT,
      }),
    });

    const data = await res.json();
    const response = data?.choices?.[0]?.message?.content ?? "";

    return {
      ...model,
      status: res.ok && response ? "ok" : "error",
      httpStatus: res.status,
      response,
      error: res.ok ? undefined : data?.error?.message ?? data?.error ?? "Unknown error",
      ms: Date.now() - start,
    };
  } catch (err) {
    return {
      ...model,
      status: "error",
      httpStatus: 0,
      error: err?.name === "TimeoutError" ? "Request timed out after 50s" : err.message,
      ms: Date.now() - start,
    };
  }
}

export async function GET(req) {
  const origin = new URL(req.url).origin;
  const results = await Promise.allSettled(MODELS.map((model) => testModel(model, origin)));

  const output = results.map((result) =>
    result.status === "fulfilled"
      ? result.value
      : { status: "error", error: "Promise rejected" },
  );

  return NextResponse.json(output, { status: 200 });
}
