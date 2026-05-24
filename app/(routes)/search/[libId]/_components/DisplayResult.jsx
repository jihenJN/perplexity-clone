import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from "react"
import {
  Loader2Icon, LucideImage, LucideList, LucideSparkles,
  LucideVideo, Mic, Plus, ArrowUp, AlertTriangle, X,
} from "lucide-react"
import AnswerDisplay from "./AnswerDisplay"
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
import { ModelSelect } from "@/app/_components/ModelSelect"

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

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const message = await res.text().catch(() => "")
    const error = new Error(message || `Request failed with ${res.status}`)
    error.status = res.status
    throw error
  }

  return res.json()
}

async function saveChatIfMissing(payload) {
  const { data: existing, error: lookupError } = await supabase
    .from("Chats")
    .select("id")
    .eq("libId", payload.libId)
    .eq("userSearchInput", payload.userSearchInput)
    .limit(1)

  if (lookupError) return { error: lookupError }
  if (existing?.length) return { error: null, skipped: true }

  return supabase.from("Chats").insert([payload])
}

async function saveLibraryIfMissing(payload) {
  const { data: existing, error: lookupError } = await supabase
    .from("Library")
    .select("id")
    .eq("libId", payload.libId)
    .limit(1)

  if (lookupError) return { error: lookupError }
  if (existing?.length) return { error: null, skipped: true }

  return supabase.from("Library").insert([payload])
}

function describeSaveError(error) {
  return error?.message || error?.details || error?.hint || error?.code || "Unknown save issue"
}

// ─── Rate-limit toast ─────────────────────────────────────────────────────────

