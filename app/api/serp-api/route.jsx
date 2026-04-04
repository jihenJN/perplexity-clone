//import SearchQueryResult from "@/app/(routes)/search/[libId]/page";
import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { searchInput, searchType } = await req.json();
  
  if(searchInput){
 const result = await axios.get("https://serpapi.com/search", {
    params: {
      engine: "google",
      q: searchInput,
      api_key: process.env.SERPAPI_KEY,
    },
  });
  console.log(result.data)
  return NextResponse.json(result.data);
  } else {
     return NextResponse.json({error:'please enter user search query'});
  }

}
