/**
 * POST /api/test-models/single
 * Body: { provider, modelId, prompt }
 *
 * Dispatches to the correct provider API and normalises the response
 * into { choices: [{ message: { content } }] } for all providers.
 */

import { NextResponse } from "next/server";

const TIMEOUT_MS = 45_000;

// ─── Provider registry ────────────────────────────────────────────────────────

const PROVIDERS = {
  groq:        { type: "openai", base: "https://api.groq.com/openai/v1/chat/completions",              key: () => process.env.GROQ_API_KEY },
  cerebras:    { type: "openai", base: "https://api.cerebras.ai/v1/chat/completions",                   key: () => process.env.CEREBRAS_API_KEY },
  nvidia:      { type: "openai", base: "https://integrate.api.nvidia.com/v1/chat/completions",          key: () => process.env.NVIDIA_API_KEY },
  openrouter:  { type: "openai", base: "https://openrouter.ai/api/v1/chat/completions",                 key: () => process.env.OPENROUTER_API_KEY, extraHeaders: () => ({ "HTTP-Referer": process.env.SITE_URL ?? "http://localhost:3000", "X-Title": process.env.SITE_NAME ?? "AI Search App" }) },
  agentrouter: { type: "openai", base: `${process.env.AGENTROUTER_BASE_URL ?? "https://api.agentrouter.org/v1"}/chat/completions`, key: () => process.env.AGENTROUTER_API_KEY },
  gemini:      { type: "gemini", key: () => process.env.GEMINI_API_KEY },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Follows 307/308 redirects while preserving POST body. */
async function fetchWithRedirect(url, options, maxRedirects = 3) {
  let current = url;
  for (let i = 0; i <= maxRedirects; i++) {
    const res = await fetch(current, { ...options, redirect: "manual" });
    if (res.status === 307 || res.status === 308) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error(`${res.status} redirect with no Location`);
      current = new URL(loc, current).href;
      continue;
    }
    return res;
  }
  throw new Error("Too many redirects");
}

/** Parses body as text, then JSON — surfaces provider HTML error pages cleanly. */
async function safeJson(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`Non-JSON response (HTTP ${res.status}): ${text.slice(0, 120).replace(/\s+/g, " ").trim()}…`); }
}

const signal = () => AbortSignal.timeout(TIMEOUT_MS);

// ─── Dispatch strategies ──────────────────────────────────────────────────────

async function callOpenAI({ base, key, extraHeaders }, modelId, prompt) {
  const res = await fetchWithRedirect(base, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json", ...extraHeaders?.() },
    signal: signal(),
    body: JSON.stringify({ model: modelId, max_tokens: 800, messages: [{ role: "user", content: prompt }] }),
  });
  return safeJson(res);   // already in OpenAI shape
}

async function callGemini({ key }, modelId, prompt) {
  const res = await fetchWithRedirect(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: signal(),
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 800, temperature: 0.7 } }),
    }
  );
  const data = await safeJson(res);
  // Normalise to OpenAI shape
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("") ?? "";
  return { ...data, choices: [{ message: { content: text } }] };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req) {
  const { provider, modelId, prompt } = await req.json();
  const config = PROVIDERS[provider];

  if (!config) return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });

  const key = config.key();
  if (!key) return NextResponse.json({ error: `Missing API key for: ${provider}` }, { status: 400 });

  try {
    const data = config.type === "gemini"
      ? await callGemini(config, modelId, prompt)
      : await callOpenAI(config, modelId, prompt);

    return NextResponse.json(data);
  } catch (err) {
    const isTimeout = err?.name === "TimeoutError";
    return NextResponse.json(
      { error: isTimeout ? `Timed out after ${TIMEOUT_MS / 1000}s` : err.message },
      { status: isTimeout ? 504 : 502 }
    );
  }
}