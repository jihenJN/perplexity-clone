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

const tabs = [
  { label: "Answer", icon: LucideSparkles },
  { label: "Images", icon: LucideImage },
  { label: "Videos", icon: LucideVideo },
  { label: "Sources", icon: LucideList, badge: 10 },
];

function DisplayResult({ searchInputRecord }) {
  const [activeTab, setActiveTab] = useState("Answer");
  const [searchResult, setSearchResult] = useState(searchInputRecord);
  const [aiResp, setAiResp] = useState(""); // ✅ added here
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [userInput, setUserInput] = useState();
  const { libId } = useParams();
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!searchInputRecord) return;

    const run = async () => {
      if (searchInputRecord?.Chats?.length === 0) {
        if (!hasFetched.current) {
          hasFetched.current = true;
          await GetSearchApiResult();
        }
      } else {
        setSearchResult(searchInputRecord);

        // ✅ If aiResp already saved in Supabase, load it directly
        const existingResp = searchInputRecord?.Chats?.[0]?.aiResp;
        if (existingResp) {
          setAiResp(existingResp);
        }
      }
    };

    run();
  }, [searchInputRecord]);

  const GetSearchApiResult = async () => {
    setLoadingSearch(true);
    setAiResp(""); // ✅ reset before new search

    const result = await axios.post("/api/serp-api", {
      searchInput: userInput ?? searchInputRecord?.searchInput,
      searchType: searchInputRecord?.type ?? "Search",
    });

    const searchResp = result.data;

    const formattedSearchResp = searchResp?.organic_results?.map((item) => ({
      title: item?.title,
      description: item?.about_this_result?.source?.description,
      img: item?.about_this_result?.source?.icon,
      url: item?.link,
      thumbnail: item?.thumbnail,
    }));

    // ✅ Save search results to Supabase
    const { data, error } = await supabase
      .from("Chats")
      .insert([
        {
          libId: libId,
          searchResult: formattedSearchResp,
          userSearchInput: userInput ?? searchInputRecord?.searchInput,
        },
      ])
      .select();

    if (error || !data?.length) {
      console.error("Supabase insert failed:", error);
      setLoadingSearch(false);
      return;
    }

    await GetSearchRecords();
    setLoadingSearch(false);

    // ✅ Stream AI response directly (no more Inngest!)
    await streamAIResponse(formattedSearchResp, data[0].id);
  };

  // ✅ New streaming function replaces GenerateAIResp
  const streamAIResponse = async (formattedSearchResp, chatId) => {
    if (!chatId) {
      console.error("No chat ID");
      return;
    }

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchInput: userInput ?? searchInputRecord?.searchInput,
        searchResult: formattedSearchResp,
      }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    // ✅ This updates UI word by word
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      fullText += chunk;
      setAiResp(fullText);
    }

    // ✅ Save full response to Supabase when done
    await supabase
      .from("Chats")
      .update({ aiResp: fullText })
      .eq("id", chatId);
  };

  const GetSearchRecords = async () => {
    let { data: Library } = await supabase
      .from("Library")
      .select("*,Chats(*)")
      .eq("libId", libId)
      .order("id", { foreignTable: "Chats", ascending: true });

    setSearchResult(Library[0]);
  };

  return (
    <div className="mt-7">
      {!searchResult && (
        <div>
          <div className="w-full h-4 animate-pulse bg-accent rounded-md"></div>
          <div className="w-1/2 mt-2 h-4 animate-pulse bg-accent rounded-md"></div>
          <div className="w-[70%] mt-2 h-4 animate-pulse bg-accent rounded-md"></div>
        </div>
      )}

      {searchResult?.Chats?.map((chat, index) => (
        <div key={index} className="mt-7">
          <h2 className="font-bold text-3xl line-clamp-2">
            {chat?.userSearchInput}
          </h2>

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
                  <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-black rounded"></span>
                )}
              </button>
            ))}
            <div className="ml-auto text-sm text-gray-500">
              1 task <span className="ml-1">🡥</span>
            </div>
          </div>

          <div>
            {activeTab === "Answer" ? (
              // ✅ pass aiResp from state, not from chat object
              <AnswerDisplay chat={chat} loadingSearch={loadingSearch} aiResp={aiResp} />
            ) : activeTab === "Images" ? (
              <ImageListTab chat={chat} />
            ) : activeTab === "Sources" ? (
              <SourceListTab chat={chat} />
            ) : null}
          </div>
          <hr className="my-5" />
        </div>
      ))}

      <div className="bg-white w-full border rounded-lg shadow-md p-3 px-5 flex justify-between fixed bottom-6 max-w-md lg:max-w-2 xl:max-w-3xl">
        <input
          placeholder="Type Anything..."
          className="outline-none"
          onChange={(e) => setUserInput(e.target.value)}
        />
        {userInput?.length && (
          <Button onClick={GetSearchApiResult} disabled={loadingSearch}>
            {loadingSearch ? <Loader2Icon className="animate-spin" /> : <Send />}
          </Button>
        )}
      </div>
    </div>
  );
}

export default DisplayResult;