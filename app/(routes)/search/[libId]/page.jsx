"use client";
import { supabase } from "@/app/services/Supabase";
import { useParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import Header from "./_components/Header";
import DisplayResult from "./_components/DisplayResult";

function SearchQueryResult() {
  const { libId } = useParams();
  const [searchInputRecord, setSearchInputRecord] = useState();
  const hasFetched = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode double-invoke
    if (hasFetched.current) return;
    hasFetched.current = true;
    GetSearchQueryRecord();
  }, []);

  const GetSearchQueryRecord = async () => {
    const { data: Library } = await supabase
      .from("Library")
      .select("*,Chats(*)")
      .eq("libId", libId)
      .order("id", { foreignTable: "Chats", ascending: true });

    setSearchInputRecord(Library?.[0]);
    // ✅ That's it — DisplayResult owns all streaming + saving logic
  };

  return (
    <div>
      <Header searchInputRecord={searchInputRecord} />
      <div className="px-10 md:px-20 lg:px-36 xl:px-56 mt-20 mb-25">
        <DisplayResult searchInputRecord={searchInputRecord} />
      </div>
    </div>
  );
}

export default SearchQueryResult;
