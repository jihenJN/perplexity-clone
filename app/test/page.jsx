"use client";
import { useState, useEffect, useMemo } from "react";

// ─── Provider metadata: colors, rate-limit info ───────────────────────────────
const PROVIDERS = {
  groq: {
    label: "Groq",
    color: "#f97316",
    bg: "#fff7ed",
    limits: "30 RPM · 6K TPM · 1K RPD",
    note: "LPU hardware — fastest inference",
  },
  cerebras: {
    label: "Cerebras",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    limits: "30 RPM · 60K–100K TPM · 1M tok/day",
    note: "Wafer-Scale Engine — high daily volume",
  },
  gemini: {
    label: "Gemini (Google AI Studio)",
    color: "#1d9bf0",
    bg: "#eff6ff",
    limits: "Flash-Lite: 15 RPM · 1K RPD · Flash: 10 RPM · 250 RPD · Pro: 5 RPM · 100 RPD",
    note: "No credit card required · prompts may be logged",
  },
  nvidia: {
    label: "NVIDIA NIM",
    color: "#16a34a",
    bg: "#f0fdf4",
    limits: "~40 RPM · credits-based free tier",
    note: "Free credits on sign-up",
  },
  openrouter: {
    label: "OpenRouter",
    color: "#6366f1",
    bg: "#eef2ff",
    limits: "20 RPM · 200 RPD (per :free model)",
    note: "Many models rotate — check openrouter.ai",
  },
  agentrouter: {
    label: "Agent Router",
    color: "#64748b",
    bg: "#f8fafc",
    limits: "Varies by routed model",
    note: "Auto-selects best available model",
  },
};

// ─── Provider display order ──────────────────────────────────────────────────
const PROVIDER_ORDER = ["groq", "cerebras", "gemini", "nvidia", "openrouter", "agentrouter"];

const PROMPT = `You are an AI assistant. In 150 words or fewer, answer these three questions about yourself:

1. **Strengths** — What are your 2–3 most notable capabilities? (e.g. reasoning, coding, writing, vision, search…)

2. **Weaknesses** — What are your 2–3 most significant limitations? (e.g. knowledge cutoff, no real-time data, hallucination risk, context length…)

3. **Perplexity candidate?** — Based on the above, are you a suitable replacement for Perplexity AI (a search-augmented answer engine)? Answer Yes / Partial / No and give a one-sentence justification.

Be honest, specific, and concise. Avoid marketing language.`;

const STATUS_STYLES = {
  ok: { bg: "#f0fdf4", color: "#166534", label: "ok" },
  error: { bg: "#fef2f2", color: "#991b1b", label: "error" },
  empty: { bg: "#fffbeb", color: "#92400e", label: "empty" },
  loading: { bg: "#eff6ff", color: "#1e40af", label: "…" },
};

