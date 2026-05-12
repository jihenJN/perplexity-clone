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
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header searchInputRecord={searchInputRecord} />

      {/*
        Padding scale:
          mobile  → px-4  (16px each side — comfortable thumb reach)
          sm      → px-8  (32px)
          md      → px-16 (64px)
          lg      → px-28 (112px)
          xl      → px-48 (192px)

        Top margin keeps content clear of the sticky header (~56px tall).
        Bottom margin leaves room above the fixed input bar in DisplayResult.
      */}
      <div className="flex-1 px-4 sm:px-8 md:px-16 lg:px-28 xl:px-48 mt-6 sm:mt-10">
        <DisplayResult searchInputRecord={searchInputRecord} />
      </div>
    </div>
  );
}

export default SearchQueryResult;
