import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { searchInput } = await req.json();

  if (!searchInput) {
    return NextResponse.json({ error: "Please enter a search query" });
  }

  const result = await axios.get("https://serpapi.com/search", {
    params: {
      engine: "google_images",
      q: searchInput,
      num: 20,
      api_key: process.env.SERPAPI_KEY,
    },
  });

  const images = result.data?.images_results?.map((item) => ({
    title: item?.title,
    imageUrl: item?.original,
    thumbnail: item?.thumbnail,
    sourceUrl: item?.link,
    sourceDomain: item?.source,
  }));

  return NextResponse.json({ images });
}
