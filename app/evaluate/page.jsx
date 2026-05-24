"use client";
/**
 * Model Capability Evaluator — page component
 * Save as: app/(your-route)/evaluate/page.jsx  (or replace your existing page.jsx)
 *
 * Calls POST /api/test-models/evaluate for each model, which returns:
 *   { ms, responseText, capabilityScores, ratings }
 *
 * Displays two views:
 *   Cards  — one card per model with rating bars + capability badges
 *   Matrix — scrollable grid of models × capabilities
 */

import { useState, useEffect, useMemo, useCallback } from "react";

// ─── Capability metadata ──────────────────────────────────────────────────────

const CAPABILITIES = {
  WRITING:   { label: "Writing",       icon: "✍️",  color: "#db2777", bg: "#fdf2f8", border: "#fbcfe8" },
  CODE:      { label: "Code",          icon: "💻",  color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  TRANSLATE: { label: "Translation",   icon: "🌐",  color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  SUMMARIZE: { label: "Summarization", icon: "📄",  color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  ANALYZE:   { label: "Analysis",      icon: "📊",  color: "#059669", bg: "#f0fdf4", border: "#a7f3d0" },
  CALCULATE: { label: "Math",          icon: "🔢",  color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  KNOWLEDGE: { label: "Knowledge",     icon: "🔍",  color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
};

const CAP_KEYS = Object.keys(CAPABILITIES);

// ─── Provider metadata ────────────────────────────────────────────────────────

const PROVIDER_META = {
  groq:        { label: "Groq",        color: "#f97316", limits: "30 RPM · 1K RPD",      note: "LPU — fastest inference" },
  cerebras:    { label: "Cerebras",    color: "#7c3aed", limits: "1M tok/day",            note: "Wafer-Scale Engine" },
  gemini:      { label: "Gemini",      color: "#1d9bf0", limits: "10–15 RPM · 250–1K RPD",note: "No credit card" },
  nvidia:      { label: "NVIDIA NIM",  color: "#16a34a", limits: "Credits-based",         note: "Free credits on signup" },
  openrouter:  { label: "OpenRouter",  color: "#6366f1", limits: "200 RPD/model",         note: ":free model suffix" },
  agentrouter: { label: "AgentRouter", color: "#64748b", limits: "Varies",                note: "Auto-routes to best" },
  mistral:     { label: "Mistral",     color: "#ea580c", limits: "~1B tok/month",         note: "EU · GDPR · Codestral" },
};

const PROVIDER_ORDER = ["groq", "cerebras", "gemini", "mistral", "nvidia", "openrouter", "agentrouter"];

// ─── Rating dimension config ──────────────────────────────────────────────────

const RATING_DIMS = [
  { key: "speed",      label: "Speed",       color: "#2563eb", icon: "⚡" },
  { key: "accuracy",   label: "Accuracy",    color: "#059669", icon: "🎯" },
  { key: "usageLimit", label: "Usage Limit", color: "#d97706", icon: "📦" },
  { key: "stability",  label: "Stability",   color: "#7c3aed", icon: "🛡️" },
];

// ─── Export helpers ───────────────────────────────────────────────────────────

function buildExportRows(results) {
  return results
    .filter((r) => r.status === "ok")
    .map((r) => ({
      model:        r.id,
      label:        r.label,
      provider:     r.provider,
      ms:           r.ms,
      ratings:      r.ratings,
      capabilities: r.capabilityScores,
      overall:      parseFloat(overallRating(r.ratings).toFixed(2)),
    }));
}

function exportJSON(results) {
  const rows = buildExportRows(results);
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  triggerDownload(blob, `model-eval-${nowStamp()}.json`);
}

function exportCSV(results) {
  const capKeys = Object.keys(CAPABILITIES);
  const header  = ["model", "label", "provider", "latency_ms", "speed", "accuracy", "usageLimit", "stability", "overall", ...capKeys.map((c) => `cap_${c}`)].join(",");
  const rows    = buildExportRows(results).map((r) => [
    `"${r.model}"`,
    `"${r.label}"`,
    r.provider,
    r.ms,
    r.ratings.speed,
    r.ratings.accuracy,
    r.ratings.usageLimit,
    r.ratings.stability,
    r.overall,
    ...capKeys.map((c) => r.capabilities?.[c] ?? ""),
  ].join(","));
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  triggerDownload(blob, `model-eval-${nowStamp()}.csv`);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function nowStamp() {
  return new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const modelKey = (m) => `${m.provider}:${m.id}`;

function overallRating(ratings) {
  if (!ratings) return 0;
  const { speed, accuracy, usageLimit, stability } = ratings;
  return (speed + accuracy + usageLimit + stability) / 4;
}

function capOverall(capabilityScores) {
  if (!capabilityScores) return 0;
  const vals = Object.values(capabilityScores);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Map a 1–5 value to a colour along red → amber → green. */
function scoreColor(score) {
  if (score >= 4.0) return "#16a34a";
  if (score >= 3.0) return "#d97706";
  if (score >= 2.0) return "#dc2626";
  return "#9ca3af";
}

function scoreBarBg(score) {
  if (score >= 4.0) return "#dcfce7";
  if (score >= 3.0) return "#fef9c3";
  if (score >= 2.0) return "#fee2e2";
  return "#f3f4f6";
}

function formatMs(ms) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RatingBar({ label, icon, value, color, subtitle, max = 5 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10 }}>{icon}</span>
          {label}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(value) }}>{value.toFixed(1)}</span>
          <span style={{ fontSize: 10, color: "#d1d5db" }}>/{max}</span>
          {subtitle && (
            <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 2, fontFamily: "monospace" }}>
              · {subtitle}
            </span>
          )}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "#f3f4f6", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 999,
            background: color,
            transition: "width 0.7s cubic-bezier(.4,0,.2,1)",
          }}
        />
      </div>
    </div>
  );
}

