import React, { useEffect, useRef, useState } from "react";
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
import ImageListTab from "./ImageListTab";
import SourceListTab from "./SourceListTab";

const tabs = [
  { label: "Answer", icon: LucideSparkles },
  { label: "Images", icon: LucideImage },
  { label: "Videos", icon: LucideVideo },
  { label: "Sources", icon: LucideList, badge: 10 },
];

function DisplayResult({ searchInputRecord }) {
  const [activeTab, setActiveTab] = useState("Answer");
  const [searchResult, setSearchResult] = useState(searchInputRecord);
  const { libId } = useParams();

  const hasFetched = useRef(false); // prevent double call


   useEffect(() => {
  if (!searchInputRecord) return;

  const run = async () => {
    if (searchInputRecord?.Chats?.length === 0) {
      if (!hasFetched.current) {
        hasFetched.current = true;
        await GetSearchApiResult();
      }
    } else {
      setSearchResult(searchInputRecord); // ✅ sync state from prop immediately
    }
  };

  run();
}, [searchInputRecord]);


 
  // useEffect(() => {
  //   //update this method
  //   searchInputRecord?.Chats?.length === 0 ? GetSearchApiResult() : GetSearchRecords();

  //   setSearchResult(searchInputRecord);
  //   console.log(searchInputRecord);
  // }, [searchInputRecord]);

  const GetSearchApiResult = async () => {
    const result = await axios.post("/api/serp-api", {
      searchInput: searchInputRecord?.searchInput,
      searchType: searchInputRecord?.type,
    });
    console.log(result.data);
   const searchResp = result.data;
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
      .insert([
        {
          libId: libId,
          searchResult: formattedSearchResp,
          userSearchInput: searchInputRecord?.searchInput,
        },
      ])
      .select();

    if (error || !data?.length) {
      console.error("Supabase insert failed:", error);
      return; // stops here, GenerateAIResp never called
    }
    await GetSearchRecords();
    await GenerateAIResp(formattedSearchResp, data[0].id);
    //Pass to LLM Model
  };

  const GenerateAIResp = async (formattedSearchResp, recordId) => {
    const result = await axios.post("/api/llm-model", {
      searchInput: searchInputRecord?.searchInput,
      searchResult: formattedSearchResp,
      recordId: recordId,
    });

    const runId = result.data;

    console.log(runId);
    // // small delay to let Inngest register the run
    // await new Promise((res) => setTimeout(res, 1000));

    const interval = setInterval(async () => {
      const runResp = await axios.post("/api/get-inngest-status", {
        runId: runId,
      });

      if (runResp.data.data[0]?.status === "Completed") {
        console.log("Completed!!!");
        await GetSearchRecords();
        clearInterval(interval);
        //get updated data from database
      }
    }, 1000);
  };

  const GetSearchRecords= async()=>{
   let { data: Library, error } = await supabase
         .from("Library")
         .select("*,Chats(*)")
         .eq("libId", libId);

         setSearchResult(Library[0])
  };

  return (
    <div className="mt-7">
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
            {activeTab === "Answer" ? 
            (<AnswerDisplay chat={chat} />) : 
             activeTab === "Images" ? 
             (<ImageListTab chat={chat} />) : 
             activeTab === "Sources" ? 
             (<SourceListTab chat={chat}/>):
             null}
          </div>
          <hr className="my-5" />
        </div>
      ))}
    </div>
  );
}

export default DisplayResult;
