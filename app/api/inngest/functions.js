import { supabase } from "@/app/services/Supabase";
import { inngest } from "@/inngest/client";

export const llmModel = inngest.createFunction(
  {
    id: "llm-model",
    triggers: [{ event: "llm-model" }],
  },
  async ({ event, step }) => {
    if (!event.data.searchInput || !event.data.searchResult) {
      throw new Error(
        `Missing data: searchInput=${event.data.searchInput}, searchResult=${JSON.stringify(event.data.searchResult)}`,
      );
    }
    const aiResp = await step.ai.infer("generate-ai-llm-model-call", {
      model: step.ai.models.gemini({
        model: "gemini-2.5-flash",
        apiKey: process.env.GEMINI_API_KEY,
      }),
      body: {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Depends on user input sources, Summarize and search about topic. Give a markdown text with proper formatting.
            
User Input: ${event.data.searchInput}

Search Results: ${JSON.stringify(event.data.searchResult)}`,
              },
            ],
          },
        ],
      },
    });


    const saveToDb = await step.run("saveToDb", async () => {
      
      const { data, error } = await supabase
        .from("Chats")
        .update({ aiResp: aiResp?.candidates[0].content.parts[0].text })
        .eq("id", event.data.recordId)
        .select();

      return aiResp;
    });


  },
);
