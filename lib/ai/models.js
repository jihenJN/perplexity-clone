export const PROVIDERS = {
  GROQ: "groq",
  CEREBRAS: "cerebras",
  NVIDIA: "nvidia",
  OPENROUTER: "openrouter",
  AGENTROUTER: "agentrouter",
  GEMINI: "gemini",
  OPENAI: "openai",
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
}

export const MODELS = [
  {
    id: "llama-3.1-8b-instant",
    provider: PROVIDERS.GROQ,
    providerModel: "llama-3.1-8b-instant",
    label: "Groq Llama 3.1 8B",
    desc: "Very fast and low-cost. Best for lightweight search answers.",
    strengths: ["speed", "cost"],
    badge: "Fast",
  },
  {
    id: "llama-3.3-70b-versatile",
    provider: PROVIDERS.GROQ,
    providerModel: "llama-3.3-70b-versatile",
    label: "Groq Llama 3.3 70B",
    desc: "Fast general-purpose reasoning for everyday searches.",
    strengths: ["speed", "quality"],
    badge: "Balanced",
  },
  {
    id: "cerebras-llama-3.3-70b",
    provider: PROVIDERS.CEREBRAS,
    providerModel: "llama-3.3-70b",
    label: "Cerebras Llama 3.3 70B",
    desc: "Fast OpenAI-compatible inference for high-throughput answers.",
    strengths: ["speed", "quality"],
    badge: "Fast",
  },
  {
    id: "nvidia-nemotron-70b",
    provider: PROVIDERS.NVIDIA,
    providerModel: "nvidia/llama-3.1-nemotron-70b-instruct",
    label: "NVIDIA Nemotron 70B",
    desc: "Strong instruction-following through NVIDIA NIM.",
    strengths: ["quality"],
    badge: "NIM",
  },
  {
    id: "deepseek/deepseek-v4-flash:free",
    provider: PROVIDERS.OPENROUTER,
    providerModel: "deepseek/deepseek-v4-flash:free",
    label: "DeepSeek V4 Flash",
    desc: "OpenRouter free-tier model for cost-sensitive queries.",
    strengths: ["cost", "quality"],
    badge: "Free",
  },
  {
    id: "openai/gpt-oss-120b:free",
    provider: PROVIDERS.OPENROUTER,
    providerModel: "openai/gpt-oss-120b:free",
    label: "OpenAI GPT OSS 120B",
    desc: "Open-weight model routed through OpenRouter free tier.",
    strengths: ["cost", "quality"],
    badge: "Free",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    provider: PROVIDERS.OPENROUTER,
    providerModel: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B Instruct",
    desc: "Reliable OpenRouter fallback for general search answers.",
    strengths: ["cost", "quality"],
    badge: "Free",
  },
  {
    id: "agentrouter-auto",
    provider: PROVIDERS.AGENTROUTER,
    providerModel: "auto",
    label: "AgentRouter Auto",
    desc: "Provider-side routing for flexible fallback experiments.",
    strengths: ["speed", "quality", "cost"],
    badge: "Auto",
  },
  {
    id: "gemini-flash-lite-latest",
    provider: PROVIDERS.GEMINI,
    providerModel: "gemini-flash-lite-latest",
    label: "Gemini Flash Lite",
    desc: "Fallback-only Gemini model for outage recovery.",
    strengths: ["fallback", "speed", "cost"],
    badge: "Fallback",
    fallbackOnly: true,
  },
]

export const MODEL_MAP = Object.fromEntries(MODELS.map((model) => [model.id, model]))

export const INTENT_DEFAULTS = {
  quality: "llama-3.3-70b-versatile",
  speed: "llama-3.1-8b-instant",
  cost: "deepseek/deepseek-v4-flash:free",
  "long-context": "meta-llama/llama-3.3-70b-instruct:free",
}

export const DEFAULT_MODEL_ID = "llama-3.1-8b-instant"
export const FALLBACK_MODEL_ID = "gemini-flash-lite-latest"
