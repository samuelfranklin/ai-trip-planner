import dotenv from "dotenv";
import { z } from "zod";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

dotenv.config();

const configSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required for LangGraph persistence"),
  LANGGRAPH_CHECKPOINT_SCHEMA: z.string().optional(),
  LANGGRAPH_GRAPH_ID: z.string().optional(),
});

const env = configSchema.parse(process.env);

const checkpointer = PostgresSaver.fromConnString(env.DATABASE_URL, {
  schema: env.LANGGRAPH_CHECKPOINT_SCHEMA ?? "langgraph",
});

await checkpointer.setup();

export default {
  graphs: [
    {
      id: env.LANGGRAPH_GRAPH_ID ?? "travel-agent",
      // Wrap dynamic import so the compiled graph is only loaded when needed.
      graph: async () => {
        const module = await import("./src/agent");
        if ("graph" in module && module.graph) {
          return module.graph;
        }
        if ("stateGraph" in module && module.stateGraph) {
          return module.stateGraph;
        }
        if ("agent" in module && module.agent) {
          return module.agent;
        }
        throw new Error("Unable to resolve LangGraph graph export from src/agent.ts");
      },
      checkpointer,
    },
  ],
};
