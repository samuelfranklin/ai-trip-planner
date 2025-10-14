import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("3000"),
  AI_ENGINE: z.enum(["ollama", "openai"]).default("openai"),
  OPENAI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("llama3.2"),
  CLIENT_ORIGINS: z.string().optional(),
  CLIENT_ORIGIN: z.string().optional(),
  LANGGRAPH_API_URL: z.string().default("http://localhost:8123"),
  LANGGRAPH_API_KEY: z.string().optional(),
  LANGGRAPH_ASSISTANT_ID: z.string().min(1, "LANGGRAPH_ASSISTANT_ID is required"),
});

const rawEnv = envSchema.parse(process.env);

const DEFAULT_CLIENT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:*",
  "http://127.0.0.1:*",
];

const rawOrigins = rawEnv.CLIENT_ORIGINS ?? rawEnv.CLIENT_ORIGIN ?? DEFAULT_CLIENT_ORIGINS.join(",");
const clientOrigins = rawOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

export const env = {
  PORT: rawEnv.PORT,
  AI_ENGINE: rawEnv.AI_ENGINE,
  OPENAI_API_KEY: rawEnv.OPENAI_API_KEY,
  OLLAMA_BASE_URL: rawEnv.OLLAMA_BASE_URL,
  OLLAMA_MODEL: rawEnv.OLLAMA_MODEL,
  CLIENT_ORIGINS: clientOrigins.length > 0 ? clientOrigins : DEFAULT_CLIENT_ORIGINS,
  LANGGRAPH_API_URL: rawEnv.LANGGRAPH_API_URL,
  LANGGRAPH_API_KEY: rawEnv.LANGGRAPH_API_KEY,
  LANGGRAPH_ASSISTANT_ID: rawEnv.LANGGRAPH_ASSISTANT_ID,
};
