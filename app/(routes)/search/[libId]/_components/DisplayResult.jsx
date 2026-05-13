import React, { useEffect, useRef, useState } from "react";
import {
  Loader2Icon,
  LucideImage,
  LucideList,
  LucideSparkles,
  LucideVideo,
  Mic,
  Plus,
  ArrowUp,
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
  const textareaRef = useRef(null);
  const { open, isMobile } = useSidebar();
  const sidebarOffset =
    !isMobile && open ? "var(--sidebar-width, 16rem)" : "0px";
  const isBusy = streamingState.isLoadingSearch || streamingState.isStreaming;
  const hasInput = userInput.trim().length > 0;

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

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [userInput]);

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
    <div className="mt-5 sm:mt-7 pb-32">
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
                    ${
                      activeTab === label
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
        className="fixed bottom-0 flex justify-center items-end pb-4 pt-8 pointer-events-none bg-gradient-to-t from-white via-white/90 to-transparent z-50"
        style={{ left: sidebarOffset, right: 0, transition: "left 200ms ease" }}
      >
        <div className="pointer-events-auto w-full mx-4 sm:mx-8 md:mx-16 lg:mx-28 xl:mx-48 bg-white border border-gray-300 rounded-3xl shadow-sm px-4 py-3 flex flex-col gap-3">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={userInput}
            placeholder="Ask anything..."
            className="w-full resize-none outline-none text-sm sm:text-[15px] bg-transparent leading-6 max-h-[200px] overflow-y-auto placeholder:text-gray-400 text-gray-800"
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            {/* Left actions */}
            <div className="flex items-center gap-1">
              <Button  variant="ghost" className="flex items-center justify-center w-8 h-8  text-gray-500 hover:bg-gray-100 transition-colors">
                <Plus className="w-[18px] h-[18px]" />
              </Button>
            </div>

            {/* Right: send or mic */}
            <Button
              variant="ghost"
              size="icon"
              onClick={hasInput ? handleSubmit : undefined}
              disabled={isBusy}
              className={` w-8 h-8 transition-all duration-150
        ${
          hasInput
            ? "bg-primary text-white hover:bg-gray-100 disabled:opacity-40"
            : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        }`}
            >
              {isBusy ? (
                <Loader2Icon className="w-8 h-8 animate-spin " />
              ) : hasInput ? (
                <ArrowUp className="w-[15px] h-[15px]" />
              ) : (
                <Mic className="w-[18px] h-[18px]" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DisplayResult;