export default function TestPage() {
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [results, setResults] = useState({});   // keyed by `provider:id`
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [filter, setFilter] = useState("all");
  const [expandedProviders, setExpandedProviders] = useState(
    Object.fromEntries(PROVIDER_ORDER.map((p) => [p, true]))
  );

  // ─── Fetch models dynamically from provider APIs ──────────────────────────
  async function loadModels() {
    setLoadingModels(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/fetch-models");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setModels(data.models ?? []);
      setFetchedAt(data.fetchedAt ?? null);
      if (data.errors && Object.keys(data.errors).length > 0) {
        setFetchError(`Partial failure: ${Object.entries(data.errors).map(([p, e]) => `${p}: ${e}`).join(", ")}`);
      }
    } catch (e) {
      setFetchError(e.message);
    } finally {
      setLoadingModels(false);
    }
  }

  useEffect(() => { loadModels(); }, []);

  // ─── Derived data (recomputed when models change) ─────────────────────────
  const GROUPED = useMemo(() =>
    PROVIDER_ORDER.map((p) => ({
      provider: p,
      meta: PROVIDERS[p],
      models: models.filter((m) => m.provider === p),
    })).filter((g) => g.models.length > 0),
    [models]
  );
  const FLAT_MODELS = useMemo(() => GROUPED.flatMap((g) => g.models), [GROUPED]);

  function key(m) { return `${m.provider}:${m.id}`; }

  async function testOne(model) {
    const start = Date.now();
    try {
      const res = await fetch("/api/test-models/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: model.provider, modelId: model.id, prompt: PROMPT }),
      });
      const data = await res.json();
      const ms = Date.now() - start;
      if (!res.ok) {
        return { ...model, status: "error", error: data?.error?.message ?? data?.error ?? `HTTP ${res.status}`, ms, httpStatus: res.status };
      }
      const response = data.choices?.[0]?.message?.content ?? "(empty)";
      return { ...model, status: response === "(empty)" ? "empty" : "ok", response, ms, httpStatus: res.status };
    } catch (e) {
      return { ...model, status: "error", error: e.message, ms: Date.now() - start, httpStatus: 0 };
    }
  }

  async function runTests() {
    if (FLAT_MODELS.length === 0) return;
    setRunning(true);
    setDone(0);
    setFilter("all");

    // seed all as loading
    const initial = {};
    FLAT_MODELS.forEach((m) => { initial[key(m)] = { ...m, status: "loading" }; });
    setResults(initial);

    await Promise.all(
      FLAT_MODELS.map(async (model) => {
        const result = await testOne(model);
        setResults((prev) => ({ ...prev, [key(model)]: result }));
        setDone((d) => d + 1);
      })
    );
    setRunning(false);
  }

  const allResults = Object.values(results);
  const hasResults = allResults.length > 0;
  const okCount = allResults.filter((r) => r.status === "ok").length;
  const errCount = allResults.filter((r) => r.status === "error" || r.status === "empty").length;
  const times = allResults.filter((r) => r.ms && r.status === "ok").map((r) => r.ms);
  const avgMs = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;

  function toggleProvider(p) {
    setExpandedProviders((prev) => ({ ...prev, [p]: !prev[p] }));
  }

  // ─── Loading state for model fetching ──────────────────────────────────────
  if (loadingModels) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "4rem 1rem", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <div style={{ fontSize: 16, color: "#6b7280", marginBottom: 8 }}>Fetching models from providers…</div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>Querying Groq, Cerebras, Gemini, NVIDIA, OpenRouter</div>
      </div>
    );
  }

  const canRun = FLAT_MODELS.length > 0 && !running;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Model test runner</h1>
          <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>
            {FLAT_MODELS.length} free-tier models across {GROUPED.length} providers
            {fetchedAt && <span style={{ marginLeft: 8, color: "#d1d5db" }}>· fetched {new Date(fetchedAt).toLocaleTimeString()}</span>}
          </p>
          {fetchError && (
            <p style={{ fontSize: 11, color: "#dc2626", margin: "4px 0 0" }}>{fetchError}</p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={loadModels}
            disabled={loadingModels}
            style={{
              padding: "6px 12px", fontSize: 12, fontWeight: 500,
              background: "transparent", color: "#6b7280",
              border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer",
            }}
          >
            ↻ Refresh
          </button>
          {running && (
            <span style={{ fontSize: 13, color: "#6b7280" }}>{done}/{FLAT_MODELS.length}</span>
          )}
          <button
            onClick={runTests}
            disabled={!canRun}
            style={{
              padding: "8px 18px", fontSize: 13, fontWeight: 500,
              background: !canRun ? "#f3f4f6" : "#111827",
              color: !canRun ? "#9ca3af" : "#fff",
              border: "none", borderRadius: 8, cursor: !canRun ? "not-allowed" : "pointer",
            }}
          >
            {running ? "Running…" : hasResults ? "Run again" : "Run all models"}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      {hasResults && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: "1.5rem" }}>
          {[
            { val: okCount || "—", label: "Working" },
            { val: errCount || "—", label: "Failed / empty" },
            { val: avgMs ? (avgMs / 1000).toFixed(1) + "s" : "—", label: "Avg response" },
          ].map(({ val, label }) => (
            <div key={label} style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{val}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Status filter ── */}
      {hasResults && (
        <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
          {["all", "ok", "error", "empty"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: 12, padding: "4px 12px", borderRadius: 999,
                border: "1px solid", cursor: "pointer",
                borderColor: filter === f ? "#111827" : "#e5e7eb",
                background: filter === f ? "#111827" : "transparent",
                color: filter === f ? "#fff" : "#6b7280",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!hasResults && (
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#9ca3af", fontSize: 14 }}>
          Hit "Run all models" to compare {FLAT_MODELS.length} free-tier models across {GROUPED.length} providers
        </div>
      )}

      {/* ── Provider groups ── */}
      {hasResults && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {GROUPED.map(({ provider, meta, models }) => {
            // apply status filter
            const cards = models
              .map((m) => results[key(m)] ?? { ...m, status: "loading" })
              .filter((r) => filter === "all" || r.status === filter);

            if (cards.length === 0) return null;

            const providerOk = models.filter((m) => results[key(m)]?.status === "ok").length;
            const providerTotal = models.length;
            const isOpen = expandedProviders[provider];

            return (
              <div key={provider} style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>

                {/* Provider header */}
                <div
                  onClick={() => toggleProvider(provider)}
                  style={{
                    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                    padding: "12px 16px", background: meta.bg, cursor: "pointer", userSelect: "none",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700, color: meta.color,
                        display: "inline-flex", alignItems: "center", gap: 5,
                      }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: meta.color, display: "inline-block",
                        }} />
                        {meta.label}
                      </span>

                      {/* Working badge */}
                      {hasResults && (
                        <span style={{
                          fontSize: 11, padding: "1px 7px", borderRadius: 999,
                          background: providerOk === providerTotal ? "#dcfce7" : providerOk === 0 ? "#fee2e2" : "#fef9c3",
                          color: providerOk === providerTotal ? "#166534" : providerOk === 0 ? "#991b1b" : "#713f12",
                          fontWeight: 600,
                        }}>
                          {providerOk}/{providerTotal} ok
                        </span>
                      )}
                    </div>

                    {/* Rate limits */}
                    <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: "4px 10px", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#374151", fontFamily: "monospace", background: "rgba(0,0,0,0.05)", padding: "1px 6px", borderRadius: 4 }}>
                        {meta.limits}
                      </span>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>{meta.note}</span>
                    </div>
                  </div>

                  {/* Collapse toggle */}
                  <span style={{ fontSize: 14, color: "#9ca3af", marginTop: 2 }}>{isOpen ? "▲" : "▼"}</span>
                </div>

                {/* Model cards */}
                {isOpen && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {cards.map((r, idx) => {
                      const s = STATUS_STYLES[r.status] ?? STATUS_STYLES.loading;
                      return (
                        <div
                          key={key(r)}
                          style={{
                            padding: "12px 16px",
                            borderTop: idx === 0 ? "none" : "1px solid #f3f4f6",
                            background: "#fff",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                            {/* Status */}
                            <span style={{
                              fontSize: 11, padding: "2px 8px", borderRadius: 999,
                              fontWeight: 600, background: s.bg, color: s.color,
                            }}>
                              {s.label}
                            </span>

                            {/* Model name */}
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{r.label}</span>

                            {/* Context window */}
                            {r.ctx && r.ctx !== "—" && (
                              <span style={{
                                fontSize: 10, padding: "1px 6px", borderRadius: 4,
                                background: "#f3f4f6", color: "#6b7280", fontFamily: "monospace",
                              }}>
                                {r.ctx} ctx
                              </span>
                            )}

                            {/* Per-model RPD */}
                            {r.rpd && r.rpd !== "—" && (
                              <span style={{
                                fontSize: 10, padding: "1px 6px", borderRadius: 4,
                                background: "#fffbeb", color: "#92400e", fontFamily: "monospace",
                              }}>
                                {r.rpd} RPD
                              </span>
                            )}

                            {/* Latency */}
                            {r.ms && (
                              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                                {(r.ms / 1000).toFixed(1)}s
                              </span>
                            )}

                            {/* Model ID */}
                            <span style={{ fontSize: 10, color: "#d1d5db", marginLeft: "auto", fontFamily: "monospace", textAlign: "right" }}>
                              {r.id}
                            </span>
                          </div>

                          {r.response && r.response !== "(empty)" && (
                            <pre style={{
                              fontSize: 12, color: "#374151", background: "#f9fafb",
                              borderRadius: 6, padding: "10px 12px", margin: 0,
                              maxHeight: 140, overflowY: "auto", whiteSpace: "pre-wrap", lineHeight: 1.6,
                            }}>
                              {r.response}
                            </pre>
                          )}

                          {r.error && (
                            <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>
                              {r.error}{r.httpStatus ? ` (HTTP ${r.httpStatus})` : ""}
                            </div>
                          )}

                          {r.status === "empty" && (
                            <div style={{ fontSize: 12, color: "#d97706", marginTop: 6 }}>
                              Model returned 200 but no content
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}