import { serve } from "inngest/next";
import { llmModel } from "./functions";
import { inngest } from "@/inngest/client";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [llmModel],
});