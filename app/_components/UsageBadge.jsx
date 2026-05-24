"use client"

import { useState, useRef, useEffect } from "react"
import { Zap, Search, Atom, Clock, ArrowUpCircle, ChevronDown } from "lucide-react"

const PRIMARY = "oklch(0.5161 0.0817 211.9)"

function formatReset(ms) {
  if (!ms || ms <= 0) return "soon"
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function Bar({ pct, color }) {
  return (
    <div className="w-full h-[3px] rounded-full bg-gray-100 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  )
}

export function UsageBadge({ usage, mobileCompact = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const searches   = usage?.searches  ?? { used: 0, limit: 25 }
  const research   = usage?.research  ?? { used: 0, limit: 5  }
  const resetsInMs = usage?.resetsInMs ?? 0

  const searchPct   = Math.round((searches.used / searches.limit) * 100)
  const researchPct = Math.round((research.used / research.limit) * 100)
  const remaining   = searches.limit - searches.used

  // Status dot: warn at 65%, danger at 90%, primary otherwise
  const dotColor = searchPct >= 90 ? "#ef4444" : searchPct >= 65 ? "#f59e0b" : PRIMARY

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-gray-50 text-gray-500 transition-all hover:bg-gray-100"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Usage: ${remaining} searches left`}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} aria-hidden />
        <Search className="h-3 w-3 shrink-0" aria-hidden />
        <span className="font-semibold text-gray-700">{remaining}</span>
        {!mobileCompact && <span className="text-gray-400">left</span>}
        <ChevronDown
          className="h-3 w-3 shrink-0 text-gray-400 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Usage details"
          className=" absolute left-0 sm:left-auto sm:right-0 bottom-[calc(100%+8px)] z-50 w-56 rounded-xl border border-gray-100 bg-white p-3 shadow-xl shadow-black/[0.06]"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
              <Zap className="h-3.5 w-3.5 text-amber-400" aria-hidden />
              Usage
            </span>
            <button type="button" className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowUpCircle className="h-3 w-3" aria-hidden />
              Upgrade
            </button>
          </div>

          <div className="flex flex-col gap-1.5 mb-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <Search className="h-3 w-3" aria-hidden /> Searches
              </span>
              <span className="text-[11px] font-semibold text-gray-700">{searches.used} / {searches.limit}</span>
            </div>
            <Bar pct={searchPct} color={PRIMARY} />
          </div>

          <div className="flex flex-col gap-1.5 mb-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <Atom className="h-3 w-3" aria-hidden /> Research
              </span>
              <span className="text-[11px] font-semibold text-gray-700">{research.used} / {research.limit}</span>
            </div>
            {/* Research bar uses a lightened version of primary — 60% opacity */}
            <Bar pct={researchPct} color={PRIMARY.replace("0.5161", "0.72")} />
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-2.5">
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <Clock className="h-3 w-3" aria-hidden />
              Resets in {formatReset(resetsInMs)}
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} aria-hidden />
          </div>
        </div>
      )}
    </div>
  )
}