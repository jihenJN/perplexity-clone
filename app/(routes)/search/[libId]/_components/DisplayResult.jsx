import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from "react"
import {
  Loader2Icon, LucideImage, LucideList, LucideSparkles,
  LucideVideo, Mic, Plus, ArrowUp, AlertTriangle, X,
} from "lucide-react"
import AnswerDisplay from "./AnswerDisplay"
import axios from "axios"
import { useParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { supabase } from "@/app/services/Supabase"
import ImageListTab from "./ImageListTab"
import SourceListTab from "./SourceListTab"
import VideoListTab from "./VideoListTab"
import { useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import LoadingSteps from "./LoadingSteps"
import { useModelStore } from "@/lib/stores/modelStore"
import { useSearchStore } from "@/lib/stores/searchStore"
import { ModelPicker } from "@/app/_components/ModelPicker"

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { label: "Answer",  icon: LucideSparkles },
  { label: "Images",  icon: LucideImage },
  { label: "Videos",  icon: LucideVideo },
  { label: "Sources", icon: LucideList, badge: 10 },
]

// ─── Write-ahead local buffer ─────────────────────────────────────────────────

const LOCAL_PREFIX = "wab_"
function localKey(libId) { return `${LOCAL_PREFIX}${libId}` }
function readLocalChats(libId) {
  try { const r = sessionStorage.getItem(localKey(libId)); return r ? JSON.parse(r) : [] }
  catch { return [] }
}
function writeLocalChats(libId, chats) {
  try { sessionStorage.setItem(localKey(libId), JSON.stringify(chats.filter(c => !c._isPlaceholder && c.aiResp))) }
  catch { }
}
function clearLocalChats(libId) {
  try { sessionStorage.removeItem(localKey(libId)) } catch { }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractFollowUps(markdown = "") {
  const match = markdown.match(/##\s*Related Questions\s*\n([\s\S]*?)(?=\n##|$)/i)
  if (!match) return { cleanAnswer: markdown, followUps: [] }
  const followUps = match[1]
    .split("\n")
    .map((l) => l.replace(/^[-*\d.]\s*/, "").trim())
    .filter(Boolean)
  const cleanAnswer = markdown.replace(/##\s*Related Questions[\s\S]*$/i, "").trimEnd()
  return { cleanAnswer, followUps }
}

function getResetTime() {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function mergeChats(dbChats, localChats) {
  const seen = new Set(); const result = []
  for (const c of dbChats) { const k = c.id ?? c.userSearchInput; if (!seen.has(k)) { seen.add(k); result.push(c) } }
  for (const c of localChats) { if (!dbChats.some(d => d.userSearchInput === c.userSearchInput)) result.push(c) }
  return result
}

// ─── Rate-limit toast ─────────────────────────────────────────────────────────

function RateLimitToast({ id, resetTime, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), 12_000)
    return () => clearTimeout(t)
  }, [id, onDismiss])

  return (
    <div
      role="alert"
      className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-amber-100 max-w-sm w-full"
      style={{ background: "#7c4a00", border: "1px solid #a36200" }}
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-300" />
      <span className="flex-1 leading-snug">
        Rate limit reached. Limits reset at <strong>{resetTime}</strong>.{" "}
        <a href="" target="_blank" rel="noreferrer" className="underline text-amber-200 hover:text-white">
          Explore our Pro plan
        </a>{" "}
        for higher limits.
      </span>
      <button
        onClick={() => onDismiss(id)}
        className="text-amber-300 hover:text-white transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Per-chat result ──────────────────────────────────────────────────────────

function ChatResult({ chat, index, streamingState, onFollowUp }) {
  const [activeTab, setActiveTab] = useState("Answer")
  const isStreamingThis = index === streamingState.chatIndex

  const { cleanAnswer: resolvedAiResp, followUps: resolvedFollowUps } = useMemo(() => {
    if (isStreamingThis) return extractFollowUps(streamingState.rawText)
    return { cleanAnswer: chat.aiResp ?? "", followUps: chat.followUps ?? [] }
  }, [isStreamingThis, streamingState.rawText, chat.aiResp, chat.followUps])

  return (
    <div className="mt-5 sm:mt-7">
     <div className="flex justify-end mb-6">
  <div
    className="max-w-[75%] text-white px-4 py-3 rounded-[20px] rounded-tr-[5px] text-sm sm:text-[15px] leading-relaxed font-medium shadow-sm"
    style={{ background: "linear-gradient(135deg, oklch(0.5161 0.0817 211.9), oklch(0.72 0.11 195))" }}
  >
    {chat.userSearchInput}
  </div>
</div>

      <div className="flex items-center gap-1 sm:gap-4 sm:space-x-2 border-b border-gray-200 pb-2 mt-4 sm:mt-6 overflow-x-auto scrollbar-hide">
        {TABS.map(({ label, icon: Icon, badge }) => (
          <button
            key={label}
            onClick={() => setActiveTab(label)}
            className={`flex items-center gap-1 relative text-sm font-medium whitespace-nowrap px-2 py-1 rounded-sm transition-colors
              ${activeTab === label ? "text-black" : "text-gray-500 hover:text-gray-800"}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline sm:inline">{label}</span>
            {badge && (
              <span className="ml-0.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{badge}</span>
            )}
            {activeTab === label && (
              <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-black rounded" />
            )}
          </button>
        ))}
        <div className="ml-auto shrink-0 text-xs sm:text-sm text-gray-500 pr-1">
          1 task <span className="ml-0.5">🡥</span>
        </div>
      </div>

      <div className="mt-2">
        {activeTab === "Answer" ? (
          <AnswerDisplay
            chat={chat}
            loadingSearch={isStreamingThis ? streamingState.isLoadingSearch : false}
            isStreaming={isStreamingThis ? streamingState.isStreaming : false}
            aiResp={resolvedAiResp}
            followUps={resolvedFollowUps}
            onFollowUp={onFollowUp}
          />
        ) : activeTab === "Images"  ? <ImageListTab chat={chat} />
          : activeTab === "Videos"  ? <VideoListTab chat={chat} />
          : activeTab === "Sources" ? <SourceListTab chat={chat} />
          : null}
      </div>
      <hr className="my-5" />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function DisplayResult() {
  const { libId }                             = useParams()
  const { user }                              = useUser()
  const { selectedModelId }                   = useModelStore()
  const { pendingSearch, clearPendingSearch, setCurrentQuery } = useSearchStore()

  const [chats, setChats]         = useState([])
  const [toasts, setToasts]       = useState([])
  const [streamingState, setStreamingState] = useState({
    chatIndex: null, rawText: "", isStreaming: false, isLoadingSearch: false,
  })
  const [userInput, setUserInput] = useState("")

  const sessionInitialized = useRef(false)
  const pendingQueryRef    = useRef(null)
  const libraryInserted    = useRef(false)
  const textareaRef        = useRef(null)

  const { open, isMobile } = useSidebar()
  const sidebarOffset = !isMobile && open ? "var(--sidebar-width, 16rem)" : "0px"
  const isBusy   = streamingState.isLoadingSearch || streamingState.isStreaming
  const hasInput = userInput.trim().length > 0

  const dismissToast = useCallback(
    (id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []
  )
  const addRateLimitToast = useCallback(() => {
    setToasts((prev) => [...prev, { id: Date.now(), resetTime: getResetTime() }])
  }, [])

  // Effect 1: load DB + local buffer
  useEffect(() => {
    if (!libId) return
    supabase
      .from("Chats")
      .select("*")
      .eq("libId", libId)
      .order("id", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("Chats fetch error:", error)
        const dbChats    = (data ?? []).filter((c) => c.aiResp)
        const localChats = readLocalChats(libId)
        const merged     = mergeChats(dbChats, localChats)
        if (merged.length) {
          setChats(merged)
          setCurrentQuery(merged[0]?.userSearchInput ?? "")
          libraryInserted.current = true
        }
        sessionInitialized.current = true
        if (pendingQueryRef.current) {
          const { query, type } = pendingQueryRef.current
          pendingQueryRef.current = null
          runSearch(query, selectedModelId, type)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libId])

  // Effect 2: new query
  useEffect(() => {
    if (!pendingSearch) return
    const { query, type } = pendingSearch
    clearPendingSearch()
    if (sessionInitialized.current) {
      runSearch(query, selectedModelId, type)
    } else {
      pendingQueryRef.current = { query, type }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSearch])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 200) + "px"
  }, [userInput])

  const runSearch = useCallback(async (query, modelId = selectedModelId, type = "search") => {
    if (!query?.trim()) return
    setStreamingState({ chatIndex: null, rawText: "", isStreaming: false, isLoadingSearch: true })

    let formattedSearchResp = []
    try {
      const result = await axios.post("/api/web-search", { searchInput: query, searchType: type })
      formattedSearchResp = result.data?.organic_results ?? []
    } catch (err) {
      if (err?.response?.status === 429) addRateLimitToast()
      else console.error("Web search failed:", err)
      setStreamingState((s) => ({ ...s, isLoadingSearch: false }))
      return
    }

    const placeholderChat = {
      _isPlaceholder: true,
      userSearchInput: query,
      searchResult: formattedSearchResp,
      aiResp: null,
      followUps: [],
    }

    setChats((prev) => {
      const updated = [...prev, placeholderChat]
      setStreamingState((s) => ({
        ...s,
        chatIndex:       updated.length - 1,
        isLoadingSearch: false,
        isStreaming:     true,
        rawText:        "",
      }))
      return updated
    })

    const rollback = () => {
      setChats((prev) => prev.filter(
        (c) => !(c._isPlaceholder && c.userSearchInput === query)
      ))
      setStreamingState({ chatIndex: null, rawText: "", isStreaming: false, isLoadingSearch: false })
    }

    let fullText = ""
    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ searchInput: query, searchResult: formattedSearchResp, modelId }),
      })
      if (res.status === 429) { addRateLimitToast(); rollback(); return }
      if (!res.ok)            { console.error("Chat API error:", await res.text()); rollback(); return }
      const reader  = res.body.getReader()
      const decoder = new TextDecoder("utf-8", { stream: true })
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        setStreamingState((s) => ({ ...s, rawText: fullText }))
      }
    } catch (err) {
      console.error("Streaming error:", err)
      rollback()
      return
    }

    if (!fullText.trim()) { rollback(); return }

    const { cleanAnswer, followUps: parsed } = extractFollowUps(fullText)
    setStreamingState((s) => ({ ...s, isStreaming: false }))

    const insertPayload = {
      libId,
      searchResult:    formattedSearchResp,
      userSearchInput: query,
      aiResp:          cleanAnswer,
      followUps:       parsed,
    }
    const completedChat = { ...insertPayload, id: crypto.randomUUID() }

    setChats((prev) => {
      const updated = prev.map((chat) =>
        chat._isPlaceholder && chat.userSearchInput === query ? completedChat : chat
      )
      writeLocalChats(libId, updated)
      return updated
    })
    setStreamingState({ chatIndex: null, rawText: "", isStreaming: false, isLoadingSearch: false })

    Promise.all([
      supabase.from("Chats").insert([insertPayload]),
      !libraryInserted.current
        ? supabase.from("Library").insert([{
            searchInput: query,
            userEmail:   user?.primaryEmailAddress?.emailAddress,
            type,
            libId,
          }])
        : Promise.resolve({ error: null }),
    ]).then(([{ error: chatErr }, { error: libErr }]) => {
      if (chatErr) { console.error("Chats insert failed:", chatErr); return }
      if (!libErr) libraryInserted.current = true
      clearLocalChats(libId)
    }).catch(console.error)
  }, [addRateLimitToast, libId, selectedModelId, user])

  const handleSubmit = useCallback(() => {
    if (!userInput?.trim() || isBusy) return
    runSearch(userInput, selectedModelId)
    setUserInput("")
  }, [userInput, isBusy, runSearch, selectedModelId])

  return (
    <div className="mt-5 sm:mt-7 pb-32">

      {/* Toast stack */}
      <div
        className="fixed bottom-24 right-4 z-[60] flex flex-col gap-2 items-end pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto animate-in slide-in-from-right-4 fade-in duration-200">
            <RateLimitToast id={toast.id} resetTime={toast.resetTime} onDismiss={dismissToast} />
          </div>
        ))}
      </div>

      {/* Loading state — shown only before the first chat appears */}
      {chats.length === 0 && (streamingState.isLoadingSearch || streamingState.isStreaming) && (
        <LoadingSteps
          isLoadingSearch={streamingState.isLoadingSearch}
          isStreaming={streamingState.isStreaming}
          hasText={streamingState.rawText.length > 0}
        />
      )}

      {/* Chat list */}
      {chats
        .filter((c) => c._isPlaceholder || c.aiResp)
        .map((chat, index) => (
          <ChatResult
            key={chat.id ?? `placeholder-${index}`}
            chat={chat}
            index={index}
            streamingState={streamingState}
            onFollowUp={(q) => runSearch(q, selectedModelId)}
          />
        ))}

      {/* Fixed input bar */}
      <div
        className="fixed bottom-0 flex justify-center items-end pb-4 pt-8 pointer-events-none bg-gradient-to-t from-white via-white/90 to-transparent z-50"
        style={{ left: sidebarOffset, right: 0, transition: "left 200ms ease" }}
      >
        <div className="pointer-events-auto w-full mx-4 sm:mx-8 md:mx-16 lg:mx-28 xl:mx-48 bg-white border border-gray-300 rounded-3xl shadow-sm px-4 py-3 flex flex-col gap-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={userInput}
            placeholder="Ask anything..."
            className="w-full resize-none outline-none text-sm sm:text-[15px] bg-transparent leading-6 max-h-[200px] overflow-y-auto placeholder:text-gray-400 text-gray-800"
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit() }
            }}
          />
          <div className="flex items-center justify-between">
            <Button variant="ghost" className="flex items-center justify-center w-8 h-8 text-gray-500 hover:bg-gray-100">
                <Plus className="w-[18px] h-[18px]" />
              </Button>
            <div className="flex items-center gap-1">
              
              <ModelPicker />
               <Button
              variant="ghost"
              size="icon"
              onClick={hasInput ? handleSubmit : undefined}
              disabled={isBusy}
              aria-label={hasInput ? "Send message" : "Voice input"}
              className={`w-8 h-8 transition-all duration-150 ${
                hasInput
                  ? "bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
            >
              {isBusy
                ? <Loader2Icon className="w-[18px] h-[18px] animate-spin" />
                : hasInput
                  ? <ArrowUp className="w-[15px] h-[15px]" />
                  : <Mic className="w-[18px] h-[18px]" />}
            </Button>
            </div>
           
          </div>
        </div>
      </div>
    </div>
  )
}

export default DisplayResult