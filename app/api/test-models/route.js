import { NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const models = [
  { id: "deepseek/deepseek-v4-flash:free",                      label: "DeepSeek V4 Flash" },
  { id: "google/gemma-4-31b-it:free",                           label: "Gemma 4 31B" },
  { id: "meta-llama/llama-3.3-70b-instruct:free",               label: "Llama 3.3 70B" },
  { id: "qwen/qwen3-coder:free",                                 label: "Qwen3 Coder 480B" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free",                label: "Nemotron 3 Super 120B" },
  { id: "openai/gpt-oss-120b:free",                              label: "GPT OSS 120B" },
  { id: "openai/gpt-oss-20b:free",                              label: "GPT OSS 20B" },
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",    label: "Nemotron Nano Omni 30B" },
  { id: "minimax/minimax-m2.5:free",                             label: "MiniMax M2.5" },
  { id: "arcee-ai/trinity-large-thinking:free",                  label: "Trinity Large Thinking" },
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

async function testModel(model) {
  const start = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.id,
        max_tokens: 200,
        messages: [{ role: "user", content: TEST_PROMPT }],
      }),
    });

    const data = await res.json();
    const elapsed = Date.now() - start;

    if (!res.ok) {
      return {
        label: model.label,
        id: model.id,
        status: "error",
        httpStatus: res.status,
        error: data?.error?.message ?? "Unknown error",
        ms: elapsed,
      };
    }

    return {
      label: model.label,
      id: model.id,
      status: "ok",
      httpStatus: res.status,
      response: data.choices?.[0]?.message?.content ?? "(empty)",
      ms: elapsed,
    };
  } catch (err) {
    return {
      label: model.label,
      id: model.id,
      status: "error",
      httpStatus: 0,
      error: err.message,
      ms: Date.now() - start,
    };
  }
}

export async function GET() {
  const results = await Promise.allSettled(models.map(testModel));

  const output = results.map((r) =>
    r.status === "fulfilled" ? r.value : { status: "error", error: "Promise rejected" }
  );

  return NextResponse.json(output, { status: 200 });
}