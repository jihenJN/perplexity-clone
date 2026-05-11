import React, { useEffect, useRef, useState } from "react";
import {
  Loader2Icon,
  LucideImage,
  LucideList,
  LucideSparkles,
  LucideVideo,
  Send,
} from "lucide-react";
import AnswerDisplay from "./AnswerDisplay";
import axios from "axios";
import { useParams } from "next/navigation";
import { supabase } from "@/app/services/Supabase";
import ImageListTab from "./ImageListTab";
import SourceListTab from "./SourceListTab";
import { Button } from "@/components/ui/button";
import VideoListTab from "./VideoListTab";

const tabs = [
  { label: "Answer", icon: LucideSparkles },
  { label: "Images", icon: LucideImage },
  { label: "Videos", icon: LucideVideo },
  { label: "Sources", icon: LucideList, badge: 10 },
];

function extractFollowUps(markdown = "") {
  const match = markdown.match(
    /##\s*Related Questions\s*\n([\s\S]*?)(?=\n##|$)/i,
  );
  if (!match) return { cleanAnswer: markdown, followUps: [] };

  const followUps = match[1]
    .split("\n")
    .map((l) => l.replace(/^[-*\d.]\s*/, "").trim())
    .filter(Boolean);

  const cleanAnswer = markdown
    .replace(/##\s*Related Questions[\s\S]*$/i, "")
    .trimEnd();

  return { cleanAnswer, followUps };
}

function DisplayResult({ searchInputRecord }) {
  const [activeTab, setActiveTab] = useState("Answer");
  const [chats, setChats] = useState(searchInputRecord?.Chats ?? []);
  // Streaming state for the current in-flight chat
  const [streamingState, setStreamingState] = useState({
    chatIndex: null,   // index into `chats` that is currently streaming
    rawText: "",       // raw accumulated text (may include follow-ups section)
    isStreaming: false,
    isLoadingSearch: false,
    followUps: [],
  });
  const [userInput, setUserInput] = useState("");
  const { libId } = useParams();
  // Guard against React StrictMode double-invoke
  const hasFetched = useRef(false);

  // ─── Sync chats when the parent prop changes (initial load) ───────────────
  useEffect(() => {
    if (!searchInputRecord) return;
    setChats(searchInputRecord.Chats ?? []);

    const shouldFetch =
      (searchInputRecord.Chats?.length ?? 0) === 0 && !hasFetched.current;

    if (shouldFetch) {
      hasFetched.current = true;
      runSearch(searchInputRecord.searchInput);
    }
  }, [searchInputRecord]);

  // ─── Core search + stream ─────────────────────────────────────────────────
  const runSearch = async (query) => {
    if (!query?.trim()) return;

    // 1. Reset streaming state and show loading skeleton
    setStreamingState({
      chatIndex: null,
      rawText: "",
      isStreaming: false,
      isLoadingSearch: true,
      followUps: [],
    });

    // 2. Fetch web search results
    let formattedSearchResp = [];
    try {
      const result = await axios.post("/api/web-search", {
        searchInput: query,
        searchType: searchInputRecord?.type ?? "Search",
      });
     formattedSearchResp = result.data?.organic_results ?? [];
    } catch (err) {
      console.error("Web search failed:", err);
      setStreamingState((s) => ({ ...s, isLoadingSearch: false }));
      return;
    }

    // 3. Optimistically append a placeholder chat so the UI renders immediately
    const placeholderChat = {
      _isPlaceholder: true,
      userSearchInput: query,
      searchResult: formattedSearchResp,
      aiResp: null,
      followUps: [],
    };
    setChats((prev) => {
      const updated = [...prev, placeholderChat];
      // streaming index = last item
      setStreamingState((s) => ({
        ...s,
        chatIndex: updated.length - 1,
        isLoadingSearch: false,
        isStreaming: true,
        rawText: "",
      }));
      return updated;
    });

    // 4. Stream AI response BEFORE any DB write
    let fullText = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchInput: query,
          searchResult: formattedSearchResp,
        }),
      });

      if (!res.ok) {
        const errMsg = await res.text();
        console.error("Chat API error:", errMsg);
        setStreamingState((s) => ({ ...s, isStreaming: false }));
        return;
      }

      const reader = res.body.getReader();
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

    // 5. Decompose follow-ups from final text
    const { cleanAnswer, followUps: parsed } = extractFollowUps(fullText);

    // 6. Mark streaming done + update follow-ups in state
    setStreamingState((s) => ({
      ...s,
      isStreaming: false,
      followUps: parsed,
    }));

    // 7. Persist to DB in ONE go (insert chat + full answer at once)
    const { data, error } = await supabase
      .from("Chats")
      .insert([
        {
          libId,
          searchResult: formattedSearchResp,
          userSearchInput: query,
          aiResp: cleanAnswer,
          followUps: parsed,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert failed:", error);
      return;
    }

    // 8. Replace placeholder chat with the real persisted record — no extra fetch
    setChats((prev) =>
      prev.map((chat, i) =>
        chat._isPlaceholder && chat.userSearchInput === query
          ? { ...data }
          : chat,
      ),
    );

    // Clear streaming index so the now-persisted chat renders normally
    setStreamingState((s) => ({ ...s, chatIndex: null, rawText: "", followUps: [] }));
  };

  // ─── Follow-up / user submit ──────────────────────────────────────────────
  const handleSubmit = () => {
    if (!userInput?.trim() || streamingState.isLoadingSearch || streamingState.isStreaming) return;
    runSearch(userInput);
    setUserInput("");
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="mt-7">
      {/* Loading skeleton when no chats yet */}
      {chats.length === 0 && streamingState.isLoadingSearch && (
        <div>
          <div className="w-full h-4 animate-pulse bg-accent rounded-md" />
          <div className="w-1/2 mt-2 h-4 animate-pulse bg-accent rounded-md" />
          <div className="w-[70%] mt-2 h-4 animate-pulse bg-accent rounded-md" />
        </div>
      )}

      {chats.map((chat, index) => {
        const isStreamingThis = index === streamingState.chatIndex;

        // During streaming: strip follow-ups section from live text
        const resolvedAiResp = isStreamingThis
          ? extractFollowUps(streamingState.rawText).cleanAnswer
          : chat.aiResp;

        // Follow-ups: live state wins during streaming, fall back to DB value
        const resolvedFollowUps = isStreamingThis
          ? streamingState.followUps
          : (chat.followUps ?? []);

        return (
          <div key={chat.id ?? `placeholder-${index}`} className="mt-7">
            <h2 className="font-bold text-3xl line-clamp-2">
              {chat.userSearchInput}
            </h2>

            {/* Tab bar */}
            <div className="flex items-center space-x-6 border-b border-gray-200 pb-2 mt-6">
              {tabs.map(({ label, icon: Icon, badge }) => (
                <button
                  key={label}
                  onClick={() => setActiveTab(label)}
                  className={`flex items-center gap-1 relative text-sm font-medium text-gray-700 hover:text-black ${
                    activeTab === label ? "text-black" : ""
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                  {badge && (
                    <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      {badge}
                    </span>
                  )}
                  {activeTab === label && (
                    <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-black rounded" />
                  )}
                </button>
              ))}
              <div className="ml-auto text-sm text-gray-500">
                1 task <span className="ml-1">🡥</span>
              </div>
            </div>

            {/* Tab content */}
            <div>
              {activeTab === "Answer" ? (
                <AnswerDisplay
                  chat={chat}
                  loadingSearch={isStreamingThis && streamingState.isLoadingSearch}
                  aiResp={resolvedAiResp}
                  isStreaming={isStreamingThis && streamingState.isStreaming}
                  followUps={resolvedFollowUps}
                  onFollowUp={(question) => runSearch(question)}
                />
              ) : activeTab === "Images" ? (
                <ImageListTab chat={chat} />
              ) : activeTab === "Videos" ? (
                <VideoListTab chat={chat} />
              ) : activeTab === "Sources" ? (
                <SourceListTab chat={chat} />
              ) : null}
            </div>

            <hr className="my-5" />
          </div>
        );
      })}

      {/* Fixed input bar */}
      <div className="bg-white w-full border rounded-lg shadow-md p-3 px-5 flex justify-between fixed bottom-6 max-w-md lg:max-w-2xl xl:max-w-3xl">
        <input
          value={userInput}
          placeholder="Type Anything..."
          className="outline-none w-full"
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        {userInput?.trim().length > 0 && (
          <Button
            onClick={handleSubmit}
            disabled={streamingState.isLoadingSearch || streamingState.isStreaming}
          >
            {streamingState.isLoadingSearch ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <Send />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default DisplayResult;
