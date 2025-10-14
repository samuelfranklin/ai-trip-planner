import { Client, type ClientConfig } from "@langchain/langgraph-sdk";
import logger from "../config/logger";
import { env } from "../config/env";

let client: Client | null = null;

export function getLangGraphClient(): Client {
  if (!client) {
    logger.debug({ apiUrl: env.LANGGRAPH_API_URL }, "initializing langgraph client");
    const config: ClientConfig = {
      apiUrl: env.LANGGRAPH_API_URL,
    };
    if (env.LANGGRAPH_API_KEY) {
      config.apiKey = env.LANGGRAPH_API_KEY;
    }
    client = new Client(config);
  }
  return client;
}
