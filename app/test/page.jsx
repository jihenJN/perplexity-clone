"use client";
import { useState, useEffect, useMemo } from "react";

// ─── Provider display metadata ────────────────────────────────────────────────

const PROVIDER_META = {
  groq:        { label: "Groq",                  color: "#f97316", bg: "#fff7ed", limits: "30 RPM · 6K TPM · 1K RPD",                                          note: "LPU hardware — fastest inference" },
  cerebras:    { label: "Cerebras",               color: "#8b5cf6", bg: "#f5f3ff", limits: "30 RPM · 60K–100K TPM · 1M tok/day",                               note: "Wafer-Scale Engine — high daily volume" },
  gemini:      { label: "Gemini (Google AI Studio)", color: "#1d9bf0", bg: "#eff6ff", limits: "Flash-Lite: 15 RPM · 1K RPD · Flash: 10 RPM · 250 RPD",        note: "No credit card required · prompts may be logged" },
  nvidia:      { label: "NVIDIA NIM",             color: "#16a34a", bg: "#f0fdf4", limits: "~40 RPM · credits-based free tier",                                 note: "Free credits on sign-up" },
  openrouter:  { label: "OpenRouter",             color: "#6366f1", bg: "#eef2ff", limits: "20 RPM · 200 RPD (per :free model)",                               note: "Many models rotate — check openrouter.ai" },
  agentrouter: { label: "Agent Router",           color: "#64748b", bg: "#f8fafc", limits: "Varies by routed model",                                           note: "Auto-selects best available model" },
};

const PROVIDER_ORDER = ["groq", "cerebras", "gemini", "nvidia", "openrouter", "agentrouter"];

// ─── Test prompt ──────────────────────────────────────────────────────────────

const PROMPT = `You are an AI assistant. In 150 words or fewer, answer:

1. **Strengths** — Your 2–3 most notable capabilities (reasoning, coding, writing, vision, search…)
2. **Weaknesses** — Your 2–3 most significant limitations (cutoff, hallucination, context length…)
3. **Perplexity candidate?** — Are you a suitable replacement for Perplexity AI? Yes / Partial / No + one-sentence justification.

Be honest, specific, and concise. Avoid marketing language.`;

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS = {
  ok:      { bg: "#f0fdf4", color: "#166534", label: "ok" },
  error:   { bg: "#fef2f2", color: "#991b1b", label: "error" },
  empty:   { bg: "#fffbeb", color: "#92400e", label: "empty" },
  loading: { bg: "#eff6ff", color: "#1e40af", label: "…" },
};

