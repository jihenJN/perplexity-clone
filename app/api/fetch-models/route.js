/**
 * GET /api/fetch-models
 *
 * Fetches available free-tier models from each configured provider.
 * Returns { models, errors, fetchedAt }.
 * Cached 5 min at the edge, stale-while-revalidate 10 min.
 */

import { NextResponse } from "next/server";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function prettifyId(id) {
  return id
    .replace(/^[^/]+\//, "")   // strip "provider/" prefix
    .replace(/:free$/, "")      // strip ":free" suffix
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCtx(tokens) {
  if (!tokens || tokens <= 0) return "—";
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return `${tokens}`;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000), ...options });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Provider fetchers ────────────────────────────────────────────────────────

async function fetchGroq() {
  const key = process.env.GROQ_API_KEY;
  if (!key) return [];
  const { data = [] } = await fetchJson("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  return data
    .filter((m) => m.active !== false)
    .map((m) => ({ provider: "groq", id: m.id, label: prettifyId(m.id), ctx: formatCtx(m.context_window), rpd: "1K" }));
}

async function fetchCerebras() {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) return [];
  const { data = [] } = await fetchJson("https://api.cerebras.ai/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  return data.map((m) => ({ provider: "cerebras", id: m.id, label: prettifyId(m.id), ctx: formatCtx(m.context_window ?? 8192), rpd: "~1M tok" }));
}

async function fetchGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return [];
  const { models = [] } = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`
  );
  return models
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent") && m.name?.startsWith("models/gemini"))
    .map((m) => {
      const id = m.name.replace("models/", "");
      return { provider: "gemini", id, label: m.displayName || prettifyId(id), ctx: formatCtx(m.inputTokenLimit), rpd: "varies" };
    });
}

async function fetchNvidia() {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) return [];
  const { data = [] } = await fetchJson("https://integrate.api.nvidia.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  return data
    .filter((m) => !/(embed|rerank)/i.test(m.id ?? ""))
    .map((m) => ({ provider: "nvidia", id: m.id, label: prettifyId(m.id), ctx: formatCtx(m.context_window ?? m.max_model_len), rpd: "credits" }));
}

async function fetchOpenRouter() {
  const { data = [] } = await fetchJson("https://openrouter.ai/api/v1/models");
  const free = data.filter((m) => m.pricing?.prompt === "0" && m.pricing?.completion === "0");
  return [
    ...free.map((m) => ({ provider: "openrouter", id: m.id, label: m.name || prettifyId(m.id), ctx: formatCtx(m.context_length), rpd: "200" })),
    { provider: "openrouter", id: "openrouter/free", label: "Free Auto-Router", ctx: "varies", rpd: "200" },
  ];
}

async function fetchMistral() {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return [];
  const { data = [] } = await fetchJson("https://api.mistral.ai/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  return data
    .filter((m) => m.type === "base" || m.type === "chat")  // skip embedding/fim models
    .map((m) => ({ provider: "mistral", id: m.id, label: m.id, ctx: formatCtx(m.max_context_length), rpd: "—" }));
}


function getAgentRouter() {
  return [{ provider: "agentrouter", id: "auto", label: "Auto Router", ctx: "—", rpd: "—" }];
}

// ─── Registry ────────────────────────────────────────────────────────────────

const FETCHERS = {
  groq: fetchGroq,
  cerebras: fetchCerebras,
  gemini: fetchGemini,
  nvidia: fetchNvidia,
  openrouter: fetchOpenRouter,
  mistral: fetchMistral,
  agentrouter: async () => getAgentRouter(),
};

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET() {
  const entries = Object.entries(FETCHERS);
  const settled = await Promise.allSettled(entries.map(([, fn]) => fn()));

  const models = [];
  const errors = {};

  entries.forEach(([provider], i) => {
    const result = settled[i];
    if (result.status === "fulfilled") {
      const seen = new Set();
      for (const m of result.value) {
        if (!seen.has(m.id)) { seen.add(m.id); models.push(m); }
      }
    } else {
      errors[provider] = result.reason?.message ?? "Failed";
    }
  });

  return NextResponse.json(
    { models, errors, fetchedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
  );
}