function CapBadge({ cap, score, compact = false }) {
  const meta = CAPABILITIES[cap];
  const active = score >= 3;
  return (
    <span
      title={`${meta.label}: ${score}/5`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: compact ? 9 : 10,
        padding: compact ? "1px 5px" : "2px 8px",
        borderRadius: 999,
        fontWeight: 600,
        background: active ? meta.bg : "#f9fafb",
        color: active ? meta.color : "#d1d5db",
        border: `1px solid ${active ? meta.border : "#f0f0f0"}`,
        transition: "all 0.2s",
        whiteSpace: "nowrap",
      }}
    >
      {meta.icon}
      {!compact && ` ${meta.label}`}
      {active && !compact && (
        <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.8 }}>{score}</span>
      )}
    </span>
  );
}

function StatusPill({ status }) {
  const map = {
    loading: { bg: "#eff6ff", color: "#1e40af", text: "evaluating…" },
    ok:      { bg: "#f0fdf4", color: "#166534", text: "evaluated" },
    error:   { bg: "#fef2f2", color: "#991b1b", text: "error" },
  };
  const s = map[status] ?? map.loading;
  return (
    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.text}
    </span>
  );
}

// ─── Export menu ──────────────────────────────────────────────────────────────

function ExportMenu({ results, disabled }) {
  const [open, setOpen] = useState(false);
  const okCount = results.filter((r) => r.status === "ok").length;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        style={{
          padding:      "7px 13px",
          fontSize:     12,
          fontWeight:   600,
          background:   disabled ? "#f3f4f6" : "#fff",
          color:        disabled ? "#9ca3af" : "#374151",
          border:       "1px solid #e5e7eb",
          borderRadius: 9,
          cursor:       disabled ? "not-allowed" : "pointer",
          display:      "flex",
          alignItems:   "center",
          gap:          5,
        }}
      >
        ↓ Export
        <span style={{ fontSize: 10, color: "#9ca3af" }}>({okCount})</span>
        <span style={{ fontSize: 9, marginLeft: 2 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 10 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position:     "absolute",
              top:          "calc(100% + 6px)",
              right:        0,
              zIndex:       20,
              background:   "#fff",
              border:       "1px solid #e5e7eb",
              borderRadius: 10,
              boxShadow:    "0 8px 24px rgba(0,0,0,0.10)",
              minWidth:     200,
              overflow:     "hidden",
            }}
          >
            {/* Header */}
            <div style={{ padding: "8px 14px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Export {okCount} evaluated models
              </span>
            </div>

            {/* JSON */}
            <button
              onClick={() => { exportJSON(results); setOpen(false); }}
              style={menuItemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 16 }}>{ }</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>JSON</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>Full scores · ratings · responses</div>
              </div>
            </button>

            {/* CSV */}
            <button
              onClick={() => { exportCSV(results); setOpen(false); }}
              style={menuItemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 16 }}>📊</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>CSV</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>Flat table · open in Excel / Sheets</div>
              </div>
            </button>

            {/* Copy JSON */}
            <button
              onClick={() => {
                const rows = buildExportRows(results);
                navigator.clipboard.writeText(JSON.stringify(rows, null, 2));
                setOpen(false);
              }}
              style={{ ...menuItemStyle, borderTop: "1px solid #f3f4f6" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 16 }}>📋</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>Copy JSON</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>To clipboard</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const menuItemStyle = {
  width:       "100%",
  padding:     "10px 14px",
  display:     "flex",
  alignItems:  "center",
  gap:         10,
  border:      "none",
  background:  "transparent",
  cursor:      "pointer",
  transition:  "background 0.1s",
};

// ─── Model Card ───────────────────────────────────────────────────────────────

function ModelCard({ result, expanded, onToggle }) {
  const pm       = PROVIDER_META[result.provider] ?? {};
  const overall  = overallRating(result.ratings);
  const isReady  = result.status === "ok";
  const isError  = result.status === "error";
  const spinning = result.status === "loading";

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        e.currentTarget.style.borderColor = "#d1d5db";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
        e.currentTarget.style.borderColor = "#e5e7eb";
      }}
    >
      {/* ── Card header ─────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 18px", cursor: "pointer" }} onClick={onToggle}>
        {/* Top row: provider + model id + status + overall score */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: pm.color ?? "#9ca3af", flexShrink: 0, display: "inline-block" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: pm.color ?? "#6b7280" }}>{pm.label}</span>
              <StatusPill status={result.status} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", lineHeight: 1.3, wordBreak: "break-word" }}>
              {result.label}
            </div>
            <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: "monospace", marginTop: 2 }}>
              {result.id}
            </div>
          </div>

          {/* Overall score ring */}
          {isReady && (
            <div style={{ textAlign: "center", flexShrink: 0, marginLeft: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: `conic-gradient(${scoreColor(overall)} ${(overall / 5) * 360}deg, #f3f4f6 0deg)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: scoreColor(overall) }}>
                    {overall.toFixed(1)}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 3 }}>overall</div>
            </div>
          )}

          {spinning && (
            <div style={{ fontSize: 20, animation: "spin 1.2s linear infinite", flexShrink: 0, marginLeft: 12 }}>
              ⟳
            </div>
          )}
        </div>

        {/* Capability badges — show when evaluated */}
        {isReady && result.capabilityScores && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
            {CAP_KEYS.map((cap) => (
              <CapBadge key={cap} cap={cap} score={result.capabilityScores[cap] ?? 1} />
            ))}
          </div>
        )}

        {/* Rating bars */}
        {isReady && result.ratings && (
          <div>
            {RATING_DIMS.map(({ key, label, icon, color }) => (
              <RatingBar
                key={key}
                label={label}
                icon={icon}
                value={result.ratings[key]}
                color={color}
                subtitle={
                  key === "speed"      ? formatMs(result.ms) :
                  key === "usageLimit" ? pm.limits :
                  undefined
                }
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div style={{ fontSize: 12, color: "#dc2626", background: "#fef2f2", padding: "8px 12px", borderRadius: 8, marginTop: 6 }}>
            ✗ {result.error}
          </div>
        )}

        {/* Expand toggle */}
        {isReady && result.responseText && (
          <div style={{ marginTop: 10, fontSize: 11, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 9 }}>{expanded ? "▲" : "▼"}</span>
            {expanded ? "Hide" : "Show"} full response
          </div>
        )}
      </div>

      {/* ── Expandable response ──────────────────────────────────────────── */}
      {expanded && result.responseText && (
        <div style={{ borderTop: "1px solid #f3f4f6" }}>
          {/* Per-section extraction */}
          {CAP_KEYS.map((cap) => {
            const meta = CAPABILITIES[cap];
            const esc  = cap.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const re   = new RegExp(`\\[${esc}\\]([\\s\\S]*?)(?=\\[[A-Z]+\\]|$)`, "i");
            const m    = result.responseText.match(re);
            const text = m ? m[1].trim() : "";
            const score = result.capabilityScores?.[cap] ?? 0;
            if (!text) return null;
            return (
              <div key={cap} style={{ borderBottom: "1px solid #f9fafb" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 18px",
                    background: meta.bg,
                    borderBottom: `1px solid ${meta.border}`,
                  }}
                >
                  <span style={{ fontSize: 11 }}>{meta.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 4,
                      background: scoreBarBg(score),
                      color: scoreColor(score),
                      fontWeight: 700,
                      marginLeft: "auto",
                    }}
                  >
                    {score}/5
                  </span>
                </div>
                <pre
                  style={{
                    fontSize: 11,
                    color: "#374151",
                    padding: "10px 18px",
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.65,
                    background: "#fff",
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
                >
                  {text}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Capability Matrix ────────────────────────────────────────────────────────

function CapabilityMatrix({ results }) {
  const rows = results.filter((r) => r.status === "ok" && r.capabilityScores);

  if (!rows.length) {
    return (
      <div style={{ textAlign: "center", color: "#9ca3af", padding: "3rem 1rem", fontSize: 14 }}>
        No evaluated models yet — run an evaluation first.
      </div>
    );
  }

  // Sort by capability average descending
  const sorted = [...rows].sort((a, b) => capOverall(b.capabilityScores) - capOverall(a.capabilityScores));

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
            <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#374151", minWidth: 170 }}>
              Model
            </th>
            {CAP_KEYS.map((cap) => (
              <th
                key={cap}
                style={{
                  padding: "8px 10px",
                  textAlign: "center",
                  fontWeight: 700,
                  color: CAPABILITIES[cap].color,
                  whiteSpace: "nowrap",
                  minWidth: 80,
                }}
              >
                <div style={{ fontSize: 14 }}>{CAPABILITIES[cap].icon}</div>
                <div style={{ fontSize: 10 }}>{CAPABILITIES[cap].label}</div>
              </th>
            ))}
            <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#374151", minWidth: 70 }}>
              Avg
            </th>
            <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#2563eb", minWidth: 70 }}>
              ⚡ Speed
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const pm  = PROVIDER_META[r.provider] ?? {};
            const avg = capOverall(r.capabilityScores);
            return (
              <tr
                key={modelKey(r)}
                style={{
                  borderBottom: "1px solid #f3f4f6",
                  background: i % 2 === 0 ? "#fff" : "#fafafa",
                }}
              >
                {/* Model name */}
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ fontWeight: 700, color: "#111827" }}>{r.label}</div>
                  <div style={{ fontSize: 10, color: pm.color ?? "#9ca3af", fontWeight: 600 }}>{pm.label}</div>
                </td>

                {/* Capability cells */}
                {CAP_KEYS.map((cap) => {
                  const score = r.capabilityScores[cap] ?? 0;
                  return (
                    <td key={cap} style={{ padding: "8px 10px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: scoreBarBg(score),
                          color: scoreColor(score),
                          minWidth: 26,
                        }}
                      >
                        {score}
                      </span>
                    </td>
                  );
                })}

                {/* Average */}
                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: scoreColor(avg),
                    }}
                  >
                    {avg.toFixed(1)}
                  </span>
                </td>

                {/* Speed */}
                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>
                    {r.ms ? formatMs(r.ms) : "—"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Best-for summary strip ───────────────────────────────────────────────────

function BestForStrip({ results }) {
  const ready = results.filter((r) => r.status === "ok" && r.capabilityScores);
  if (ready.length < 2) return null;

  // For each capability, find the model with the highest score
  const bestFor = CAP_KEYS.map((cap) => {
    const best = ready.reduce((b, r) =>
      (r.capabilityScores[cap] ?? 0) > (b.capabilityScores[cap] ?? 0) ? r : b
    , ready[0]);
    return { cap, model: best, score: best.capabilityScores[cap] ?? 0 };
  });

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
        Best model per capability
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {bestFor.map(({ cap, model, score }) => {
          const meta = CAPABILITIES[cap];
          const pm   = PROVIDER_META[model.provider] ?? {};
          return (
            <div
              key={cap}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 10,
                background: meta.bg,
                border: `1px solid ${meta.border}`,
              }}
            >
              <span style={{ fontSize: 14 }}>{meta.icon}</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{meta.label}</div>
                <div style={{ fontSize: 10, color: "#374151", fontWeight: 600 }}>
                  {model.label}
                  <span style={{ color: "#9ca3af", fontWeight: 400 }}> · {pm.label}</span>
                  <span style={{ color: scoreColor(score), marginLeft: 4 }}>{score}/5</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EvaluatePage() {
  const [models,   setModels]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState(null);
  const [results,  setResults]  = useState({});
  const [running,  setRunning]  = useState(false);
  const [done,     setDone]     = useState(0);
  const [capFilter,setCapFilter]= useState("ALL");   // "ALL" or a CAP_KEY
  const [sort,     setSort]     = useState("score"); // "score"|"speed"|"accuracy"|"usage"|"stability"
  const [view,     setView]     = useState("cards"); // "cards"|"matrix"
  const [expanded, setExpanded] = useState({});      // modelKey → bool

  // ── Load model list ────────────────────────────────────────────────────────

  const loadModels = useCallback(async () => {
    setLoading(true);
    setFetchErr(null);
    try {
      const res  = await fetch("/api/fetch-models");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setModels(data.models ?? []);
      if (data.errors && Object.keys(data.errors).length > 0) {
        setFetchErr(
          "Partial failure: " +
          Object.entries(data.errors).map(([p, e]) => `${p}: ${e}`).join(", ")
        );
      }
    } catch (e) {
      setFetchErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadModels(); }, [loadModels]);

  // ── Evaluate one model ─────────────────────────────────────────────────────

  async function evaluateOne(model) {
    const wallStart = Date.now();
    try {
      const res  = await fetch("/api/test-models/evaluate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ provider: model.provider, modelId: model.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ...model, status: "error", error: data.error ?? `HTTP ${res.status}`, ms: Date.now() - wallStart };
      }
      return { ...model, status: "ok", ...data };
    } catch (e) {
      return { ...model, status: "error", error: e.message, ms: Date.now() - wallStart };
    }
  }

  // ── Run all evaluations ────────────────────────────────────────────────────

  async function runAll() {
    if (!models.length || running) return;
    setRunning(true);
    setDone(0);
    setView("cards");
    setCapFilter("ALL");

    // Seed all as loading
    setResults(
      Object.fromEntries(models.map((m) => [modelKey(m), { ...m, status: "loading" }]))
    );

    // Fire all in parallel — each model is one API call
    await Promise.all(
      models.map(async (model) => {
        const result = await evaluateOne(model);
        setResults((prev) => ({ ...prev, [modelKey(model)]: result }));
        setDone((d) => d + 1);
      })
    );

    setRunning(false);
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const allResults = useMemo(() => Object.values(results), [results]);
  const hasResults = allResults.length > 0;
  const okResults  = allResults.filter((r) => r.status === "ok");
  const errCount   = allResults.filter((r) => r.status === "error").length;

  const avgOverall = okResults.length
    ? (okResults.reduce((a, r) => a + overallRating(r.ratings), 0) / okResults.length).toFixed(2)
    : null;

  const bestModel = okResults.length
    ? okResults.reduce((b, r) => overallRating(r.ratings) > overallRating(b.ratings) ? r : b, okResults[0])
    : null;

  const fastestModel = okResults.length
    ? okResults.reduce((b, r) => (r.ms ?? Infinity) < (b.ms ?? Infinity) ? r : b, okResults[0])
    : null;

  // Filtered + sorted list for the cards view
  const displayList = useMemo(() => {
    let list = allResults;

    // Capability filter: keep models that scored ≥ 3 in that cap
    if (capFilter !== "ALL") {
      list = list.filter(
        (r) => r.status === "loading" || (r.capabilityScores?.[capFilter] ?? 0) >= 3
      );
    }

    // Sort (loading items always floated to top while running)
    return [...list].sort((a, b) => {
      if (a.status === "loading" && b.status !== "loading") return -1;
      if (b.status === "loading" && a.status !== "loading") return  1;
      if (a.status === "error"   && b.status !== "error")   return  1;
      if (b.status === "error"   && a.status !== "error")   return -1;

      switch (sort) {
        case "speed":     return (b.ratings?.speed      ?? 0) - (a.ratings?.speed      ?? 0);
        case "accuracy":  return (b.ratings?.accuracy   ?? 0) - (a.ratings?.accuracy   ?? 0);
        case "usage":     return (b.ratings?.usageLimit ?? 0) - (a.ratings?.usageLimit ?? 0);
        case "stability": return (b.ratings?.stability  ?? 0) - (a.ratings?.stability  ?? 0);
        default:          return overallRating(b.ratings) - overallRating(a.ratings);
      }
    });
  }, [allResults, capFilter, sort]);

  // ── Loading splash ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ ...S.page, textAlign: "center", padding: "5rem 1rem 4rem" }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🧪</div>
        <div style={{ fontSize: 15, color: "#6b7280" }}>Fetching models from providers…</div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
          Groq · Cerebras · Gemini · NVIDIA · OpenRouter · Mistral
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={S.header}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#111827" }}>
            Model Capability Evaluator
          </h1>
          <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>
            {models.length} free-tier models · 7 capability dimensions · 4 quality metrics
          </p>
          {fetchErr && (
            <p style={{ fontSize: 11, color: "#dc2626", margin: "4px 0 0" }}>{fetchErr}</p>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <button onClick={loadModels} disabled={loading} style={S.btnSecondary}>
            ↻ Refresh
          </button>
          <ExportMenu results={allResults} disabled={!hasResults || running} />
          {running && (
            <span style={{ fontSize: 13, color: "#6b7280", fontVariantNumeric: "tabular-nums" }}>
              {done}/{models.length}
            </span>
          )}
          <button
            onClick={runAll}
            disabled={running || !models.length}
            style={running || !models.length ? S.btnDisabled : S.btnPrimary}
          >
            {running ? `Evaluating… ${done}/${models.length}` : hasResults ? "Re-evaluate All" : "Evaluate All Models"}
          </button>
        </div>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      {hasResults && okResults.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: "1.5rem" }}>
          {[
            { val: okResults.length,                                         label: "Evaluated",    sub: `of ${models.length}` },
            { val: avgOverall ? `${avgOverall}/5` : "—",                     label: "Avg score",    sub: "overall" },
            { val: bestModel?.label?.split("-").slice(0, 2).join("-") ?? "—",label: "Top model",    sub: PROVIDER_META[bestModel?.provider]?.label ?? "", small: true },
            { val: fastestModel ? formatMs(fastestModel.ms) : "—",           label: "Fastest",      sub: fastestModel?.label?.split("-")[0] ?? "", small: true },
          ].map(({ val, label, sub, small }) => (
            <div key={label} style={S.statCard}>
              <div style={{ fontSize: small ? 13 : 20, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>{val}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{label}</div>
              {sub && <div style={{ fontSize: 10, color: "#9ca3af" }}>{sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── Best-for strip ────────────────────────────────────────────────── */}
      {okResults.length >= 2 && <BestForStrip results={okResults} />}

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      {hasResults && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "1.25rem", alignItems: "center" }}>
          {/* View toggle */}
          <div style={{ display: "flex", border: "1px solid #e5e7eb", borderRadius: 9, overflow: "hidden", marginRight: 4 }}>
            {[
              { v: "cards",  label: "⊞ Cards" },
              { v: "matrix", label: "⊟ Matrix" },
            ].map(({ v, label }) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "5px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: view === v ? "#111827" : "transparent",
                  color:      view === v ? "#fff"    : "#6b7280",
                  transition: "background 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Capability filter pills */}
          {["ALL", ...CAP_KEYS].map((cap) => {
            const meta   = cap === "ALL" ? null : CAPABILITIES[cap];
            const active = capFilter === cap;
            return (
              <button
                key={cap}
                onClick={() => setCapFilter(cap)}
                style={{
                  fontSize: 11,
                  padding: "4px 11px",
                  borderRadius: 999,
                  border: `1.5px solid ${active ? (meta?.color ?? "#111827") : "#e5e7eb"}`,
                  background:  active ? (meta?.color ?? "#111827") : "transparent",
                  color:       active ? "#fff" : (meta?.color ?? "#6b7280"),
                  cursor:      "pointer",
                  fontWeight:  active ? 700 : 400,
                  transition:  "all 0.15s",
                }}
              >
                {meta ? `${meta.icon} ${meta.label}` : "All"}
              </button>
            );
          })}

          {/* Sort selector */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>Sort by</span>
            {[
              { s: "score",     label: "Score" },
              { s: "speed",     label: "Speed" },
              { s: "accuracy",  label: "Accuracy" },
              { s: "usage",     label: "Usage" },
              { s: "stability", label: "Stability" },
            ].map(({ s, label }) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                style={{
                  fontSize: 11,
                  padding: "3px 9px",
                  borderRadius: 7,
                  border: "1px solid #e5e7eb",
                  background: sort === s ? "#f3f4f6" : "transparent",
                  color:      sort === s ? "#111827" : "#9ca3af",
                  cursor:     "pointer",
                  fontWeight: sort === s ? 700 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!hasResults && !running && (
        <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧪</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
            Ready to evaluate {models.length} models
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
            Each model is tested across 7 capabilities in a single API call,
            then rated on speed, accuracy, usage limits, and stability.
          </div>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {hasResults && (
        view === "matrix" ? (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
            {/* Legend */}
            <div style={{ padding: "10px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Score:</span>
              {[
                { label: "4–5 Excellent", bg: "#dcfce7", color: "#166534" },
                { label: "3–4 Good",      bg: "#fef9c3", color: "#713f12" },
                { label: "2–3 Weak",      bg: "#fee2e2", color: "#991b1b" },
                { label: "1–2 Poor",      bg: "#f3f4f6", color: "#9ca3af" },
              ].map(({ label, bg, color }) => (
                <span key={label} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: bg, color, fontWeight: 600 }}>
                  {label}
                </span>
              ))}
            </div>
            <CapabilityMatrix results={displayList} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12 }}>
            {displayList.map((r) => {
              const key = modelKey(r);
              return (
                <ModelCard
                  key={key}
                  result={r}
                  expanded={!!expanded[key]}
                  onToggle={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
                />
              );
            })}
          </div>
        )
      )}

      {/* Error summary */}
      {errCount > 0 && (
        <div style={{ marginTop: 16, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
          {errCount} model{errCount > 1 ? "s" : ""} failed to respond.
          {" "}Check API keys and rate limits.
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  page: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "2rem 1rem 4rem",
    fontFamily: "'system-ui', '-apple-system', sans-serif",
  },
  header: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "flex-start",
    marginBottom:   "1.5rem",
    gap:            16,
    flexWrap:       "wrap",
  },
  statCard: {
    background:   "#f9fafb",
    borderRadius: 10,
    padding:      "12px 16px",
    border:       "1px solid #f3f4f6",
  },
  btnPrimary: {
    padding:      "9px 20px",
    fontSize:     13,
    fontWeight:   700,
    background:   "#111827",
    color:        "#fff",
    border:       "none",
    borderRadius: 9,
    cursor:       "pointer",
  },
  btnSecondary: {
    padding:      "7px 13px",
    fontSize:     12,
    fontWeight:   500,
    background:   "transparent",
    color:        "#6b7280",
    border:       "1px solid #e5e7eb",
    borderRadius: 9,
    cursor:       "pointer",
  },
  btnDisabled: {
    padding:      "9px 20px",
    fontSize:     13,
    fontWeight:   700,
    background:   "#f3f4f6",
    color:        "#9ca3af",
    border:       "none",
    borderRadius: 9,
    cursor:       "not-allowed",
  },
};