const FILTERS = ["all", "ok", "error", "empty"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const modelKey = (m) => `${m.provider}:${m.id}`;

// ─── Main component ───────────────────────────────────────────────────────────

export default function TestPage() {
  const [models,    setModels]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [fetchErr,  setFetchErr]  = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [results,   setResults]   = useState({});       // keyed by modelKey
  const [running,   setRunning]   = useState(false);
  const [done,      setDone]      = useState(0);
  const [filter,    setFilter]    = useState("all");
  const [collapsed, setCollapsed] = useState({});       // provider → true means collapsed

  // ─── Fetch model list ───────────────────────────────────────────────────────

  async function loadModels() {
    setLoading(true);
    setFetchErr(null);
    try {
      const res  = await fetch("/api/fetch-models");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setModels(data.models ?? []);
      setFetchedAt(data.fetchedAt ?? null);
      if (data.errors && Object.keys(data.errors).length > 0) {
        setFetchErr(`Partial failure: ${Object.entries(data.errors).map(([p, e]) => `${p}: ${e}`).join(", ")}`);
      }
    } catch (e) {
      setFetchErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadModels(); }, []);

  // ─── Derived: grouped by provider, ordered ─────────────────────────────────

  const groups = useMemo(() =>
    PROVIDER_ORDER
      .map((p) => ({ provider: p, meta: PROVIDER_META[p], models: models.filter((m) => m.provider === p) }))
      .filter((g) => g.models.length > 0),
    [models]
  );

  const allModels = useMemo(() => groups.flatMap((g) => g.models), [groups]);

  // ─── Run tests ──────────────────────────────────────────────────────────────

  async function testOne(model) {
    const start = Date.now();
    try {
      const res  = await fetch("/api/test-models/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: model.provider, modelId: model.id, prompt: PROMPT }),
      });
      const data = await res.json();
      const ms   = Date.now() - start;
      if (!res.ok) return { ...model, status: "error", error: data?.error?.message ?? data?.error ?? `HTTP ${res.status}`, ms, httpStatus: res.status };
      const content = data.choices?.[0]?.message?.content ?? "";
      return { ...model, status: content ? "ok" : "empty", response: content || undefined, ms, httpStatus: res.status };
    } catch (e) {
      return { ...model, status: "error", error: e.message, ms: Date.now() - start, httpStatus: 0 };
    }
  }

  async function runTests() {
    if (!allModels.length) return;
    setRunning(true);
    setDone(0);
    setFilter("all");

    // Seed all as loading
    setResults(Object.fromEntries(allModels.map((m) => [modelKey(m), { ...m, status: "loading" }])));

    await Promise.all(allModels.map(async (model) => {
      const result = await testOne(model);
      setResults((prev) => ({ ...prev, [modelKey(model)]: result }));
      setDone((d) => d + 1);
    }));

    setRunning(false);
  }

  // ─── Derived stats ──────────────────────────────────────────────────────────

  const allResults = Object.values(results);
  const hasResults = allResults.length > 0;
  const okCount    = allResults.filter((r) => r.status === "ok").length;
  const errCount   = allResults.filter((r) => r.status === "error" || r.status === "empty").length;
  const okTimes    = allResults.filter((r) => r.status === "ok" && r.ms).map((r) => r.ms);
  const avgMs      = okTimes.length ? Math.round(okTimes.reduce((a, b) => a + b, 0) / okTimes.length) : null;

  const canRun = allModels.length > 0 && !running;

  // ─── Loading splash ─────────────────────────────────────────────────────────

  if (loading) return (
    <div style={styles.splash}>
      <div style={{ fontSize: 16, color: "#6b7280", marginBottom: 6 }}>Fetching models from providers…</div>
      <div style={{ fontSize: 12, color: "#9ca3af" }}>Querying Groq · Cerebras · Gemini · NVIDIA · OpenRouter</div>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Model test runner</h1>
          <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>
            {allModels.length} free-tier models across {groups.length} providers
            {fetchedAt && <span style={{ marginLeft: 8, color: "#d1d5db" }}>· fetched {new Date(fetchedAt).toLocaleTimeString()}</span>}
          </p>
          {fetchErr && <p style={{ fontSize: 11, color: "#dc2626", margin: "4px 0 0" }}>{fetchErr}</p>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={loadModels} disabled={loading} style={styles.btnSecondary}>↻ Refresh</button>
          {running && <span style={{ fontSize: 13, color: "#6b7280" }}>{done}/{allModels.length}</span>}
          <button onClick={runTests} disabled={!canRun} style={canRun ? styles.btnPrimary : styles.btnDisabled}>
            {running ? "Running…" : hasResults ? "Run again" : "Run all models"}
          </button>
        </div>
      </div>

      {/* Stats */}
      {hasResults && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: "1.5rem" }}>
          {[
            { val: okCount  || "—", label: "Working" },
            { val: errCount || "—", label: "Failed / empty" },
            { val: avgMs ? `${(avgMs / 1000).toFixed(1)}s` : "—", label: "Avg response" },
          ].map(({ val, label }) => (
            <div key={label} style={styles.statCard}>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{val}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter pills */}
      {hasResults && (
        <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={filter === f ? styles.pillActive : styles.pill}>{f}</button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasResults && (
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#9ca3af", fontSize: 14 }}>
          Hit "Run all models" to test {allModels.length} free-tier models across {groups.length} providers
        </div>
      )}

      {/* Provider groups */}
      {hasResults && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {groups.map(({ provider, meta, models: gModels }) => {
            const cards = gModels
              .map((m) => results[modelKey(m)] ?? { ...m, status: "loading" })
              .filter((r) => filter === "all" || r.status === filter);

            if (!cards.length) return null;

            const okN    = gModels.filter((m) => results[modelKey(m)]?.status === "ok").length;
            const total  = gModels.length;
            const isOpen = !collapsed[provider];

            return (
              <div key={provider} style={styles.providerCard}>

                {/* Provider header */}
                <div onClick={() => setCollapsed((prev) => ({ ...prev, [provider]: !prev[provider] }))} style={{ ...styles.providerHeader, background: meta.bg }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: meta.color, display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color, display: "inline-block" }} />
                        {meta.label}
                      </span>
                      <span style={{
                        fontSize: 11, padding: "1px 7px", borderRadius: 999, fontWeight: 600,
                        background: okN === total ? "#dcfce7" : okN === 0 ? "#fee2e2" : "#fef9c3",
                        color:      okN === total ? "#166534" : okN === 0 ? "#991b1b" : "#713f12",
                      }}>
                        {okN}/{total} ok
                      </span>
                    </div>
                    <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: "4px 10px" }}>
                      <span style={{ fontSize: 11, color: "#374151", fontFamily: "monospace", background: "rgba(0,0,0,0.05)", padding: "1px 6px", borderRadius: 4 }}>{meta.limits}</span>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>{meta.note}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: "#9ca3af" }}>{isOpen ? "▲" : "▼"}</span>
                </div>

                {/* Model cards */}
                {isOpen && (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {cards.map((r, idx) => {
                      const s = STATUS[r.status] ?? STATUS.loading;
                      return (
                        <div key={modelKey(r)} style={{ ...styles.modelCard, borderTop: idx === 0 ? "none" : "1px solid #f3f4f6" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{r.label}</span>
                            {r.ctx && r.ctx !== "—" && <Chip>{r.ctx} ctx</Chip>}
                            {r.rpd && r.rpd !== "—" && <Chip style={{ background: "#fffbeb", color: "#92400e" }}>{r.rpd} RPD</Chip>}
                            {r.ms  && <span style={{ fontSize: 12, color: "#9ca3af" }}>{(r.ms / 1000).toFixed(1)}s</span>}
                            <span style={{ fontSize: 10, color: "#d1d5db", marginLeft: "auto", fontFamily: "monospace" }}>{r.id}</span>
                          </div>

                          {r.response && (
                            <pre style={styles.responsePre}>{r.response}</pre>
                          )}
                          {r.error && (
                            <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>
                              {r.error}{r.httpStatus ? ` (HTTP ${r.httpStatus})` : ""}
                            </div>
                          )}
                          {r.status === "empty" && (
                            <div style={{ fontSize: 12, color: "#d97706", marginTop: 6 }}>Model returned 200 but no content</div>
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function Chip({ children, style = {} }) {
  return (
    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#f3f4f6", color: "#6b7280", fontFamily: "monospace", ...style }}>
      {children}
    </span>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page:          { maxWidth: 800, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" },
  splash:        { maxWidth: 800, margin: "0 auto", padding: "4rem 1rem", fontFamily: "system-ui, sans-serif", textAlign: "center" },
  header:        { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  statCard:      { background: "#f9fafb", borderRadius: 8, padding: "12px 16px" },
  pill:          { fontSize: 12, padding: "4px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "transparent", color: "#6b7280", cursor: "pointer" },
  pillActive:    { fontSize: 12, padding: "4px 12px", borderRadius: 999, border: "1px solid #111827", background: "#111827", color: "#fff", cursor: "pointer" },
  btnPrimary:    { padding: "8px 18px", fontSize: 13, fontWeight: 500, background: "#111827", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
  btnSecondary:  { padding: "6px 12px", fontSize: 12, fontWeight: 500, background: "transparent", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer" },
  btnDisabled:   { padding: "8px 18px", fontSize: 13, fontWeight: 500, background: "#f3f4f6", color: "#9ca3af", border: "none", borderRadius: 8, cursor: "not-allowed" },
  providerCard:  { border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" },
  providerHeader:{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "12px 16px", cursor: "pointer", userSelect: "none", gap: 12 },
  modelCard:     { padding: "12px 16px", background: "#fff" },
  responsePre:   { fontSize: 12, color: "#374151", background: "#f9fafb", borderRadius: 6, padding: "10px 12px", margin: 0, maxHeight: 140, overflowY: "auto", whiteSpace: "pre-wrap", lineHeight: 1.6 },
};