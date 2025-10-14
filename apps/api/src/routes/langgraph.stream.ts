import { Router } from "express";
import { z, ZodError } from "zod";
import type { StreamMode } from "@langchain/langgraph-sdk";
import logger from "../config/logger";
import { env } from "../config/env";
import { getLangGraphClient } from "../services/langgraph.client";

const router = Router();

const streamRequestSchema = z.object({
  threadId: z.string().trim().min(1, "threadId is required"),
  message: z.string().trim().min(1, "message cannot be empty"),
  streamMode: z.union([z.string(), z.array(z.string())]).optional(),
  metadata: z.record(z.unknown()).optional(),
  config: z.record(z.unknown()).optional(),
  context: z.unknown().optional(),
});

type StreamRequest = z.infer<typeof streamRequestSchema>;

function normalizeStreamMode(value: StreamRequest["streamMode"]): StreamMode | StreamMode[] | undefined {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value as StreamMode[];
  }
  return value as StreamMode;
}

router.post("/stream", async (req, res) => {
  const requestLog = logger.child({ route: "/langgraph/stream", method: "POST" });
  let payload: StreamRequest;
  try {
    payload = streamRequestSchema.parse(req.body ?? {});
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "invalid_request", details: error.errors });
      return;
    }
    requestLog.error({ err: error }, "unexpected error validating stream request");
    res.status(500).json({ error: "internal_error" });
    return;
  }

  const assistantId = env.LANGGRAPH_ASSISTANT_ID;
  if (!assistantId) {
    requestLog.error("missing LANGGRAPH_ASSISTANT_ID configuration");
    res.status(500).json({ error: "assistant_not_configured" });
    return;
  }

  const langGraph = getLangGraphClient();
  const abortController = new AbortController();
  req.on("close", () => {
    abortController.abort();
    requestLog.warn({ threadId: payload.threadId }, "client aborted langgraph stream");
  });

  res.status(200);
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  const maybeFlush = Reflect.get(res, "flushHeaders") as (() => void) | undefined;
  if (typeof maybeFlush === "function") {
    maybeFlush.call(res);
  }

  const sendChunk = (chunk: unknown) => {
    if (res.writableEnded) {
      return;
    }
    try {
      res.write(`${JSON.stringify(chunk)}\n`);
    } catch (error) {
      requestLog.warn({ err: error }, "failed to write stream chunk");
    }
  };

  sendChunk({
    type: "meta",
    data: {
      threadId: payload.threadId,
    },
  });

  try {
    const streamPayload: Record<string, unknown> = {
      input: {
        messages: [
          {
            role: "human",
            content: payload.message,
          },
        ],
      },
      signal: abortController.signal,
    };

    const streamMode = normalizeStreamMode(payload.streamMode);
    if (streamMode) {
      streamPayload.streamMode = streamMode;
    }
    if (payload.metadata) {
      streamPayload.metadata = payload.metadata;
    }
    if (payload.config) {
      streamPayload.config = payload.config;
    }
    if (typeof payload.context !== "undefined") {
      streamPayload.context = payload.context;
    }

    streamPayload.onRunCreated = (meta: { run_id: string; thread_id?: string }) => {
      sendChunk({
        type: "meta",
        data: {
          threadId: meta.thread_id ?? payload.threadId,
          runId: meta.run_id,
        },
      });
    };

    const stream = langGraph.runs.stream(payload.threadId, assistantId, streamPayload as any);

    for await (const event of stream as AsyncGenerator<Record<string, unknown>>) {
      const eventId = "id" in event ? (event.id as string | undefined) : undefined;
      const eventName = "event" in event ? (event.event as string | undefined) : undefined;
      const eventData = "data" in event ? event.data : undefined;

      sendChunk({
        type: "event",
        event: eventName,
        id: eventId,
        data: eventData,
      });
    }

    sendChunk({
      type: "complete",
      data: {
        threadId: payload.threadId,
      },
    });
  } catch (error) {
    if (abortController.signal.aborted) {
      requestLog.debug({ threadId: payload.threadId }, "langgraph stream aborted");
    } else {
      requestLog.error({ err: error, threadId: payload.threadId }, "langgraph stream failed");
      const message = error instanceof Error ? error.message : "unknown-error";
      sendChunk({
        type: "error",
        data: {
          message,
        },
      });
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

export const langGraphStreamRouter: ReturnType<typeof Router> = router;
