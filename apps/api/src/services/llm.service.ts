import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { env } from "../config/env";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

export function createLLM(): BaseChatModel {
  if (env.AI_ENGINE === "ollama") {
    return new ChatOllama({
      model: env.OLLAMA_MODEL,
      baseUrl: env.OLLAMA_BASE_URL,
    });
  }

  return new ChatOpenAI({
    model: "gpt-4o-mini",
  });
}
