export const PROVIDERS = {
  GROQ:        "groq",
  CEREBRAS:    "cerebras",
  NVIDIA:      "nvidia",
  OPENROUTER:  "openrouter",
  AGENTROUTER: "agentrouter",
  GEMINI:      "gemini",
  OPENAI:      "openai",
  MISTRAL:     "mistral",
}

export const PROVIDER_CONFIGS = {
  [PROVIDERS.GROQ]: {
    id: PROVIDERS.GROQ,
    label: "Groq",
    envKey: "GROQ_API_KEY",
    openAICompatible: true,
  },
  [PROVIDERS.CEREBRAS]: {
    id: PROVIDERS.CEREBRAS,
    label: "Cerebras",
    envKey: "CEREBRAS_API_KEY",
    openAICompatible: true,
  },
  [PROVIDERS.NVIDIA]: {
    id: PROVIDERS.NVIDIA,
    label: "NVIDIA NIM",
    envKey: "NVIDIA_API_KEY",
    openAICompatible: true,
  },
  [PROVIDERS.OPENROUTER]: {
    id: PROVIDERS.OPENROUTER,
    label: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    openAICompatible: true,
  },
  [PROVIDERS.AGENTROUTER]: {
    id: PROVIDERS.AGENTROUTER,
    label: "AgentRouter",
    envKey: "AGENTROUTER_API_KEY",
    openAICompatible: true,
  },
  [PROVIDERS.GEMINI]: {
    id: PROVIDERS.GEMINI,
    label: "Gemini",
    envKey: "GEMINI_API_KEY",
    openAICompatible: false,
    fallbackOnly: true,
  },
  [PROVIDERS.OPENAI]: {
    id: PROVIDERS.OPENAI,
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    openAICompatible: true,
  },
  [PROVIDERS.MISTRAL]: {
    id: PROVIDERS.MISTRAL,
    label: "Mistral",
    envKey: "MISTRAL_API_KEY",
    openAICompatible: true,
  },
}

// ─── Task taxonomy ────────────────────────────────────────────────────────────
// Each task key matches the capability dimension used in the evaluator.
// Models list the tasks they scored ≥ 4/5 on (or are known to excel at for
// models not yet in the CSV).

export const TASKS = {
  WRITING:   { label: "Writing",       icon: "✍️",  color: "#db2777" },
  CODE:      { label: "Code",          icon: "💻",  color: "#7c3aed" },
  TRANSLATE: { label: "Translation",   icon: "🌐",  color: "#0891b2" },
  SUMMARIZE: { label: "Summarization", icon: "📄",  color: "#d97706" },
  ANALYZE:   { label: "Analysis",      icon: "📊",  color: "#059669" },
  CALCULATE: { label: "Math",          icon: "🔢",  color: "#2563eb" },
  KNOWLEDGE: { label: "Knowledge",     icon: "🔍",  color: "#4f46e5" },
}

export const ALL_TASKS = Object.keys(TASKS)

// ─── Models ───────────────────────────────────────────────────────────────────

