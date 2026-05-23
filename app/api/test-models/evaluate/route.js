/**
 * POST /api/test-models/evaluate
 * Body: { provider, modelId }
 *
 * Sends a single multi-task prompt that covers 7 capability dimensions,
 * scores each section with heuristics, and returns structured ratings.
 *
 * Save this file as: app/api/test-models/evaluate/route.js
 */

import { NextResponse } from "next/server";

const TIMEOUT_MS = 60_000;

// ─── Provider registry ────────────────────────────────────────────────────────

const PROVIDERS = {
  groq:        { type: "openai", base: "https://api.groq.com/openai/v1/chat/completions",                                                              key: () => process.env.GROQ_API_KEY },
  cerebras:    { type: "openai", base: "https://api.cerebras.ai/v1/chat/completions",                                                                   key: () => process.env.CEREBRAS_API_KEY },
  nvidia:      { type: "openai", base: "https://integrate.api.nvidia.com/v1/chat/completions",                                                          key: () => process.env.NVIDIA_API_KEY },
  openrouter:  { type: "openai", base: "https://openrouter.ai/api/v1/chat/completions",                                                                 key: () => process.env.OPENROUTER_API_KEY, extraHeaders: () => ({ "HTTP-Referer": process.env.SITE_URL ?? "http://localhost:3000", "X-Title": process.env.SITE_NAME ?? "AI Evaluator" }) },
  agentrouter: { type: "openai", base: `${process.env.AGENTROUTER_BASE_URL ?? "https://api.agentrouter.org/v1"}/chat/completions`,                      key: () => process.env.AGENTROUTER_API_KEY },
  gemini:      { type: "gemini", key: () => process.env.GEMINI_API_KEY },
  mistral:     { type: "openai", base: "https://api.mistral.ai/v1/chat/completions",                                                                    key: () => process.env.MISTRAL_API_KEY },
};

// ─── Static provider metadata (for usage & stability ratings) ─────────────────

/**
 * Usage limit rating 1-5:
 *   5 = very generous (millions of tokens/day)
 *   1 = very restricted (<500 RPD)
 */
const USAGE_RATINGS = {
  groq:        2,   // 30 RPM but only 1K RPD
  cerebras:    5,   // ~1M tokens/day
  gemini:      2,   // Flash: 250 RPD · Flash-Lite: 1K RPD
  nvidia:      3,   // credit-based free tier
  openrouter:  2,   // 200 RPD per :free model
  agentrouter: 3,   // varies by routed model
  mistral:     5,   // ~1B tokens/month
};

/**
 * Stability rating 1-5:
 *   Subjective baseline from provider reliability track-record.
 *   Will improve once per-model success rates are tracked across sessions.
 */
const STABILITY_RATINGS = {
  groq:        4,
  cerebras:    4,
  gemini:      5,
  nvidia:      3,
  openrouter:  3,
  agentrouter: 3,
  mistral:     4,
};

// ─── Multi-task evaluation prompt ─────────────────────────────────────────────

/**
 * A single prompt that covers all 7 capability dimensions.
 * Using one call per model keeps us within free-tier rate limits while still
 * gathering enough signal to score each capability independently.
 */
const EVAL_PROMPT = `Complete ALL 7 tasks below. Use the EXACT section tags shown — they are required for automated scoring.

[WRITING]
Write exactly 2 vivid, creative sentences that open a science-fiction story about humanity's first contact with an alien civilization.

[CODE]
Write a Python function that checks whether a string is a palindrome (ignoring case and spaces). Include a one-line docstring.

[TRANSLATE]
Translate the sentence "The future belongs to those who believe in their dreams" into French, Spanish, and German. Label each translation clearly.

[SUMMARIZE]
Summarize the following passage in exactly ONE concise sentence:
"Neural networks are computing systems loosely inspired by biological brains. They consist of layers of interconnected nodes that process information by adjusting connection weights through backpropagation. Applications span image recognition, natural language processing, and game playing. Key challenges include overfitting, vanishing gradients, and interpretability."

[ANALYZE]
Monthly sales (units): Jan=45K, Feb=38K, Mar=52K, Apr=61K, May=58K, Jun=73K.
Identify: (a) the overall trend, (b) any anomaly, (c) your predicted value for July with a brief rationale.

[CALCULATE]
Show full step-by-step working:
A $350 item receives a 40% discount. Sales tax of 7% is then applied to the discounted price. What is the final price for 2 such items?

[KNOWLEDGE]
State 2 specific technical differences between the Transformer architecture and Recurrent Neural Networks (RNNs).

Keep every answer concise. Do not omit any section.`;

