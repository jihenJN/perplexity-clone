import React, { useEffect, useState } from "react";
import {
  LucideImage,
  LucideList,
  LucideSparkles,
  LucideVideo,
} from "lucide-react";
import AnswerDisplay from "./AnswerDisplay";
import axios from "axios";
import { SEARCH_RESULT } from "@/app/services/Shared";
import { useParams } from "next/navigation";
import { supabase } from "@/app/services/Supabase";

const tabs = [
  { label: "Answer", icon: LucideSparkles },
  { label: "Images", icon: LucideImage },
  { label: "Videos", icon: LucideVideo },
  { label: "Sources", icon: LucideList, badge: 10 },
];

function DisplayResult({ searchInputRecord }) {
  const [activeTab, setActiveTab] = useState("Answer");
  const [searchResult, setSearchResult] = useState(SEARCH_RESULT);
  const { libId } = useParams();
  useEffect(() => {
    //update this method
    searchInputRecord && GetSearchApiResult();
  }, [searchInputRecord]);

  const GetSearchApiResult = async () => {
    // const result = await axios.post("/api/serp-api", {
    //   searchInput: searchInputRecord?.searchInput,
    //   searchType: searchInputRecord?.type,
    // });
    // console.log(result.data);
    const searchResp = SEARCH_RESULT;
    //save to DB
    const formattedSearchResp = searchResp?.organic_results?.map(
      (item, index) => ({
        title: item?.title,
        description: item?.about_this_result?.source?.description,
        img: item?.about_this_result?.source?.icon,
        url: item?.link,
        thumbnail: item?.thumbnail,
      }),
    );

    //Fetch Latest From DB

    const { data, error } = await supabase
      .from("Chats")
      .insert([{ libId: libId, searchResult: formattedSearchResp }])
      .select();

    if (error || !data?.length) {
      console.error("❌ Supabase insert failed:", error);
      return; // stops here, GenerateAIResp never called
    }
    await GenerateAIResp(formattedSearchResp, data[0].id);
    //Pass to LLM Model
  };

  const GenerateAIResp = async (formattedSearchResp, recordId) => {
    console.log("🔥 GenerateAIResp called!", { formattedSearchResp, recordId });

    try {
      const result = await axios.post("/api/llm-model", {
        searchInput: searchInputRecord?.searchInput,
        searchResult: formattedSearchResp,
        recordId: recordId,
      });
      console.log("✅ result:", result.data);
    } catch (error) {
      console.error("❌ axios error:", error.response?.data ?? error.message); // 👈 this will show the real error
    }
  };

  return (
    <div className="mt-7">
      <h2 className="font-medium text-3xl line-clamp-2">
        {searchInputRecord?.searchInput}
      </h2>
      <div className="flex items-center space-x-6 border-b border-gray-200 pb-2 mt-6">
        {tabs.map(({ label, icon: Icon, badge }) => (
          <button
            key={label}
            onClick={() => setActiveTab(label)}
            className={`flex items-center gap-1 relative text-sm font-medium text-gray-700 hover:text-black ${activeTab === label ? "text-black" : ""}`}
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
        {activeTab == "Answer" ? (
          <AnswerDisplay searchResult={searchResult} />
        ) : null}
      </div>
    </div>
  );
}

export default DisplayResult;