export const MODELS = [

  // ── Cerebras ────────────────────────────────────────────────────────────────

  {
    id: "gpt-oss-120b",
    provider: PROVIDERS.CEREBRAS,
    providerModel: "gpt-oss-120b",
    label: "GPT-OSS 120B",
    desc: "Fastest top-scorer — 5/5 across all 7 capabilities at 935ms.",
    strengths: ["speed", "quality"],
    badge: "Cerebras",
    // CSV: all caps = 5/5, overall = 4.75, 935ms
    tasks: ["WRITING", "CODE", "TRANSLATE", "SUMMARIZE", "ANALYZE", "CALCULATE", "KNOWLEDGE"],
  },
  {
    id: "qwen-3-235b-a22b-instruct-2507",
    provider: PROVIDERS.CEREBRAS,
    providerModel: "qwen-3-235b-a22b-instruct-2507",
    label: "Qwen3 235B A22B 2507",
    desc: "Outperforms GPT-4.1 & Claude Opus 4 on AI Intelligence Index. 262K ctx.",
    strengths: ["quality", "cost"],
    badge: "Cerebras",
    // 235B MoE (22B active), strong reasoning/coding/multilingual
    tasks: ["WRITING", "CODE", "TRANSLATE", "SUMMARIZE", "ANALYZE", "CALCULATE", "KNOWLEDGE"],
  },

  // ── Groq ────────────────────────────────────────────────────────────────────

  {
    id: "openai/gpt-oss-20b",
    provider: PROVIDERS.GROQ,
    providerModel: "openai/gpt-oss-20b",
    label: "GPT-OSS 20B",
    desc: "All-rounder at Groq speed — 5/5 across every task at 1.3s.",
    strengths: ["speed", "quality"],
    badge: "Groq",
    // CSV: all caps = 5/5, overall = 3.88, 1324ms
    tasks: ["WRITING", "CODE", "TRANSLATE", "SUMMARIZE", "ANALYZE", "CALCULATE", "KNOWLEDGE"],
  },
  {
    id: "llama-3.1-8b-instant",
    provider: PROVIDERS.GROQ,
    providerModel: "llama-3.1-8b-instant",
    label: "Llama 3.1 8B Instant",
    desc: "Sub-second responses. Ideal for writing, translation, and knowledge tasks.",
    strengths: ["speed", "cost"],
    badge: "Groq",
    // CSV: WRITING=4, CODE=5, TRANSLATE=5, SUMMARIZE=4, ANALYZE=5, CALCULATE=2, KNOWLEDGE=5
    tasks: ["CODE", "TRANSLATE", "ANALYZE", "KNOWLEDGE", "WRITING", "SUMMARIZE"],
  },
  {
    id: "qwen/qwen3-32b",
    provider: PROVIDERS.GROQ,
    providerModel: "qwen/qwen3-32b",
    label: "Qwen3 32B",
    desc: "Strong on structured tasks — math, code, translation, and knowledge.",
    strengths: ["quality"],
    badge: "Groq",
    // CSV: WRITING=4, CODE=5, TRANSLATE=5, SUMMARIZE=5, ANALYZE=4, CALCULATE=5, KNOWLEDGE=5
    tasks: ["CODE", "TRANSLATE", "SUMMARIZE", "CALCULATE", "KNOWLEDGE", "ANALYZE"],
  },

  // ── Gemini ──────────────────────────────────────────────────────────────────

  {
    id: "gemini-3.1-flash-lite-latest",
    provider: PROVIDERS.GEMINI,
    providerModel: "gemini-3.1-flash-lite-latest",
    label: "Gemini 3.1 Flash Lite",
    desc: "Fast Gemini with top stability — writing, translation, analysis at 2s.",
    strengths: ["speed", "quality"],
    badge: "Gemini",
    // CSV: WRITING=5, CODE=5, TRANSLATE=5, SUMMARIZE=4, ANALYZE=5, CALCULATE=5, KNOWLEDGE=5
    tasks: ["WRITING", "CODE", "TRANSLATE", "ANALYZE", "CALCULATE", "KNOWLEDGE", "SUMMARIZE"],
  },
  {
    id: "gemini-2.5-flash-lite",
    provider: PROVIDERS.GEMINI,
    providerModel: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite",
    desc: "All-caps 5/5 model with highest stability rating (5/5) in the benchmark.",
    strengths: ["quality"],
    badge: "Gemini",
    // CSV: all caps = 5/5, overall = 3.75, stability = 5
    tasks: ["WRITING", "CODE", "TRANSLATE", "SUMMARIZE", "ANALYZE", "CALCULATE", "KNOWLEDGE"],
  },

  // ── NVIDIA NIM ──────────────────────────────────────────────────────────────

  {
    id: "deepseek-ai/deepseek-v4-flash",
    provider: PROVIDERS.NVIDIA,
    providerModel: "deepseek-ai/deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    desc: "284B MoE, 1M-token context. Optimized for fast coding and agentic workflows.",
    strengths: ["quality", "cost"],
    badge: "NIM",
    // Not in CSV — assigned from known strengths (coding/agents/math)
    tasks: ["CODE", "CALCULATE", "ANALYZE", "KNOWLEDGE"],
  },
  {
    id: "moonshotai/kimi-k2.6",
    provider: PROVIDERS.NVIDIA,
    providerModel: "moonshotai/kimi-k2.6",
    label: "Kimi K2.6",
    desc: "Multimodal VLM (text + image/video). Strong SWE-bench coding scores.",
    strengths: ["quality"],
    badge: "NIM",
    // Not in CSV — multimodal, strong coding/analysis
    tasks: ["CODE", "ANALYZE", "KNOWLEDGE", "WRITING"],
  },
  {
    id: "minimaxai/minimax-m2.7",
    provider: PROVIDERS.NVIDIA,
    providerModel: "minimaxai/minimax-m2.7",
    label: "MiniMax M2.7",
    desc: "230B model for complex software engineering, agentic tool use, and office tasks.",
    strengths: ["quality", "cost"],
    badge: "NIM",
    // Not in CSV — strong coding/engineering/office
    tasks: ["CODE", "CALCULATE", "ANALYZE", "SUMMARIZE", "KNOWLEDGE"],
  },
]

// ─── Derived lookups ──────────────────────────────────────────────────────────

export const MODEL_MAP = Object.fromEntries(MODELS.map((m) => [m.id, m]))

/** Returns models that support a given task key, or all models if task is null/"ALL". */
export function getModelsByTask(task) {
  if (!task || task === "ALL") return MODELS
  return MODELS.filter((m) => m.tasks?.includes(task))
}

// ─── Intent defaults ──────────────────────────────────────────────────────────

export const INTENT_DEFAULTS = {
  quality:        "gpt-oss-120b",
  speed:          "llama-3.1-8b-instant",
  cost:           "qwen-3-235b-a22b-instruct-2507",
  "long-context": "deepseek-ai/deepseek-v4-flash",
}

export const DEFAULT_MODEL_ID  = "llama-3.1-8b-instant"
export const FALLBACK_MODEL_ID = "gemini-3.1-flash-lite-latest"