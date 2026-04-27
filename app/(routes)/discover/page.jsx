"use client";
import React, { useEffect, useState } from "react";
import {
  Cpu,
  DollarSign,
  Globe,
  Palette,
  Star,
  Volleyball,
} from "lucide-react";
import axios from "axios";
import NewsCard from "./_components/NewsCard";
import { SEARCH_RESULT } from "@/app/services/Shared";

const options = [
  { title: "Top", icon: Star },
  { title: "Tech & Science", icon: Cpu },
  { title: "Finance", icon: DollarSign },
  { title: "Art & Culture", icon: Palette },
  { title: "Sports", icon: Volleyball },
];

function Discover() {
  const [selectedOption, setSelectedOption] = useState("Top");
  const [latestNews, setLatestNews] = useState();

  useEffect(() => {
    selectedOption && GetSearchResult();
  }, [selectedOption]);

  const GetSearchResult = async () => {
    const result = await axios.post("/api/serp-api", {
      searchInput: selectedOption + "Latest News & Updates",
      searchType: "Search",
    });
    console.log(result.data);
    const webSearchResult=result?.data?.organic_results
    setLatestNews(webSearchResult);
  };
  return (
    <div className="mt-20px-10 md:px-20 lg:px-36 xl:px-56 mt-20">
      <h2 className="font-bold text-2xl flex gap-2 items-center">
        <Globe /> <span> Discover</span>
      </h2>
      <div className="flex mt-5">
        {options.map((option, index) => (
          <div
            key={index}
            onClick={() => setSelectedOption(option.title)}
            className={`flex gap-1 p-1 px-3 hover:text-primary items-center cursor-pointer rounded-full
            ${selectedOption === option.title && "bg-accent text-primary"}`}
          >
            <option.icon className="h-4 w-4 text-sm" />
            <h2>{option.title}</h2>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {latestNews?.map((news, index) => (
          <div
            key={index}
            className={index % 4 === 0 ? "col-span-3" : "col-span-1"}
          >
            <NewsCard news={news}  />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Discover;
