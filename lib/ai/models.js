
export const PROVIDERS = {
  GOOGLE:      "google",
  OPENAI:      "openai",
  OPENROUTER:  "openrouter",
}


export const MODELS = [
  {
  id:            "gemini-flash-lite-latest",
  provider:      PROVIDERS.GOOGLE,
  providerModel: "gemini-flash-lite-latest",
  label:         "Gemini Flash Lite",
  desc:          "Lightest & cheapest. Best for high-volume tasks.",
  strengths:     ["speed", "cost"],
  costIn:        0.10,
  costOut:       0.40,
  badge:         "Lite",
},
  
  {
    id:          "gemini-flash-latest",
    provider:    PROVIDERS.GOOGLE,
    providerModel: "gemini-flash-latest",
    label:       "Gemini Flash",
    desc:        "Fast & cheap. Great for most searches.",
    strengths:   ["speed", "cost"],
    costIn:      0.15,
    costOut:     0.60,
    badge:       "Fast",
  },
  // {
  //   id:          "gemini-pro-latest",
  //   provider:    PROVIDERS.GOOGLE,
  //   providerModel: "gemini-pro-latest",
  //   label:       "Gemini Pro",
  //   desc:        "Google's best reasoning model.",
  //   strengths:   ["quality"],
  //   costIn:      1.25,
  //   costOut:     10.0,
  //   badge:       "Pro",
  // },

 
  // {
  //   id:          "claude-sonnet-4",
  //   provider:     PROVIDERS.OPENROUTER,
  //   providerModel: "claude-sonnet-4-20250514",
  //   label:       "Claude Sonnet 4",
  //   desc:        "Balanced quality and speed.",
  //   strengths:   ["speed", "quality"],
  //   costIn:      3.0,
  //   costOut:     15.0,
  //   badge:       "Balanced",
  // },
  // {
  //   id:          "claude-opus-4",
  //   provider:    PROVIDERS.OPENROUTER,
  //   providerModel: "claude-opus-4-20250514",
  //   label:       "Claude Opus 4",
  //   desc:        "Anthropic's most powerful model.",
  //   strengths:   ["quality"],
  //   costIn:      15.0,
  //   costOut:     75.0,
  //   badge:       "Best",
  // },

  
  // {
  //   id:          "gpt-5",
  //   provider:    PROVIDERS.OPENAI,
  //   providerModel: "gpt-5",
  //   label:       "GPT-5",
  //   desc:        "OpenAI's flagship model.",
  //   strengths:   ["quality"],
  //   costIn:      10.0,
  //   costOut:     30.0,
  //   badge:       "Flagship",
  // },

 
  // {
  //   id:          "kimi-k2",
  //   provider:    PROVIDERS.OPENROUTER,
  //   providerModel: "moonshotai/kimi-k2",
  //   label:       "Kimi K2",
  //   desc:        "128k context. Great for long documents.",
  //   strengths:   ["cost", "long-context"],
  //   costIn:      0.15,
  //   costOut:     0.60,
  //   badge:       "Long ctx",
  // },
  {
    id:          "deepseek/deepseek-v4-flash:free",
    provider:    PROVIDERS.OPENROUTER,
    providerModel: "deepseek/deepseek-v4-flash:free",
    label:       "DeepSeek V4 Flash",
    desc:        "Strong reasoning at very low cost.",
    strengths:   ["cost", "quality"],
    costIn:      0.55,
    costOut:     2.19,
    badge:       "Budget",
  },
  {
    id:          "openai/gpt-oss-120b:free",
    provider:    PROVIDERS.OPENROUTER,
    providerModel: "openai/gpt-oss-120b:free",
    label:       "OpenAI: gpt-oss-120b",
    desc:        "Strong reasoning at very low cost.",
    strengths:   ["cost", "quality"],
    costIn:      0.55,
    costOut:     2.19,
    badge:       "Budget",
  },
  {
    id:          "meta-llama/llama-3.3-70b-instruct:free",
    provider:    PROVIDERS.OPENROUTER,
    providerModel: "meta-llama/llama-3.3-70b-instruct:free",
    label:       "Meta: Llama 3.3 70B Instruct",
    desc:        "Strong reasoning at very low cost.",
    strengths:   ["cost", "quality"],
    costIn:      0.55,
    costOut:     2.19,
    badge:       "Budget",
  },
  //  {
  //   id:          "google/gemma-4-26b-a4b-it:free",
  //   provider:    PROVIDERS.OPENROUTER,
  //   providerModel: "google/gemma-4-26b-a4b-it:free",
  //   label:       "Google: Gemma 4 26B A4B",
  //   desc:        "Mixture-of-Experts (MoE) model from Google DeepMind",
  //   strengths:   ["cost", "quality"],
  //   costIn:      0.55,
  //   costOut:     2.19,
  //   badge:       "Budget",
  // }
  
]

/** Keyed lookup — used in the gateway */
export const MODEL_MAP = Object.fromEntries(MODELS.map((m) => [m.id, m]))

/** Smart routing defaults */
export const INTENT_DEFAULTS = {
  quality:      "claude-opus-4",
  speed:        "gemini-2.5-flash",
  cost:         "kimi-k2",
  "long-context": "kimi-k2",
}

export const DEFAULT_MODEL_ID = "gemini-flash-lite-latest"