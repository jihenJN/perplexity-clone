"use client";
import { useEffect, useRef, useState } from "react";

const STEPS = [
  { id: "s1", label: "Searching the web" },
  { id: "s2", label: "Scanning top results" },
  { id: "s3", label: "Analyzing sources" },
  { id: "s4", label: "Crafting your answer" },
];

if (typeof document !== "undefined" && !document.getElementById("loading-steps-style")) {
  const el = document.createElement("style");
  el.id = "loading-steps-style";
  el.textContent = `
    @keyframes loadingStepsSpin { to { transform: rotate(360deg); } }
    @keyframes loadingStepsFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(el);
}

export default function LoadingSteps({ isLoadingSearch, isStreaming, hasText }) {
  const getInitialStates = () => {
    if (hasText)         return { s1: "done", s2: "done", s3: "done", s4: "active" };
    if (isStreaming)     return { s1: "done", s2: "done", s3: "active", s4: "idle" };
    if (isLoadingSearch) return { s1: "active", s2: "idle", s3: "idle", s4: "idle" };
    return                      { s1: "idle",   s2: "idle", s3: "idle", s4: "idle" };
  };

  const [states, setStates] = useState(getInitialStates);
  const [visible, setVisible] = useState(isLoadingSearch || isStreaming || hasText);
  const timers = useRef([]);

  const mark = (updates) => setStates((prev) => ({ ...prev, ...updates }));
  const addTimer = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (!isLoadingSearch) return;
    setVisible(true);
    setStates({ s1: "active", s2: "idle", s3: "idle", s4: "idle" });
    addTimer(() => mark({ s2: "active" }), 950);
  }, [isLoadingSearch]);

  useEffect(() => {
    if (!isStreaming || isLoadingSearch) return;
    setVisible(true);
    mark({ s1: "done", s2: "done", s3: "active" });
  }, [isStreaming, isLoadingSearch]);

  useEffect(() => {
    if (!hasText) return;
    setVisible(true);
    mark({ s3: "done", s4: "active" });
  }, [hasText]);

  useEffect(() => {
    if (isLoadingSearch || isStreaming) return;
    if (!visible) return;
    mark({ s1: "done", s2: "done", s3: "done", s4: "done" });
    addTimer(() => setVisible(false), 600);
  }, [isLoadingSearch, isStreaming]);

  if (!visible) return null;

  return (
    <div className="mt-4 mb-2">
      {STEPS.map(({ id, label }, i) => {
        const st = states[id];
        const isLast = i === STEPS.length - 1;
        return (
          <div
            key={id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              animation: "loadingStepsFadeIn 0.3s ease both",
              animationDelay: `${i * 50}ms`,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <StepIcon state={st} />
              {!isLast && (
                <div style={{
                  width: "1.5px",
                  height: "22px",
                  background: st === "done" ? "var(--muted-foreground)" : "var(--border)",
                  transition: "background 0.4s ease",
                }} />
              )}
            </div>
            <span style={{
              fontSize: "13.5px",
              paddingTop: "2px",
              paddingBottom: isLast ? 0 : "4px",
              fontWeight: st === "active" ? 500 : 400,
              color:
                st === "active" ? "var(--foreground)" :
                st === "done"   ? "var(--muted-foreground)" :
                                  "color-mix(in oklch, var(--muted-foreground) 50%, transparent)",
              transition: "color 0.25s ease, font-weight 0.2s ease",
              lineHeight: 1.5,
            }}>
              {label}
              {st === "active" && <AnimatedDots />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StepIcon({ state }) {
  const base = {
    width: "22px", height: "22px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, transition: "all 0.25s ease",
  };

  if (state === "done") return (
    <div style={{ ...base, background: "var(--foreground)" }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2 6l3 3 5-5" stroke="var(--background)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );

  if (state === "active") return (
    <div style={{ ...base, border: "1.5px solid var(--foreground)" }}>
      <div style={{
        width: "10px", height: "10px", borderRadius: "50%",
        border: "1.5px solid transparent",
        borderTopColor: "var(--foreground)",
        animation: "loadingStepsSpin 0.7s linear infinite",
      }} />
    </div>
  );

  return (
    <div style={{ ...base, border: "1px solid var(--border)" }}>
      <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--border)" }} />
    </div>
  );
}

function AnimatedDots() {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d % 3) + 1), 420);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>
      {".".repeat(dots)}
    </span>
  );
}
