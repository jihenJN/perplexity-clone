import { NextResponse } from "next/server";

// ─── Provider API configurations ─────────────────────────────────────────────
const PROVIDER_CONFIGS = {
  groq: {
    url: "https://api.groq.com/openai/v1/models",
    apiKey: () => process.env.GROQ_API_KEY,
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  cerebras: {
    url: "https://api.cerebras.ai/v1/models",
    apiKey: () => process.env.CEREBRAS_API_KEY,
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/models",
    apiKey: () => process.env.GEMINI_API_KEY,
    headers: () => ({}),
    // API key passed as query param for Gemini
    buildUrl: (key) =>
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`,
  },
  nvidia: {
    url: "https://integrate.api.nvidia.com/v1/models",
    apiKey: () => process.env.NVIDIA_API_KEY,
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  openrouter: {
    url: "https://openrouter.ai/api/v1/models",
    apiKey: () => process.env.OPENROUTER_API_KEY,
    // OpenRouter model listing doesn't require auth
    headers: () => ({}),
  },
};

// ─── Helper: make a pretty label from a model id ─────────────────────────────
function prettifyModelId(id) {
  // Strip provider prefixes like "meta/", "nvidia/", "openai/" etc.
  let name = id.replace(/^[^/]+\//, "");
  // Strip suffixes like ":free"
  name = name.replace(/:free$/, "");
  // Replace hyphens/underscores with spaces, then title-case
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(It|Instruct)\b/gi, (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase());
}

// ─── Helper: format context length ───────────────────────────────────────────
function formatCtx(tokens) {
  if (!tokens || tokens <= 0) return "—";
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return `${tokens}`;
}

// ─── Groq: all models returned are free-tier ─────────────────────────────────
async function fetchGroqModels() {
  const config = PROVIDER_CONFIGS.groq;
  const key = config.apiKey();
  if (!key) return [];

  const res = await fetch(config.url, {
    headers: { ...config.headers(key), Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return [];

  const data = await res.json();
  const models = data?.data ?? [];

  return models
    .filter((m) => m.active !== false)
    .map((m) => ({
      provider: "groq",
      id: m.id,
      label: prettifyModelId(m.id),
      ctx: formatCtx(m.context_window),
      rpd: "1K",
    }));
}

// ─── Cerebras: all listed models are free-tier ───────────────────────────────
async function fetchCerebrasModels() {
  const config = PROVIDER_CONFIGS.cerebras;
  const key = config.apiKey();
  if (!key) return [];

  const res = await fetch(config.url, {
    headers: { ...config.headers(key), Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return [];

  const data = await res.json();
  const models = data?.data ?? [];

  return models.map((m) => ({
    provider: "cerebras",
    id: m.id,
    label: prettifyModelId(m.id),
    ctx: formatCtx(m.context_window ?? 8192),
    rpd: "~1M tok",
  }));
}

// ─── Gemini: filter for models that support generateContent ──────────────────
async function fetchGeminiModels() {
  const config = PROVIDER_CONFIGS.gemini;
  const key = config.apiKey();
  if (!key) return [];

  const url = config.buildUrl(key);
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return [];

  const data = await res.json();
  const models = data?.models ?? [];

  return models
    .filter(
      (m) =>
        m.supportedGenerationMethods?.includes("generateContent") &&
        // Only include free-tier worthy models (gemini main models)
        m.name?.startsWith("models/gemini")
    )
    .map((m) => {
      const id = m.name.replace("models/", "");
      return {
        provider: "gemini",
        id,
        label: m.displayName || prettifyModelId(id),
        ctx: formatCtx(m.inputTokenLimit),
        rpd: "varies",
      };
    });
}

// ─── NVIDIA: all models on integrate.api.nvidia.com are credits-based free ───
async function fetchNvidiaModels() {
  const config = PROVIDER_CONFIGS.nvidia;
  const key = config.apiKey();
  if (!key) return [];

  const res = await fetch(config.url, {
    headers: { ...config.headers(key), Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return [];

  const data = await res.json();
  const models = data?.data ?? [];

  return models
    .filter((m) => {
      // Only include chat/completion models (skip embedding, vlm, etc. unless they support chat)
      const id = m.id?.toLowerCase() ?? "";
      return !id.includes("embed") && !id.includes("rerank");
    })
    .map((m) => ({
      provider: "nvidia",
      id: m.id,
      label: prettifyModelId(m.id),
      ctx: formatCtx(m.context_window ?? m.max_model_len),
      rpd: "credits",
    }));
}

// ─── OpenRouter: filter for :free pricing models ─────────────────────────────
async function fetchOpenRouterModels() {
  const config = PROVIDER_CONFIGS.openrouter;

  const res = await fetch(config.url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return [];

  const data = await res.json();
  const models = data?.data ?? [];

  const freeModels = models.filter((m) => {
    const pricing = m.pricing;
    return pricing && pricing.prompt === "0" && pricing.completion === "0";
  });

  return [
    ...freeModels.map((m) => ({
      provider: "openrouter",
      id: m.id,
      label: m.name || prettifyModelId(m.id),
      ctx: formatCtx(m.context_length),
      rpd: "200",
    })),
    // Always include the free auto-router
    {
      provider: "openrouter",
      id: "openrouter/free",
      label: "Free Auto-Router",
      ctx: "varies",
      rpd: "200",
    },
  ];
}

// ─── Agent Router: static entry (no listing API) ─────────────────────────────
function getAgentRouterModels() {
  return [
    {
      provider: "agentrouter",
      id: "auto",
      label: "Auto Router",
      ctx: "—",
      rpd: "—",
    },
  ];
}

// ─── Main handler ────────────────────────────────────────────────────────────
export async function GET() {
  const fetchers = {
    groq: fetchGroqModels,
    cerebras: fetchCerebrasModels,
    gemini: fetchGeminiModels,
    nvidia: fetchNvidiaModels,
    openrouter: fetchOpenRouterModels,
    agentrouter: async () => getAgentRouterModels(),
  };

  const providerOrder = Object.keys(fetchers);
  const results = await Promise.allSettled(
    providerOrder.map((p) => fetchers[p]())
  );

  const models = [];
  const errors = {};

  providerOrder.forEach((provider, idx) => {
    const result = results[idx];
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      // Deduplicate by id within each provider
      const seen = new Set();
      for (const m of result.value) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          models.push(m);
        }
      }
    } else {
      errors[provider] = result.reason?.message ?? "Failed to fetch";
    }
  });

  return NextResponse.json(
    { models, errors, fetchedAt: new Date().toISOString() },
    {
      status: 200,
      headers: {
        // Cache for 5 minutes to avoid hammering provider APIs
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
