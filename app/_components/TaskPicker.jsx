"use client"

import { useState, useRef, useEffect } from "react"
import {
  Search, Atom, Pencil, Code2, Languages, FileText, BarChart2, Calculator,
  ChevronDown, Check,
} from "lucide-react"

export const TASK_CONFIG = {
  SEARCH:    { label: "Search",        icon: Search,     color: "#0d9488" },
  RESEARCH:  { label: "Research",      icon: Atom,       color: "#7c3aed" },
  WRITING:   { label: "Writing",       icon: Pencil,     color: "#db2777" },
  CODE:      { label: "Code",          icon: Code2,      color: "#6366f1" },
  TRANSLATE: { label: "Translation",   icon: Languages,  color: "#0891b2" },
  SUMMARIZE: { label: "Summarization", icon: FileText,   color: "#d97706" },
  ANALYZE:   { label: "Analysis",      icon: BarChart2,  color: "#059669" },
  CALCULATE: { label: "Math",          icon: Calculator, color: "#2563eb" },
}

// Keys shown above the separator
const TOP_KEYS = ["SEARCH", "RESEARCH"]
// Keys shown below the separator
const BOTTOM_KEYS = ["WRITING", "CODE", "TRANSLATE", "SUMMARIZE", "ANALYZE", "CALCULATE"]

export const ALL_TASK_KEYS = [...TOP_KEYS, ...BOTTOM_KEYS]

export function TaskPicker({ value = "SEARCH", onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const active = TASK_CONFIG[value] ?? TASK_CONFIG.SEARCH
  const Icon   = active.icon

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const renderItem = (key) => {
    const cfg      = TASK_CONFIG[key]
    const ItemIcon = cfg.icon
    const selected = key === value
    return (
      <button
        key={key}
        type="button"
        role="option"
        aria-selected={selected}
        onClick={() => { onChange?.(key); setOpen(false) }}
        className="flex w-full items-center gap-2.5 px-3 py-[7px] text-left text-sm transition-colors hover:bg-gray-50"
        style={selected ? { color: cfg.color, fontWeight: 500 } : { color: "#374151" }}
      >
        <ItemIcon
          className="h-3.5 w-3.5 shrink-0"
          aria-hidden
          style={selected ? { color: cfg.color } : { color: "#9ca3af" }}
        />
        <span className="flex-1">{cfg.label}</span>
        {selected && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: cfg.color }} aria-hidden />}
      </button>
    )
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
        style={{ background: active.color, borderColor: active.color, color: "#fff" }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Task: ${active.label}`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{active.label}</span>
        <ChevronDown
          className="h-3 w-3 shrink-0 opacity-70 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden
        />
      </button>

      {/* Dropdown — opens UPWARD */}
      {open && (
        <div
          className="absolute left-0 bottom-[calc(100%+8px)] z-50 w-52 rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl shadow-black/[0.06]"
          role="listbox"
          aria-label="Select task"
        >
          {/* Search + Research */}
          {TOP_KEYS.map(renderItem)}

          {/* Separator with label */}
          <div className="flex items-center gap-2 px-3 my-1">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[10px] font-medium text-gray-300 uppercase tracking-wider">Modes</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Task categories */}
          {BOTTOM_KEYS.map(renderItem)}
        </div>
      )}
    </div>
  )
}