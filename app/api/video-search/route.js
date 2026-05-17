import axios from "axios";
import { NextResponse } from "next/server";

function normalizeThumbnail(thumbnail) {
  if (!thumbnail) return null;
  if (typeof thumbnail === "string") return thumbnail;
  return thumbnail.original ?? thumbnail.static ?? null;
}

function pickVideoFields(items = []) {
  return items
    .filter((item) => item?.link && item?.title)
    .slice(0, 12)
    .map((item) => ({
      title: item.title,
      videoUrl: item.link,
      thumbnail: normalizeThumbnail(item.thumbnail),
      channel: item.channel ?? item.source ?? item.displayed_link,
      duration: item.duration ?? item.length ?? null,
      publishedDate: item.date ?? item.published_date ?? null,
      platform: item.platform ?? item.source ?? null,
    }));
}

export async function POST(req) {
  const { searchInput } = await req.json();
  const query = searchInput?.trim();

  if (!query) {
    return NextResponse.json({ error: "Please enter a search query" }, { status: 400 });
  }

  try {
    const { data } = await axios.get("https://serpapi.com/search", {
      params: {
        engine: "google_videos",
        q: query,
        num: 12,
        hl: "en",
        gl: "us",
        api_key: process.env.SERPAPI_KEY,
      },
    });

    return NextResponse.json(
      { videos: pickVideoFields(data?.video_results) },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      },
    );
  } catch (err) {
    console.error("Video search error:", err?.response?.data ?? err?.message);
    return NextResponse.json(
      { error: "Video search failed. Please try again.", videos: [] },
      { status: 502 },
    );
  }
}
