import { NextResponse } from "next/server";

const PROVIDERS = {
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1/chat/completions",
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1/chat/completions",
  },
  cerebras: {
    apiKey: process.env.CEREBRAS_API_KEY,
    baseURL: "https://api.cerebras.ai/v1/chat/completions",
  },
  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: "https://integrate.api.nvidia.com/v1/chat/completions",
  },
  agentrouter: {
    apiKey: process.env.AGENTROUTER_API_KEY,
    baseURL: `${process.env.AGENTROUTER_BASE_URL ?? "https://api.agentrouter.org/v1"}/chat/completions`,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
};

// ─── Safe JSON parser: handles HTML error pages from providers ────────────────
async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // Provider returned non-JSON (e.g. Cloudflare HTML block page)
    const preview = text.slice(0, 120).replace(/\s+/g, " ").trim();
    throw new Error(
      `Provider returned non-JSON (HTTP ${res.status}): ${preview}…`
    );
  }
}

// ─── Fetch that preserves POST body across 307/308 redirects ─────────────────
async function fetchWithRedirect(url, options, maxRedirects = 3) {
  let currentUrl = url;
  for (let i = 0; i <= maxRedirects; i++) {
    const res = await fetch(currentUrl, { ...options, redirect: "manual" });
    if (res.status === 307 || res.status === 308) {
      const location = res.headers.get("location");
      if (!location) throw new Error(`${res.status} redirect with no Location header`);
      // Resolve relative URLs
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }
    return res;
  }
  throw new Error(`Too many redirects (>${maxRedirects})`);
}

export async function POST(req) {
  const { modelId, prompt, provider = "openrouter" } = await req.json();
  const providerConfig = PROVIDERS[provider];

  if (!providerConfig) {
    return NextResponse.json(
      { error: `Unknown provider: ${provider}` },
      { status: 400 },
    );
  }

  if (!providerConfig.apiKey) {
    return NextResponse.json(
      { error: `Missing API key for provider: ${provider}` },
      { status: 400 },
    );
  }

  try {
    if (provider === "gemini") {
      const res = await fetchWithRedirect(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${providerConfig.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(45_000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
          }),
        },
      );

      const data = await safeJson(res);
      const text = data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter(Boolean)
        .join("") ?? "";

      return NextResponse.json(
        {
          ...data,
          choices: [{ message: { content: text } }],
        },
        { status: res.status },
      );
    }

    const res = await fetchWithRedirect(providerConfig.baseURL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${providerConfig.apiKey}`,
        "Content-Type": "application/json",
        ...(provider === "openrouter"
          ? {
              "HTTP-Referer": process.env.SITE_URL ?? "http://localhost:3000",
              "X-Title": process.env.SITE_NAME ?? "AI Search App",
            }
          : {}),
      },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: modelId,
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err?.name === "TimeoutError" ? "Request timed out after 45s" : err.message },
      { status: 504 },
    );
  }
}
