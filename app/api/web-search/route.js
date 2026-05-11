import axios from "axios";
import { NextResponse } from "next/server";

// Only the fields DisplayResult actually reads — drops ~95% of SerpAPI payload
function pickFields(items = []) {
  return items.slice(0, 5).map((item) => ({
    title: item.title,
    link: item.link,
    thumbnail: item.thumbnail ?? null,
    description: item.snippet ?? item.description,
    img: item.about_this_result?.source?.icon ?? null,
  }));
}

export async function POST(req) {
  const { searchInput, searchType } = await req.json();

  if (!searchInput?.trim()) {
    return NextResponse.json(
      { error: "Please enter a search query." },
      { status: 400 },
    );
  }

  try {
    const { data } = await axios.get("https://serpapi.com/search", {
      params: {
        engine: "google",
        q: searchInput,
        num: 5,                        // keep 5 results
        api_key: process.env.SERPAPI_KEY,
        // ✅ Request only organic results — skip ads, knowledge graph, etc.
        filter: 1,
        safe: "active",
      },
     
    });

    return NextResponse.json(
      { organic_results: pickFields(data.organic_results) },
      {
        headers: {
          // ✅ Cache identical queries for 5 minutes at the edge
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      },
    );
  } catch (err) {
  
    console.error("SerpAPI error:", err.message);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 502 },
    );
  }
}