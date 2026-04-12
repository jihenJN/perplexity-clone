import { supabase } from "@/app/services/Supabase";
import { inngest } from "@/inngest/client";

// export const processTask = inngest.createFunction(
//   { id: "process-task", triggers: { event: "app/task.created" } },
//   async ({ event, step }) => {
//     const result = await step.run("handle-task", async () => {
//       return { processed: true, id: event.data.id };
//     });

//     await step.sleep("pause", "1s");

//     return { message: `Task ${event.data.id} complete`, result };
//   },
// );

export const llmModel = inngest.createFunction(
  {
    id: "llm-model",
    triggers: {event: "llm-model"},
  },
  async ({ event, step }) => {
    const aiResp = await step.ai.infer("Hello", {
      model: step.ai.models.gemini({
        model: "gemini-1.5-flash",
        apiKey: process.env.GEMINI_API_KEY,
      }),
       body: {
        contents: [
          {
            role: "system",
            parts: [
              {
                text:
                  "Depends on user input sources,Summerize and seach about topic,Give a markdown text with proper formatting . User Input is:" +
                  event.data.searchInput,
              },
            ],
          },
          {
            role: "user",
            parts: [
              {
                text: JSON.stringify(event.data.searchResult),
              },
            ],
          },
        ],
      }

    });

     const saveToDb = await step.run("saveToDb", async () => {
     console.log(aiResp);
      const { data, error } = await supabase
        .from("Chats")
        .update({ aiResp: aiResp?.candidates[0].content.parts[0].text })
        .eq('id', event.data.recordId)
        .select();

        return aiResp;
    });
  }
);