// ─── Scoring helpers ──────────────────────────────────────────────────────────

/** Clamp a raw score to integer in [1, 5]. */
function clamp(val) {
  return Math.min(5, Math.max(1, Math.round(val)));
}

/**
 * Extract the text belonging to a section tag.
 * Matches everything between [TAG] and the next [TAG] or end-of-string.
 */
function extract(text, tag) {
  const esc = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\[${esc}\\]([\\s\\S]*?)(?=\\[[A-Z]+\\]|$)`, "i");
  const m = text.match(re);
  return m ? m[1].trim() : "";
}

/**
 * Per-capability scoring functions.
 * Each takes the extracted section text and returns a raw score in [0, 5]
 * that is then clamped to an integer.
 */
const SCORERS = {
  WRITING: (t) => {
    const words    = t.split(/\s+/).filter(Boolean).length;
    const vivid    = /alien|contact|ship|star|signal|silence|sky|sudden|vast|pulse|glow|strange|species|civilization|first|distant/i.test(t);
    const twoSents = (t.match(/[.!?]/g) || []).length >= 2;
    return clamp((words > 15 ? 1 : 0) + (words > 30 ? 1 : 0) + (vivid ? 1 : 0) + (twoSents ? 1 : 0) + 1);
  },

  CODE: (t) => {
    const hasFn        = /def \w+\s*\(/.test(t);
    const hasDocstring = /"""[\s\S]*?"""|'''[\s\S]*?'''/.test(t) || /#.*(palindrome|check|return)/i.test(t);
    const hasLogic     = /\[::-1\]|reverse\b|==/.test(t);
    const hasReturn    = /return\s+/.test(t);
    const hasStrip     = /\.replace|\.lower|re\.sub/i.test(t);  // bonus: handles spaces/case
    return clamp((hasFn ? 2 : 0) + (hasDocstring ? 1 : 0) + (hasLogic ? 1 : 0) + (hasReturn ? 0.5 : 0) + (hasStrip ? 0.5 : 0));
  },

  TRANSLATE: (t) => {
    // Keyword presence for each target language
    const fr      = /avenir|futur|rêves|appartient|ceux|croient/i.test(t);
    const es      = /futuro|pertenece|sueños|quienes|creen/i.test(t);
    const de      = /zukunft|gehört|träume|glauben|denen/i.test(t);
    const labeled = /(french|français|spanish|español|german|deutsch)/i.test(t);
    return clamp((fr ? 1 : 0) + (es ? 1 : 0) + (de ? 1 : 0) + (labeled ? 1 : 0) + 1);
  },

  SUMMARIZE: (t) => {
    const words      = t.split(/\s+/).filter(Boolean).length;
    const sentences  = (t.match(/[.!?]/g) || []).length;
    const coversNN   = /neural|network|node|layer|learn|weight|backprop/i.test(t);
    const coversUse  = /image|NLP|language|game|application|recognition/i.test(t);
    const isConcise  = words < 55;
    const isSingle   = sentences <= 2;
    return clamp((isConcise ? 2 : 1) + (isSingle ? 1 : 0) + (coversNN ? 1 : 0) + (coversUse ? 1 : 0));
  },

  ANALYZE: (t) => {
    const hasTrend   = /upward|growth|increase|rising|positive|overall|general/i.test(t);
    const hasAnomaly = /feb|anomaly|dip|drop|decrease|exception|outlier|except/i.test(t);
    // July prediction: any plausible number roughly in the 70-90 range
    const hasPredict = /jul[y]?|predict|forecast|expect|\b7[5-9][Kk]?\b|\b8[0-9][Kk]?\b/i.test(t);
    const hasNumbers = /\d+/.test(t);
    return clamp((hasTrend ? 1 : 0) + (hasAnomaly ? 1 : 0) + (hasPredict ? 1 : 0) + (hasNumbers ? 1 : 0) + 1);
  },

  CALCULATE: (t) => {
    // Expected: 350 × 0.60 = 210 → × 1.07 = 224.70 → × 2 = 449.40
    const step1 = /\b210\b/.test(t);
    const step2 = /224\.70|224\.7\b/.test(t);
    const final  = /449\.40|449\.4\b/.test(t);
    const shows  = /step|discount|tax|first|then|multiply|working/i.test(t);
    return clamp((step1 ? 1 : 0) + (step2 ? 1 : 0) + (final ? 2 : 0) + (shows ? 1 : 0));
  },

  KNOWLEDGE: (t) => {
    const xformer    = /transformer|attention|self.?attention|parallel/i.test(t);
    const rnn        = /\bRNN\b|recurrent|sequential|hidden state|gradient vanish/i.test(t);
    const hasDiff    = /while|whereas|unlike|however|contrast|differ|but\b/i.test(t);
    const structured = /1\.|2\.|\-\s|first[,:]|second[,:]/i.test(t);
    return clamp((xformer ? 1 : 0) + (rnn ? 1 : 0) + (hasDiff ? 1 : 0) + (structured ? 1 : 0) + 1);
  },
};

/** Convert response latency (ms) → speed rating 1–5. */
function speedRating(ms) {
  if (ms <  1_000) return 5.0;
  if (ms <  2_000) return 4.5;
  if (ms <  3_500) return 4.0;
  if (ms <  6_000) return 3.0;
  if (ms < 10_000) return 2.0;
  return 1.0;
}

// ─── HTTP helpers (mirrors single route) ─────────────────────────────────────

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

async function safeJson(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`Non-JSON (HTTP ${res.status}): ${text.slice(0, 120).replace(/\s+/g, " ").trim()}…`); }
}

// ─── Provider dispatch ────────────────────────────────────────────────────────

async function callOpenAI({ base, key, extraHeaders }, modelId, prompt) {
  const res = await fetchWithRedirect(base, {
    method:  "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json", ...extraHeaders?.() },
    signal:  AbortSignal.timeout(TIMEOUT_MS),
    body:    JSON.stringify({ model: modelId, max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? data?.error ?? `HTTP ${res.status}`);

  // Normalise content — some models return thinking blocks as objects
  const raw = data?.choices?.[0]?.message?.content;
  if (Array.isArray(raw)) {
    return raw.filter((b) => typeof b.text === "string").map((b) => b.text).join("");
  }
  return raw ?? "";
}

async function callGemini({ key }, modelId, prompt) {
  const res = await fetchWithRedirect(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key()}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      signal:  AbortSignal.timeout(TIMEOUT_MS),
      body:    JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1500, temperature: 0.7 } }),
    }
  );
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("") ?? "";
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req) {
  const { provider, modelId } = await req.json();
  const config = PROVIDERS[provider];

  if (!config) return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
  const key = config.key();
  if (!key) return NextResponse.json({ error: `Missing API key for: ${provider}` }, { status: 400 });

  const start = Date.now();
  let responseText = "";

  try {
    responseText = config.type === "gemini"
      ? await callGemini(config, modelId, EVAL_PROMPT)
      : await callOpenAI(config, modelId, EVAL_PROMPT);
  } catch (err) {
    const ms = Date.now() - start;
    const isTimeout = err?.name === "TimeoutError";
    return NextResponse.json(
      { error: isTimeout ? `Timed out after ${TIMEOUT_MS / 1000}s` : err.message, ms },
      { status: isTimeout ? 504 : 502 }
    );
  }

  const ms = Date.now() - start;

  // ── Score each capability section ──────────────────────────────────────────
  const capabilityScores = {};
  for (const [tag, scorer] of Object.entries(SCORERS)) {
    const section = extract(responseText, tag);
    // If a section is completely missing, penalise to 1 (model didn't follow instructions)
    capabilityScores[tag] = section.length > 5 ? scorer(section) : 1;
  }

  // ── Aggregate ratings ──────────────────────────────────────────────────────
  const capValues   = Object.values(capabilityScores);
  const accuracyAvg = parseFloat((capValues.reduce((a, b) => a + b, 0) / capValues.length).toFixed(2));

  const ratings = {
    speed:      parseFloat(speedRating(ms).toFixed(1)),
    accuracy:   accuracyAvg,
    usageLimit: USAGE_RATINGS[provider] ?? 3,
    stability:  STABILITY_RATINGS[provider] ?? 3,
  };

  return NextResponse.json({
    ms,
    responseText,
    capabilityScores,  // { WRITING: 4, CODE: 3, TRANSLATE: 5, SUMMARIZE: 4, ANALYZE: 3, CALCULATE: 2, KNOWLEDGE: 4 }
    ratings,           // { speed: 4.5, accuracy: 3.57, usageLimit: 2, stability: 4 }
  });
}