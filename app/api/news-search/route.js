import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { searchInput } = await req.json();

  if (!searchInput) {
    return NextResponse.json({ error: "Please enter a search query" });
  }

  const result = await axios.get("https://serpapi.com/search", {
    params: {
      engine: "google_news",
      q: searchInput,
      api_key: process.env.SERPAPI_KEY,
    },
  });

  const news = result.data?.news_results?.map((item) => ({
    title: item?.title,
    snippet: item?.snippet,
    date: item?.date,
    link: item?.link,
    thumbnail: item?.thumbnail,
    source: item?.source?.name,
    sourceIcon: item?.source?.icon,
  }));

  return NextResponse.json({ news });
}