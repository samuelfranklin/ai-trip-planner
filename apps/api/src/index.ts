import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import logger from "./config/logger";
import { env } from "./config/env";
import openApiDocument from "./docs/openapi.json" assert { type: "json" };
import { agentRouter } from "./routes/agent.routes.js";
import { threadsRouter } from "./routes/threads.js";
import { langGraphStreamRouter } from "./routes/langgraph.stream.js";

const app = express();
const PORT = env.PORT;

const allowAllOrigins = env.CLIENT_ORIGINS.includes("*");
const originMatchers = env.CLIENT_ORIGINS.filter((origin) => origin !== "*").map(createOriginMatcher);

const corsMiddleware = cors({
  origin(origin, callback) {
    if (allowAllOrigins || !origin || isAllowedOrigin(origin, originMatchers)) {
      callback(null, true);
      return;
    }
    logger.warn({ origin, allowed: env.CLIENT_ORIGINS }, "cors origin rejected");
    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
});

app.use(corsMiddleware);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get("/openapi.json", (_req, res) => {
  res.json(openApiDocument);
});

app.use("/agent", agentRouter);
app.use("/threads", threadsRouter);
app.use("/langgraph", langGraphStreamRouter);

app.get("/health", (req, res) => {
  res.send("OK - Server is healthy");
});

type OriginMatcher = string | RegExp;

function createOriginMatcher(origin: string): OriginMatcher {
  if (!origin.includes("*")) {
    return origin;
  }

  const escaped = origin.split("*").map(escapeRegExp).join(".*");
  return new RegExp(`^${escaped}$`);
}

function isAllowedOrigin(candidate: string, matchers: OriginMatcher[]): boolean {
  return matchers.some((matcher) => {
    if (typeof matcher === "string") {
      return matcher === candidate;
    }
    return matcher.test(candidate);
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
