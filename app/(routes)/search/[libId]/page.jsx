"use client";
import { supabase } from "@/app/services/Supabase";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import Header from "./_components/Header";
import DisplayResult from "./_components/DisplayResult";

function SearchQueryResult() {
  const { libId } = useParams();
  const [searchInputRecord, setSearchInputRecord] = useState();
  const [aiResp, setAiResp] = useState("");

  useEffect(() => {
    GetSearchQueryRecord();
  }, []);

  const GetSearchQueryRecord = async () => {
    let { data: Library } = await supabase
      .from("Library")
      .select("*,Chats(*)")
      .eq("libId", libId);

    const record = Library?.[0];
    setSearchInputRecord(record);

    const chat = record?.Chats?.[0];

    // ✅ Already has a response saved? just show it, no need to call AI again
    if (chat?.aiResp) {
      setAiResp(chat.aiResp);
      return;
    }

    // ✅ No response yet? stream it
    await streamAIResponse(record, chat);
  };

  const streamAIResponse = async (record, chat) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchInput: record?.searchInput,
        searchResult: chat?.searchResult,
      }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    // ✅ This loop updates the UI word by word as chunks arrive
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      fullText += chunk;
      setAiResp(fullText);
    }

    // ✅ Save final response to Supabase when streaming is complete
    await supabase
      .from("Chats")
      .update({ aiResp: fullText })
      .eq("id", chat?.id);
  };

  return (
    <div>
      <Header searchInputRecord={searchInputRecord} />
      <div className="px-10 md:px-20 lg:px-36 xl:px-56 mt-20">
        <DisplayResult searchInputRecord={searchInputRecord} aiResp={aiResp} />
      </div>
    </div>
  );
}

export default SearchQueryResult;