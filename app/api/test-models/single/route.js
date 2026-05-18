import { NextResponse } from "next/server";

export async function POST(req) {
  const { modelId, prompt } = await req.json();

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}