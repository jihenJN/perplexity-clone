import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Loader2Icon, LucideImage, LucideList, LucideSparkles,
  LucideVideo, Mic, Plus, ArrowUp, AlertTriangle, X,
} from "lucide-react";
import AnswerDisplay from "./AnswerDisplay";
import axios from "axios";
import { useParams } from "next/navigation";
import { supabase } from "@/app/services/Supabase";
import ImageListTab from "./ImageListTab";
import SourceListTab from "./SourceListTab";
import VideoListTab from "./VideoListTab";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import LoadingSteps from "./LoadingSteps";
import { useModelStore } from "@/lib/stores/modelStore";

const tabs = [
  { label: "Answer",  icon: LucideSparkles },
  { label: "Images",  icon: LucideImage },
  { label: "Videos",  icon: LucideVideo },
  { label: "Sources", icon: LucideList, badge: 10 },
];

// ─── Rate-limit toast ────────────────────────────────────────────────────────

function RateLimitToast({ id, resetTime, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), 12000);
    return () => clearTimeout(t);
  }, [id, onDismiss]);

  return (
    
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-amber-100 max-w-sm w-full"
      style={{ background: "#7c4a00", border: "1px solid #a36200" }}
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-300" />
      <span className="flex-1 leading-snug">
        Rate limit reached. Please wait and retry. Limits will reset at{" "}
        <strong>{resetTime}</strong>. For higher limits,{" "}
        
         <a href=""
          target="_blank"
          rel="noreferrer"
          className="underline text-amber-200 hover:text-white">
     
          explore our Pro plan
        </a>
        .
      </span>
      <button
        onClick={() => onDismiss(id)}
        className="text-amber-300 hover:text-white transition-colors mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractFollowUps(markdown = "") {
  const match = markdown.match(/##\s*Related Questions\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (!match) return { cleanAnswer: markdown, followUps: [] };
  const followUps = match[1]
    .split("\n")
    .map((l) => l.replace(/^[-*\d.]\s*/, "").trim())
    .filter(Boolean);
  const cleanAnswer = markdown.replace(/##\s*Related Questions[\s\S]*$/i, "").trimEnd();
  return { cleanAnswer, followUps };
}

function getResetTime() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// ─── Main component ───────────────────────────────────────────────────────────

function DisplayResult({ searchInputRecord }) {
  const [activeTab, setActiveTab]   = useState("Answer");
  const [chats, setChats]           = useState(searchInputRecord?.Chats ?? []);
  const [toasts, setToasts]         = useState([]);
  const [streamingState, setStreamingState] = useState({
    chatIndex: null, rawText: "", isStreaming: false,
    isLoadingSearch: false, followUps: [],
  });
  const [userInput, setUserInput]   = useState("");
  const { libId }                   = useParams();
  const hasFetched                  = useRef(false);
  const textareaRef                 = useRef(null);
  const { open, isMobile }          = useSidebar();
  const { selectedModelId }         = useModelStore();

  const sidebarOffset = !isMobile && open ? "var(--sidebar-width, 16rem)" : "0px";
  const isBusy   = streamingState.isLoadingSearch || streamingState.isStreaming;
  const hasInput = userInput.trim().length > 0;

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const dismissToast = useCallback((id) =>
    setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const addRateLimitToast = useCallback(() => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, resetTime: getResetTime() }]);
  }, []);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchInputRecord) return;
    setChats(searchInputRecord.Chats ?? []);
    const shouldFetch = (searchInputRecord.Chats?.length ?? 0) === 0 && !hasFetched.current;
    if (shouldFetch) { hasFetched.current = true; runSearch(searchInputRecord.searchInput); }
  }, [searchInputRecord]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [userInput]);

  // ── Core search ────────────────────────────────────────────────────────────
  const runSearch = async (query) => {
    if (!query?.trim()) return;

    setStreamingState({ chatIndex: null, rawText: "", isStreaming: false, isLoadingSearch: true, followUps: [] });

    let formattedSearchResp = [];
    try {
      const result = await axios.post("/api/web-search", {
        searchInput: query,
        searchType: searchInputRecord?.type ?? "Search",
      });
      formattedSearchResp = result.data?.organic_results ?? [];
    } catch (err) {
      // ← 429 from web-search
      if (err?.response?.status === 429) addRateLimitToast();
      else console.error("Web search failed:", err);
      setStreamingState((s) => ({ ...s, isLoadingSearch: false }));
      return;
    }

    const placeholderChat = {
      _isPlaceholder: true, userSearchInput: query,
      searchResult: formattedSearchResp, aiResp: null, followUps: [],
    };

    setChats((prev) => {
      const updated = [...prev, placeholderChat];
      setStreamingState((s) => ({
        ...s, chatIndex: updated.length - 1,
        isLoadingSearch: false, isStreaming: true, rawText: "",
      }));
      return updated;
    });

    let fullText = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchInput: query, searchResult: formattedSearchResp, modelId: selectedModelId }),
      });

      // ← 429 from /api/chat
      if (res.status === 429) {
        addRateLimitToast();
        setStreamingState((s) => ({ ...s, isStreaming: false, isLoadingSearch: false }));
        return;
      }

      if (!res.ok) {
        console.error("Chat API error:", await res.text());
        setStreamingState((s) => ({ ...s, isStreaming: false }));
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder("utf-8", { stream: true });
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setStreamingState((s) => ({ ...s, rawText: fullText }));
      }
    } catch (err) {
      console.error("Streaming error:", err);
      setStreamingState((s) => ({ ...s, isStreaming: false }));
      return;
    }

    const { cleanAnswer, followUps: parsed } = extractFollowUps(fullText);
    setStreamingState((s) => ({ ...s, isStreaming: false, followUps: parsed }));

    const { data, error } = await supabase
      .from("Chats")
      .insert([{ libId, searchResult: formattedSearchResp, userSearchInput: query, aiResp: cleanAnswer, followUps: parsed }])
      .select().single();

    if (error) { console.error("Supabase insert failed:", error); return; }

    setChats((prev) =>
      prev.map((chat) => chat._isPlaceholder && chat.userSearchInput === query ? { ...data } : chat)
    );
    setStreamingState((s) => ({ ...s, chatIndex: null, rawText: "", followUps: [] }));
  };

  const handleSubmit = () => {
    if (!userInput?.trim() || isBusy) return;
    runSearch(userInput);
    setUserInput("");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mt-5 sm:mt-7 pb-32">

      {/* ── Toast stack (bottom-right, above the input bar) ── */}
      <div className="fixed bottom-24 right-4 z-[60] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto animate-in slide-in-from-right-4 fade-in duration-200">
            <RateLimitToast id={toast.id} resetTime={toast.resetTime} onDismiss={dismissToast} />
          </div>
        ))}
      </div>

      {chats.length === 0 && (streamingState.isLoadingSearch || streamingState.isStreaming) && (
        <LoadingSteps
          isLoadingSearch={streamingState.isLoadingSearch}
          isStreaming={streamingState.isStreaming}
          hasText={streamingState.rawText.length > 0}
        />
      )}

      {chats.map((chat, index) => {
        const isStreamingThis   = index === streamingState.chatIndex;
        const resolvedAiResp    = isStreamingThis ? extractFollowUps(streamingState.rawText).cleanAnswer : chat.aiResp;
        const resolvedFollowUps = isStreamingThis ? streamingState.followUps : (chat.followUps ?? []);

        return (
          <div key={chat.id ?? `placeholder-${index}`} className="mt-5 sm:mt-7">
            <h2 className="font-bold text-xl sm:text-3xl line-clamp-2">{chat.userSearchInput}</h2>

            <div className="flex items-center gap-1 sm:gap-4 sm:space-x-2 border-b border-gray-200 pb-2 mt-4 sm:mt-6 overflow-x-auto scrollbar-hide">
              {tabs.map(({ label, icon: Icon, badge }) => (
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
              <div className="ml-auto shrink-0 text-xs sm:text-sm text-gray-500 pr-1">1 task <span className="ml-0.5">🡥</span></div>
            </div>

            <div className="mt-2">
              {activeTab === "Answer" ? (
                <AnswerDisplay
                  chat={chat}
                  loadingSearch={isStreamingThis ? streamingState.isLoadingSearch : false}
                  isStreaming={isStreamingThis ? streamingState.isStreaming : false}
                  aiResp={resolvedAiResp}
                  followUps={resolvedFollowUps}
                  onFollowUp={(question) => runSearch(question)}
                />
              ) : activeTab === "Images" ? <ImageListTab chat={chat} />
                : activeTab === "Videos" ? <VideoListTab chat={chat} />
                : activeTab === "Sources" ? <SourceListTab chat={chat} />
                : null}
            </div>
            <hr className="my-5" />
          </div>
        );
      })}

      {/* Fixed input bar */}
      <div
        className="fixed bottom-0 flex justify-center items-end pb-4 pt-8 pointer-events-none bg-gradient-to-t from-white via-white/90 to-transparent z-50"
        style={{ left: sidebarOffset, right: 0, transition: "left 200ms ease" }}
      >
        <div className="pointer-events-auto w-full mx-4 sm:mx-8 md:mx-16 lg:mx-28 xl:mx-48 bg-white border border-gray-300 rounded-3xl shadow-sm px-4 py-3 flex flex-col gap-3">
          <textarea
            ref={textareaRef} rows={1} value={userInput} placeholder="Ask anything..."
            className="w-full resize-none outline-none text-sm sm:text-[15px] bg-transparent leading-6 max-h-[200px] overflow-y-auto placeholder:text-gray-400 text-gray-800"
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" className="flex items-center justify-center w-8 h-8 text-gray-500 hover:bg-gray-100 transition-colors">
                <Plus className="w-[18px] h-[18px]" />
              </Button>
            </div>
            <Button
              variant="ghost" size="icon"
              onClick={hasInput ? handleSubmit : undefined}
              disabled={isBusy}
              className={`w-8 h-8 transition-all duration-150 ${hasInput ? "bg-primary text-white hover:bg-gray-100 disabled:opacity-40" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}
            >
              {isBusy ? <Loader2Icon className="w-8 h-8 animate-spin" />
               : hasInput ? <ArrowUp className="w-[15px] h-[15px]" />
               : <Mic className="w-[18px] h-[18px]" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DisplayResult;