function SearchToast({ id, onDismiss, children }) {
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
        {children}
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

function RateLimitToast({ id, resetTime, onDismiss }) {
  return (
    <SearchToast id={id} onDismiss={onDismiss}>
        Rate limit reached. Limits reset at <strong>{resetTime}</strong>.{" "}
        <a href="" target="_blank" rel="noreferrer" className="underline text-amber-200 hover:text-white">
          Explore our Pro plan
        </a>{" "}
        for higher limits.
    </SearchToast>
  )
}

function EmptyResponseToast({ id, onDismiss }) {
  return (
    <SearchToast id={id} onDismiss={onDismiss}>
      This model returned an empty response. Please try again or switch to another model.
    </SearchToast>
  )
}

// ─── Per-chat result ──────────────────────────────────────────────────────────

const ChatResult = React.memo(function ChatResult({ chat, index, streamingState, onFollowUp }) {
  const [activeTab, setActiveTab] = useState("Answer")
  const isStreamingThis = index === streamingState.chatIndex

  const { cleanAnswer: resolvedAiResp, followUps: resolvedFollowUps } = useMemo(() => {
    if (isStreamingThis) return extractFollowUps(streamingState.rawText)
    return { cleanAnswer: chat.aiResp ?? "", followUps: chat.followUps ?? [] }
  }, [isStreamingThis, streamingState.rawText, chat.aiResp, chat.followUps])

  return (
    <div id={chat.anchorId} className="mt-5 sm:mt-7 scroll-mt-16">
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
}, (prev, next) => {
  if (prev.chat !== next.chat || prev.index !== next.index || prev.onFollowUp !== next.onFollowUp) {
    return false
  }

  const wasStreaming = prev.index === prev.streamingState.chatIndex
  const isStreaming = next.index === next.streamingState.chatIndex
  return !wasStreaming && !isStreaming
})

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

  const startedQueries     = useRef(new Set())
  const activeSearches     = useRef(new Set())
  const libraryInserted    = useRef(false)
  const textareaRef        = useRef(null)
  const streamFrameRef     = useRef(null)
  const streamTextRef      = useRef("")

  const { open, isMobile } = useSidebar()
  const sidebarOffset = !isMobile && open ? "var(--sidebar-width, 16rem)" : "0px"
  const isBusy   = streamingState.isLoadingSearch || streamingState.isStreaming
  const hasInput = userInput.trim().length > 0

  const dismissToast = useCallback(
    (id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []
  )
  const addRateLimitToast = useCallback(() => {
    setToasts((prev) => [...prev, { id: crypto.randomUUID(), type: "rate-limit", resetTime: getResetTime() }])
  }, [])
  const addEmptyResponseToast = useCallback(() => {
    setToasts((prev) => [...prev, { id: crypto.randomUUID(), type: "empty-response" }])
  }, [])

  const flushStreamText = useCallback(() => {
    streamFrameRef.current = null
    setStreamingState((s) => ({ ...s, rawText: streamTextRef.current }))
  }, [])

  const queueStreamText = useCallback((text) => {
    streamTextRef.current = text
    if (streamFrameRef.current) return
    streamFrameRef.current = requestAnimationFrame(flushStreamText)
  }, [flushStreamText])

  useEffect(() => () => {
    if (streamFrameRef.current) cancelAnimationFrame(streamFrameRef.current)
  }, [])

  // Effect 1: load DB + local buffer
  useEffect(() => {
    if (!libId) return
    let cancelled = false

    supabase
      .from("Chats")
      .select("*")
      .eq("libId", libId)
      .order("id", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error("Chats fetch error:", error)
        const dbChats    = (data ?? []).filter((c) => c.aiResp)
        const localChats = readLocalChats(libId)
        const merged     = mergeChats(dbChats, localChats)
        if (merged.length) {
          setChats((prev) => mergeChats(prev, merged))
          setCurrentQuery(merged[0]?.userSearchInput ?? "")
          libraryInserted.current = true
        }
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libId])

  // Effect 2: new query
  useEffect(() => {
    if (!pendingSearch) return
    const { query, type } = pendingSearch
    const queryKey = `${libId}:${query}:${type}`
    clearPendingSearch()
    if (startedQueries.current.has(queryKey)) return
    startedQueries.current.add(queryKey)
    runSearch(query, selectedModelId, type)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSearch, libId])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 200) + "px"
  }, [userInput])

  const runSearch = useCallback(async (query, modelId = selectedModelId, type = "search") => {
    const searchQuery = query?.trim()
    if (!searchQuery) return

    const activeKey = `${type}:${searchQuery.toLowerCase()}`
    if (activeSearches.current.has(activeKey)) return
    activeSearches.current.add(activeKey)

    const requestId = crypto.randomUUID()
    const anchorId = `chat-${requestId}`
    const finishSearch = () => activeSearches.current.delete(activeKey)

    setStreamingState({ chatIndex: null, rawText: "", isStreaming: false, isLoadingSearch: true })
    streamTextRef.current = ""

    let formattedSearchResp = []
    try {
      const data = await postJson("/api/web-search", { searchInput: searchQuery, searchType: type })
      formattedSearchResp = data?.organic_results ?? []
    } catch (err) {
      if (err?.status === 429) addRateLimitToast()
      else console.error("Web search failed:", err)
      setStreamingState((s) => ({ ...s, isLoadingSearch: false }))
      finishSearch()
      return
    }

    const placeholderChat = {
      _isPlaceholder: true,
      id: `placeholder-${requestId}`,
      requestId,
      anchorId,
      userSearchInput: searchQuery,
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
    requestAnimationFrame(() => {
      document.getElementById(anchorId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    })

    const rollback = () => {
      setChats((prev) => prev.filter(
        (c) => c.requestId !== requestId
      ))
      setStreamingState({ chatIndex: null, rawText: "", isStreaming: false, isLoadingSearch: false })
      finishSearch()
    }

    let fullText = ""
    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ searchInput: searchQuery, searchResult: formattedSearchResp, modelId }),
      })
      if (res.status === 429) { addRateLimitToast(); rollback(); return }
      if (!res.ok)            { console.error("Chat API error:", await res.text()); rollback(); return }
      const reader  = res.body.getReader()
      const decoder = new TextDecoder("utf-8", { stream: true })
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        queueStreamText(fullText)
      }
    } catch (err) {
      console.error("Streaming error:", err)
      rollback()
      return
    }

    if (!fullText.trim()) {
      addEmptyResponseToast()
      rollback()
      return
    }
    if (streamFrameRef.current) {
      cancelAnimationFrame(streamFrameRef.current)
      streamFrameRef.current = null
    }

    const { cleanAnswer, followUps: parsed } = extractFollowUps(fullText)
    setStreamingState((s) => ({ ...s, rawText: fullText, isStreaming: false }))

    const insertPayload = {
      libId,
      searchResult:    formattedSearchResp,
      userSearchInput: searchQuery,
      aiResp:          cleanAnswer,
      followUps:       parsed,
    }
    const completedChat = { ...insertPayload, id: crypto.randomUUID(), requestId, anchorId }

    setChats((prev) => {
      const updated = prev.map((chat) =>
        chat.requestId === requestId ? completedChat : chat
      )
      writeLocalChats(libId, updated)
      return updated
    })
    setStreamingState({ chatIndex: null, rawText: "", isStreaming: false, isLoadingSearch: false })
    finishSearch()

    Promise.all([
      saveChatIfMissing(insertPayload),
      !libraryInserted.current
        ? saveLibraryIfMissing({
            searchInput: searchQuery,
            userEmail:   user?.primaryEmailAddress?.emailAddress,
            type,
            libId,
          })
        : Promise.resolve({ error: null, skipped: true }),
    ]).then(([{ error: chatErr }, { error: libErr }]) => {
      if (chatErr) console.warn("Chats save skipped:", describeSaveError(chatErr))
      if (libErr) console.warn("Library save skipped:", describeSaveError(libErr))
      if (!libErr) libraryInserted.current = true
      if (!chatErr) clearLocalChats(libId)
    }).catch((err) => console.warn("Background save skipped:", describeSaveError(err)))
  }, [addEmptyResponseToast, addRateLimitToast, libId, queueStreamText, selectedModelId, user])

  const handleSubmit = useCallback(() => {
    if (!userInput?.trim() || isBusy) return
    runSearch(userInput, selectedModelId)
    setUserInput("")
  }, [userInput, isBusy, runSearch, selectedModelId])

  const handleFollowUp = useCallback((query) => {
    if (isBusy) return
    runSearch(query, selectedModelId)
  }, [isBusy, runSearch, selectedModelId])

  return (
    <div className="mt-5 sm:mt-7 pb-32">

      {/* Toast stack */}
      <div
        className="fixed bottom-24 right-4 z-60 flex flex-col gap-2 items-end pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto animate-in slide-in-from-right-4 fade-in duration-200">
            {toast.type === "empty-response" ? (
              <EmptyResponseToast id={toast.id} onDismiss={dismissToast} />
            ) : (
              <RateLimitToast id={toast.id} resetTime={toast.resetTime} onDismiss={dismissToast} />
            )}
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
            onFollowUp={handleFollowUp}
          />
        ))}

      {/* Fixed input bar */}
      <div
        className="fixed bottom-0 flex justify-center items-end pb-4 pt-8 pointer-events-none bg-linear-to-t from-white via-white/90 to-transparent z-50"
        style={{ left: sidebarOffset, right: 0, transition: "left 200ms ease" }}
      >
        <div className="pointer-events-auto w-full mx-4 sm:mx-8 md:mx-16 lg:mx-28 xl:mx-48 bg-white border border-gray-300 rounded-3xl shadow-sm px-4 py-3 flex flex-col gap-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={userInput}
            placeholder="Ask anything..."
            className="w-full resize-none outline-none text-sm sm:text-[15px] bg-transparent leading-6 max-h-50 overflow-y-auto placeholder:text-gray-400 text-gray-800"
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit() }
            }}
          />
          <div className="flex items-center justify-between">
            <Button variant="ghost" className="flex items-center justify-center w-8 h-8 text-gray-500 hover:bg-gray-100">
                <Plus className="size-[18px]" />
              </Button>
            <div className="flex items-center gap-1">
              
              <ModelSelect />
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
                ? <Loader2Icon className="size-[18px] animate-spin" />
                : hasInput
                  ? <ArrowUp className="size-[15px]" />
                  : <Mic className="size-[18px]" />}
            </Button>
            </div>
           
          </div>
        </div>
      </div>
    </div>
  )
}

export default DisplayResult
