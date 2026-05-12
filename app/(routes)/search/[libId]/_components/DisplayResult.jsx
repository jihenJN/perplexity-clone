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
import LoadingSteps from "./LoadingSteps";

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
  const [streamingState, setStreamingState] = useState({
    chatIndex: null,
    rawText: "",
    isStreaming: false,
    isLoadingSearch: false,
    followUps: [],
  });
  const [userInput, setUserInput] = useState("");
  const { libId } = useParams();
  const hasFetched = useRef(false);

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

  const runSearch = async (query) => {
    if (!query?.trim()) return;

    setStreamingState({
      chatIndex: null,
      rawText: "",
      isStreaming: false,
      isLoadingSearch: true,
      followUps: [],
    });

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

    const placeholderChat = {
      _isPlaceholder: true,
      userSearchInput: query,
      searchResult: formattedSearchResp,
      aiResp: null,
      followUps: [],
    };
    setChats((prev) => {
      const updated = [...prev, placeholderChat];
      setStreamingState((s) => ({
        ...s,
        chatIndex: updated.length - 1,
        isLoadingSearch: false,
        isStreaming: true,
        rawText: "",
      }));
      return updated;
    });

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

    const { cleanAnswer, followUps: parsed } = extractFollowUps(fullText);

    setStreamingState((s) => ({
      ...s,
      isStreaming: false,
      followUps: parsed,
    }));

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

    setChats((prev) =>
      prev.map((chat) =>
        chat._isPlaceholder && chat.userSearchInput === query
          ? { ...data }
          : chat,
      ),
    );

    setStreamingState((s) => ({
      ...s,
      chatIndex: null,
      rawText: "",
      followUps: [],
    }));
  };

  const handleSubmit = () => {
    if (
      !userInput?.trim() ||
      streamingState.isLoadingSearch ||
      streamingState.isStreaming
    )
      return;
    runSearch(userInput);
    setUserInput("");
  };

  return (
    // Extra bottom padding so content isn't hidden behind the fixed input bar
    <div className="mt-5 sm:mt-7 pb-28">
      {chats.length === 0 &&
        (streamingState.isLoadingSearch || streamingState.isStreaming) && (
          <LoadingSteps
            isLoadingSearch={streamingState.isLoadingSearch}
            isStreaming={streamingState.isStreaming}
            hasText={streamingState.rawText.length > 0}
          />
        )}

      {chats.map((chat, index) => {
        const isStreamingThis = index === streamingState.chatIndex;

        const resolvedAiResp = isStreamingThis
          ? extractFollowUps(streamingState.rawText).cleanAnswer
          : chat.aiResp;

        const resolvedFollowUps = isStreamingThis
          ? streamingState.followUps
          : (chat.followUps ?? []);

        return (
          <div key={chat.id ?? `placeholder-${index}`} className="mt-5 sm:mt-7">
            {/* Query heading — smaller on mobile */}
            <h2 className="font-bold text-xl sm:text-3xl line-clamp-2">
              {chat.userSearchInput}
            </h2>

            {/* Tab bar — scrollable on mobile so it never wraps or clips */}
            <div className="flex items-center gap-1 sm:gap-4 sm:space-x-2 border-b border-gray-200 pb-2 mt-4 sm:mt-6 overflow-x-auto scrollbar-hide">
              {tabs.map(({ label, icon: Icon, badge }) => (
                <button
                  key={label}
                  onClick={() => setActiveTab(label)}
                  className={`flex items-center gap-1 relative text-sm font-medium whitespace-nowrap px-2 py-1 rounded-sm transition-colors
                    ${activeTab === label
                      ? "text-black"
                      : "text-gray-500 hover:text-gray-800"
                    }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {/* Label hidden on very small screens to save space */}
                  <span className="hidden xs:inline sm:inline">{label}</span>
                  {badge && (
                    <span className="ml-0.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      {badge}
                    </span>
                  )}
                  {activeTab === label && (
                    <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-black rounded" />
                  )}
                </button>
              ))}

              {/* "1 task" indicator pushed to the right */}
              <div className="ml-auto shrink-0 text-xs sm:text-sm text-gray-500 pr-1">
                1 task <span className="ml-0.5">🡥</span>
              </div>
            </div>

            {/* Tab content */}
            <div className="mt-2">
              {activeTab === "Answer" ? (
                <AnswerDisplay
                  chat={chat}
                  loadingSearch={
                    isStreamingThis ? streamingState.isLoadingSearch : false
                  }
                  isStreaming={
                    isStreamingThis ? streamingState.isStreaming : false
                  }
                  aiResp={resolvedAiResp}
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

       {/* Fixed input bar — centered at all screen sizes */}
      <div
        className="
          fixed bottom-4 left-1/2 -translate-x-1/2
          w-[calc(100%-2rem)] max-w-[880px]
          bg-white border rounded-xl shadow-lg
          p-2.5 px-4 flex items-center gap-2
          z-50
        "
      >
        <input
          value={userInput}
          placeholder="Type anything..."
          className="outline-none w-full text-sm sm:text-base bg-transparent"
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        {userInput?.trim().length > 0 && (
          <Button
            onClick={handleSubmit}
            disabled={
              streamingState.isLoadingSearch || streamingState.isStreaming
            }
            size="sm"
            className="shrink-0"
          >
            {streamingState.isLoadingSearch ? (
              <Loader2Icon className="animate-spin w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default DisplayResult;
