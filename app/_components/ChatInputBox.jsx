"use client"

import Image from "next/image"
import React, { useState, useTransition } from "react"
import { AudioLines, ArrowRight, Paperclip, Mic } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { useRouter } from "next/navigation"
import { useSearchStore } from "@/lib/stores/searchStore"
import { TaskPicker } from "./TaskPicker"
import { ModelSelect } from "./ModelSelect"
import { UsageBadge } from "./UsageBadge"


const PRIMARY = "oklch(0.5161 0.0817 211.9)"

const MOCK_USAGE = {
  searches:   { used: 18, limit: 25 },
  research:   { used: 3,  limit: 5  },
  resetsInMs: 20_520_000,
}

const searchTypeMap = {
  SEARCH: "search", RESEARCH: "research",
  WRITING: "search", CODE: "search", TRANSLATE: "search",
  SUMMARIZE: "search", ANALYZE: "search", CALCULATE: "search",
}

function IconBtn({ onClick, label, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        "flex items-center justify-center h-8 w-8 rounded-full shrink-0",
        "text-gray-400 hover:text-gray-600",
        "border border-transparent hover:border-gray-200 hover:bg-gray-50",
        "transition-all duration-150",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  )
}

function SendBtn({ hasInput, loading, onClick }) {
  return (
    <button
      type="button"
      disabled={loading || !hasInput}
      onClick={onClick}
      aria-label="Submit search"
      className="flex items-center justify-center h-8 w-8 rounded-full ml-1 shrink-0 transition-all duration-150"
      style={{
        background: PRIMARY,
        opacity: hasInput ? 1 : 0.6,
        cursor: hasInput ? "pointer" : "default",
      }}
    >
      {hasInput
        ? <ArrowRight className="h-4 w-4 text-white" />
        : <AudioLines className="h-4 w-4 text-white/70" />}
    </button>
  )
}

function ChatInputBox() {
  const [userSearchInput, setUserSearchInput] = useState("")
  const [activeTask, setActiveTask]           = useState("SEARCH")
  const [loading, setLoading]                 = useState(false)

  const router               = useRouter()
  const [, startTransition]  = useTransition()
  const { setPendingSearch } = useSearchStore()

  const onSearchQuery = () => {
    const trimmed = userSearchInput.trim()
    if (!trimmed) return
    setLoading(true)
    const libId = uuidv4()
    setPendingSearch(trimmed, searchTypeMap[activeTask] ?? "search")
    startTransition(() => { router.push(`/search/${libId}`) })
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSearchQuery() }
  }

  const hasInput = userSearchInput.trim().length > 0

  return (
    <div className="flex flex-col items-center min-h-screen justify-center px-3 sm:px-4">
      <Image
        src="/Perplexity_AI_logo.svg"
        alt="Perplexity clone logo"
        width={180}
        height={150}
        className="w-28 sm:w-48 md:w-64 h-auto"
        style={{ height: "auto" }}
        priority
      />

      <div className="p-3 sm:p-5 w-full max-w-2xl border border-gray-200 rounded-2xl mt-6 sm:mt-10 overflow-visible">
        <input
          type="text"
          value={userSearchInput}
          placeholder={activeTask === "RESEARCH" ? "Research anything…" : "Ask anything…"}
          onChange={(e) => setUserSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full text-base sm:text-xl px-1 py-1 pb-3 outline-none bg-transparent"
        />

        <div className="h-px bg-gray-100 mb-3" />

        {/* Desktop toolbar */}
        <div className="hidden sm:flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <TaskPicker value={activeTask} onChange={setActiveTask} />
            <div className="w-px h-4 bg-gray-200 shrink-0" aria-hidden />
            <ModelSelect activeTask={activeTask} />
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <UsageBadge usage={MOCK_USAGE} />
            <div className="w-px h-4 bg-gray-200 mx-1.5 shrink-0" aria-hidden />
            <IconBtn label="Attach file"><Paperclip className="h-4 w-4" /></IconBtn>
            <IconBtn label="Voice input"><Mic className="h-4 w-4" /></IconBtn>
            <SendBtn hasInput={hasInput} loading={loading} onClick={onSearchQuery} />
          </div>
        </div>

        {/* Mobile toolbar */}
        <div className="flex sm:hidden flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <TaskPicker value={activeTask} onChange={setActiveTask} />
            <div className="w-px h-4 bg-gray-200 shrink-0" aria-hidden />
            <ModelSelect activeTask={activeTask} mobileCompact />
          </div>
          <div className="flex items-center justify-between">
            <UsageBadge usage={MOCK_USAGE} mobileCompact />
            <div className="flex items-center gap-1">
              <IconBtn label="Attach file"><Paperclip className="h-4 w-4" /></IconBtn>
              <IconBtn label="Voice input"><Mic className="h-4 w-4" /></IconBtn>
              <SendBtn hasInput={hasInput} loading={loading} onClick={onSearchQuery} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatInputBox