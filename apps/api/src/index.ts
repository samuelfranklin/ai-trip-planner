import express from "express";
import { randomUUID } from "crypto";
import { AIMessage, type BaseMessage, HumanMessage } from "@langchain/core/messages";
import swaggerUi from "swagger-ui-express";
import logger from "./config/logger";
import { env } from "./config/env";
import { agent } from "./agent";
import { conversationStore } from "./lib/conversation-store";
import openApiDocument from "./docs/openapi.json" assert { type: "json" };

const app = express();
const PORT = env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get("/openapi.json", (_req, res) => {
  res.json(openApiDocument);
});

app.get("/health", (req, res) => {
  res.send("OK - Server is healthy");
});

app.post("/agent", async (req, res) => {
  try {
    const body = req.body ?? {};
    const incomingMessage: unknown = body.message;
    const providedConversationId: unknown = body.conversationId;
    const resetConversation: unknown = body.reset;

    if (typeof incomingMessage !== "string" || incomingMessage.trim().length === 0) {
      return res.status(400).json({ error: "Request body must contain a non-empty 'message' field." });
    }

    const trimmedMessage = incomingMessage.trim();

    let conversationId =
      typeof providedConversationId === "string" && providedConversationId.trim().length > 0
        ? providedConversationId.trim()
        : randomUUID();

    if (resetConversation === true) {
      await conversationStore.clear(conversationId);
    }

    const history = await conversationStore.get(conversationId);

    const result = (await agent.invoke({
      messages: [...history, new HumanMessage(trimmedMessage)],
    })) as { messages: BaseMessage[] };

    // Pega a última mensagem do agente
    const lastMessage = result.messages[result.messages.length - 1];

    await conversationStore.set(conversationId, result.messages);

    const response = normalizeMessageContent(lastMessage?.content) ?? "Sem resposta";

    logger.debug(response);
    res.json({ conversationId, response });
  } catch (error: any) {
    console.error("=== ERROR DETAILS ===");
    console.error("Error:", error);
    console.error("Stack:", error?.stack);
    console.error("Message:", error?.message);
    console.error("====================");
    res.status(500).send("Internal Server Error");
  }
});

app.post("/agent/stream", async (req, res) => {
  const abortController = new AbortController();
  req.on("close", () => {
    abortController.abort();
  });

  const sendChunk = (chunk: unknown) => {
    if (res.writableEnded) {
      return;
    }
    res.write(`${JSON.stringify(chunk)}\n`);
  };

  try {
    const body = req.body ?? {};
    const incomingMessage: unknown = body.message;
    const providedConversationId: unknown = body.conversationId;
    const resetConversation: unknown = body.reset;

    if (typeof incomingMessage !== "string" || incomingMessage.trim().length === 0) {
      res.status(400).json({ error: "Request body must contain a non-empty 'message' field." });
      return;
    }

    const trimmedMessage = incomingMessage.trim();

    let conversationId =
      typeof providedConversationId === "string" && providedConversationId.trim().length > 0
        ? providedConversationId.trim()
        : randomUUID();

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    const maybeFlush = Reflect.get(res, "flushHeaders") as (() => void) | undefined;
    if (typeof maybeFlush === "function") {
      maybeFlush.call(res);
    }

    sendChunk({ type: "meta", data: { conversationId } });

    if (resetConversation === true) {
      await conversationStore.clear(conversationId);
    }

    const history = await conversationStore.get(conversationId);
    const userMessage = new HumanMessage(trimmedMessage);

    const stream = await agent.stream(
      {
        messages: [...history, userMessage],
      },
      {
        streamMode: ["messages"],
        signal: abortController.signal,
      },
    );

    let accumulatedText = "";
    for await (const chunk of stream) {
      const nextText = extractAssistantText(chunk);
      if (typeof nextText !== "string") {
        continue;
      }

      if (nextText.length === 0 || nextText === accumulatedText) {
        continue;
      }

      const delta = nextText.slice(accumulatedText.length);
      accumulatedText = nextText;

      sendChunk({
        type: "delta",
        data: {
          textDelta: delta,
          fullText: accumulatedText,
        },
      });
    }

    if (abortController.signal.aborted) {
      return;
    }

    const assistantMessage = new AIMessage({ content: accumulatedText });
    await conversationStore.set(conversationId, [...history, userMessage, assistantMessage]);

    sendChunk({
      type: "complete",
      data: {
        conversationId,
        text: accumulatedText,
      },
    });
  } catch (error) {
    if (abortController.signal.aborted) {
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ err: error }, "Streaming agent request failed");
    sendChunk({
      type: "error",
      data: {
        message,
      },
    });
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

function normalizeMessageContent(content?: BaseMessage["content"]): string | undefined {
  if (!content) {
    return undefined;
  }

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((chunk) => {
        if (typeof chunk === "string") {
          return chunk;
        }

        const chunkAsAny = chunk as Record<string, unknown>;

        if (chunkAsAny?.type === "text" && typeof chunkAsAny.text === "string") {
          return chunkAsAny.text;
        }

        if (chunkAsAny?.type === "tool_response" && chunkAsAny.toolResponse !== undefined) {
          const toolResponse = chunkAsAny.toolResponse;
          return typeof toolResponse === "string" ? toolResponse : JSON.stringify(toolResponse);
        }

        if ("json" in chunkAsAny && chunkAsAny.json !== undefined) {
          return JSON.stringify(chunkAsAny.json);
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return undefined;
}

function extractAssistantText(chunk: unknown): string | undefined {
  if (!Array.isArray(chunk) || chunk.length < 3) {
    return undefined;
  }

  const [, kind, payload] = chunk as [unknown, unknown, unknown];
  if (kind !== "messages" || !Array.isArray(payload) || payload.length === 0) {
    return undefined;
  }

  const entry = payload[0] as Record<string, unknown>;
  if (!entry) {
    return undefined;
  }

  const getType = Reflect.get(entry, "_getType") as (() => string) | undefined;
  const candidateType =
    typeof getType === "function"
      ? getType.call(entry)
      : typeof Reflect.get(entry, "type") === "string"
        ? (Reflect.get(entry, "type") as string)
        : undefined;

  if (candidateType !== "ai") {
    return undefined;
  }

  const content = Reflect.get(entry, "content") as BaseMessage["content"] | undefined;
  return normalizeMessageContent(content);
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
