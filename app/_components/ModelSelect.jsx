"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Cpu, ChevronDown, Check } from "lucide-react"
import { getModelsByTask } from "@/lib/ai/models"
import { useModelStore } from "@/lib/stores/modelStore"

const PRIMARY = "oklch(0.5161 0.0817 211.9)"

const PROVIDER_COLORS = {
  groq:        "#f97316",
  cerebras:    "#7c3aed",
  gemini:      "#1d9bf0",
  nvidia:      "#16a34a",
  openrouter:  "#6366f1",
  agentrouter: "#64748b",
  mistral:     "#ea580c",
  openai:      "#10a37f",
}

export function ModelSelect({ activeTask = "SEARCH", mobileCompact = false }) {
  const { selectedModelId, setModel } = useModelStore()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const taskKey = ["SEARCH", "RESEARCH"].includes(activeTask) ? "ALL" : activeTask
  const models  = useMemo(() => getModelsByTask(taskKey), [taskKey])

  useEffect(() => {
    if (!models.find((m) => m.id === selectedModelId) && models.length > 0) {
      setModel(models[0].id)
    }
  }, [models, selectedModelId, setModel])

  const activeModel = models.find((m) => m.id === selectedModelId) ?? models[0]

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  if (!activeModel) return null

  const dotColor = PROVIDER_COLORS[activeModel.provider] ?? "#9ca3af"

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-gray-50 text-gray-600 transition-all hover:bg-gray-100 min-w-0"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Model: ${activeModel.label}`}
      >
        {mobileCompact
          ? <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} aria-hidden />
          : <Cpu className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
        }
        <span className={`truncate ${mobileCompact ? "max-w-[90px]" : "max-w-[120px]"}`}>
          {activeModel.label}
        </span>
        <ChevronDown
          className="h-3 w-3 shrink-0 text-gray-400 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className="absolute left-0 bottom-[calc(100%+8px)] z-50 w-60 rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl shadow-black/[0.06]"
          role="listbox"
          aria-label="Select model"
        >
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            {taskKey === "ALL" ? "All models" : `${activeTask.charAt(0) + activeTask.slice(1).toLowerCase()} models`}
            <span className="ml-1 font-normal normal-case tracking-normal text-gray-300">({models.length})</span>
          </p>
          <div className="h-px bg-gray-100 mx-2 mb-1" />
          <ul className="max-h-64 overflow-y-auto">
            {models.map((model) => {
              const isSelected = selectedModelId === model.id
              const color      = PROVIDER_COLORS[model.provider] ?? "#9ca3af"
              return (
                <li key={model.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => { setModel(model.id); setOpen(false) }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0 mt-px" style={{ background: color }} aria-hidden />
                    <span
                      className="flex-1 truncate text-sm"
                      style={isSelected ? { fontWeight: 500, color: PRIMARY } : { color: "#374151" }}
                    >
                      {model.label}
                    </span>
                    <span className="text-[10px] text-gray-400 shrink-0">{model.badge}</span>
                    {isSelected
                      ? <Check className="h-3.5 w-3.5 shrink-0" style={{ color: PRIMARY }} aria-hidden />
                      : <span className="w-3.5 shrink-0" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}