
import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { searchInput } = await req.json();

  if (!searchInput) {
    return NextResponse.json({ error: "Please enter a search query" });
  }

  const result = await axios.get("https://serpapi.com/search", {
    params: {
      engine: "google_videos_light",
      q: searchInput,
      num: 10,
      api_key: process.env.SERPAPI_KEY,
    },
  });

  const videos = result.data?.video_results?.map((item) => ({
    title: item?.title,
    videoUrl: item?.link,
    thumbnail: item?.thumbnail?.original ?? item?.thumbnail,
    channel: item?.channel,
    duration: item?.duration,
    publishedDate: item?.published_date,
    platform: item?.platform,
  }));

  return NextResponse.json({ videos });
}
