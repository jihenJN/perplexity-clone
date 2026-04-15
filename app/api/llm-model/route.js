
import { inngest } from "@/inngest/client";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { searchInput, searchResult, recordId } = await req.json();
    const inngestRunId = await inngest.send({
      name: "llm-model",
      data: { searchInput, searchResult, recordId },
    });

    return NextResponse.json(inngestRunId.ids[0]);
  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}