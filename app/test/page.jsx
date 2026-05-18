"use client";
import { useState } from "react";

const MODELS = [
  { id: "inclusionai/ring-2.6-1t:free", label: "Ring 2.6 1T" },
  { id: "baidu/cobuddy:free", label: "Baidu CoBuddy" },
  { id: "openrouter/owl-alpha", label: "Owl Alpha" },
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", label: "Nemotron Nano Omni 30B" },
  { id: "poolside/laguna-xs.2:free", label: "Laguna XS.2" },
  { id: "poolside/laguna-m.1:free", label: "Laguna M.1" },
  { id: "deepseek/deepseek-v4-flash:free", label: "DeepSeek V4 Flash" },
  { id: "google/gemma-4-26b-a4b-it:free", label: "Gemma 4 26B MoE" },
  { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B" },
  { id: "arcee-ai/trinity-large-thinking:free", label: "Trinity Large Thinking" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super 120B" },
  { id: "minimax/minimax-m2.5:free", label: "MiniMax M2.5" },
  { id: "openrouter/free", label: "OpenRouter Free Router" },
  { id: "liquid/lfm-2.5-1.2b-thinking:free", label: "LFM 1.2B Thinking" },
  { id: "liquid/lfm-2.5-1.2b-instruct:free", label: "LFM 1.2B Instruct" },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", label: "Nemotron 3 Nano 30B" },
  { id: "nvidia/nemotron-nano-12b-v2-vl:free", label: "Nemotron Nano 12B VL" },
  { id: "qwen/qwen3-next-80b-a3b-instruct:free", label: "Qwen3 Next 80B" },
  { id: "nvidia/nemotron-nano-9b-v2:free", label: "Nemotron Nano 9B V2" },
  { id: "openai/gpt-oss-120b:free", label: "GPT OSS 120B" },
  { id: "openai/gpt-oss-20b:free", label: "GPT OSS 20B" },
  { id: "z-ai/glm-4.5-air:free", label: "GLM 4.5 Air" },
  { id: "qwen/qwen3-coder:free", label: "Qwen3 Coder 480B" },
  { id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", label: "Venice Uncensored" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B" },
  { id: "meta-llama/llama-3.2-3b-instruct:free", label: "Llama 3.2 3B" },
  { id: "nousresearch/hermes-3-llama-3.1-405b:free", label: "Hermes 3 405B" },
];

const PROMPT = `You are given a broken JavaScript function:
\`\`\`js
function fetchData(url) {
  let result;
  fetch(url).then(res => res.json()).then(data => {
    result = data;
  });
  return result;
}
\`\`\`
Do the following:
1. Explain why this function is broken
2. Fix it
3. Add error handling
4. Give one real-world use case for it
Be concise and clear.`;

const STATUS_STYLES = {
  ok:      { bg: "#f0fdf4", color: "#166534", label: "ok" },
  error:   { bg: "#fef2f2", color: "#991b1b", label: "error" },
  empty:   { bg: "#fffbeb", color: "#92400e", label: "empty" },
  loading: { bg: "#eff6ff", color: "#1e40af", label: "..." },
};

export default function TestPage() {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [filter, setFilter] = useState("all");

  async function testOne(model) {
    const start = Date.now();
    try {
      const res = await fetch("/api/test-models/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: model.id, prompt: PROMPT }),
      });
      const data = await res.json();
      const ms = Date.now() - start;
      const response = data.choices?.[0]?.message?.content ?? "(empty)";
      return { ...model, status: response === "(empty)" ? "empty" : "ok", response, ms, httpStatus: res.status };
    } catch (e) {
      return { ...model, status: "error", error: e.message, ms: Date.now() - start, httpStatus: 0 };
    }
  }

  async function runTests() {
    setRunning(true);
    setDone(0);
    setFilter("all");
    const initial = MODELS.map((m) => ({ ...m, status: "loading" }));
    setResults(initial);

    await Promise.all(
      MODELS.map(async (model, i) => {
        const result = await testOne(model);
        setResults((prev) => {
          const updated = [...prev];
          updated[i] = result;
          return updated;
        });
        setDone((d) => d + 1);
      })
    );

   setResults((prev) =>
  [...prev].sort((a, b) => {
    const o = { ok: 0, empty: 1, error: 2, loading: 3 };
    if (a.status === "ok" && b.status === "ok") return a.ms - b.ms;
    return (o[a.status] ?? 3) - (o[b.status] ?? 3);
  })
);
    setRunning(false);
  }

  const filtered = filter === "all" ? results : results.filter((r) => r.status === filter);
  const okCount = results.filter((r) => r.status === "ok").length;
  const errCount = results.filter((r) => r.status === "error" || r.status === "empty").length;
  const times = results.filter((r) => r.ms && r.status === "ok").map((r) => r.ms);
  const avgMs = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Model test runner</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {running && <span style={{ fontSize: 13, color: "#6b7280" }}>{done}/{MODELS.length}</span>}
          <button
            onClick={runTests}
            disabled={running}
            style={{
              padding: "8px 18px", fontSize: 13, fontWeight: 500,
              background: running ? "#f3f4f6" : "#111827", color: running ? "#9ca3af" : "#fff",
              border: "none", borderRadius: 8, cursor: running ? "not-allowed" : "pointer",
            }}
          >
            {running ? "Running..." : results.length ? "Run again" : "▶ Run all models"}
          </button>
        </div>
      </div>

      {/* Stats */}
      {results.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: "1.5rem" }}>
          {[
            { val: okCount || "—", label: "Working" },
            { val: errCount || "—", label: "Failed" },
            { val: avgMs ? (avgMs / 1000).toFixed(1) + "s" : "—", label: "Avg response" },
          ].map(({ val, label }) => (
            <div key={label} style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{val}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {results.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
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

      {/* Cards */}
      {results.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#9ca3af", fontSize: 14 }}>
          Hit "Run all models" to test all 27 free models at once
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((r) => {
            const s = STATUS_STYLES[r.status] ?? STATUS_STYLES.loading;
            return (
              <div key={r.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 600, background: s.bg, color: s.color }}>
                    {s.label}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{r.label}</span>
                  {r.ms && <span style={{ fontSize: 12, color: "#9ca3af" }}>{(r.ms / 1000).toFixed(1)}s</span>}
                  <span style={{ fontSize: 11, color: "#d1d5db", marginLeft: "auto" }}>{r.id}</span>
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
                    {r.error} {r.httpStatus ? `(HTTP ${r.httpStatus})` : ""}
                  </div>
                )}
                {r.status === "empty" && (
                  <div style={{ fontSize: 12, color: "#d97706", marginTop: 6 }}>
                    Model responded 200 but returned no content
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