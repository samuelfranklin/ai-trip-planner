import { Router } from "express";
import { randomUUID } from "crypto";
import { type BaseMessage, HumanMessage } from "@langchain/core/messages";
import logger from "../config/logger";
import { agent } from "../agent";
import { conversationStore } from "../lib/conversation-store";

const router = Router();

router.post("/", async (req, res) => {
  const requestLog = logger.child({
    route: "/agent",
    method: "POST",
    conversationId: req.body?.conversationId,
  });
  try {
    const body = req.body ?? {};
    const incomingMessage: unknown = body.message;
    const providedConversationId: unknown = body.conversationId;
    const resetConversation: unknown = body.reset;

    if (typeof incomingMessage !== "string" || incomingMessage.trim().length === 0) {
      requestLog.warn("agent endpoint received empty message");
      res.status(400).json({ error: "Request body must contain a non-empty 'message' field." });
      return;
    }

    const trimmedMessage = incomingMessage.trim();
    requestLog.info(
      { messageLength: trimmedMessage.length, resetConversation: resetConversation === true },
      "agent request received",
    );

    let conversationId =
      typeof providedConversationId === "string" && providedConversationId.trim().length > 0
        ? providedConversationId.trim()
        : randomUUID();

    if (resetConversation === true) {
      requestLog.info({ conversationId }, "conversation reset requested");
      await conversationStore.clear(conversationId);
    }

    const history = await conversationStore.get(conversationId);

    const result = (await agent.invoke({
      messages: [...history, new HumanMessage(trimmedMessage)],
    })) as { messages: BaseMessage[] };

    const lastMessage = result.messages[result.messages.length - 1];

    await conversationStore.set(conversationId, result.messages);

    const response = normalizeMessageContent(lastMessage?.content) ?? "Sem resposta";

    requestLog.info({ conversationId, responseLength: response.length }, "agent response generated");
    res.json({ conversationId, response });
  } catch (error: any) {
    logger.error({ err: error }, "agent endpoint failed");
    res.status(500).send("Internal Server Error");
  }
});

router.post("/stream", async (req, res) => {
  const requestLog = logger.child({
    route: "/agent/stream",
    method: "POST",
    conversationId: req.body?.conversationId,
  });

  requestLog.info({ bodyParsed: !!req.body, bodyKeys: req.body ? Object.keys(req.body) : [] }, "request received, body parsed");

  const abortController = new AbortController();

  // Listen to response close, not request close!
  // Request closes after body is read, but response should stay open for streaming
  res.on("close", () => {
    if (!res.writableEnded) {
      requestLog.warn("response closed by client before completion");
      abortController.abort();
    } else {
      requestLog.info("response closed normally");
    }
  });

  const sendChunk = (chunk: unknown) => {
    if (res.writableEnded) {
      return;
    }
    res.write(`${JSON.stringify(chunk)}\n`);
    // Force flush to send chunk immediately
    const maybeSock = Reflect.get(res, "socket") as any;
    if (maybeSock && typeof maybeSock.write === "function") {
      // Socket already flushes automatically
    }
    // For HTTP/2 or other transports, no manual flush needed in Node.js
  };

  try {
    const body = req.body ?? {};
    const incomingMessage: unknown = body.message;
    const providedConversationId: unknown = body.conversationId;
    const resetConversation: unknown = body.reset;

    if (typeof incomingMessage !== "string" || incomingMessage.trim().length === 0) {
      requestLog.warn("stream endpoint received empty message");
      res.status(400).json({ error: "Request body must contain a non-empty 'message' field." });
      return;
    }

    const trimmedMessage = incomingMessage.trim();
    requestLog.info(
      { messageLength: trimmedMessage.length, resetConversation: resetConversation === true },
      "stream request received",
    );

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
    requestLog.info({ conversationId }, "stream meta chunk sent");

    if (resetConversation === true) {
      requestLog.info({ conversationId }, "stream reset requested");
      await conversationStore.clear(conversationId);
    }

    requestLog.info("fetching conversation history");
    const history = await conversationStore.get(conversationId);
    requestLog.info({ historyLength: history.length }, "history fetched");

    const userMessage = new HumanMessage(trimmedMessage);
    requestLog.info("user message created");

    let fullText = "";
    let currentAssistantContent = "";
    const toolOutputs: string[] = [];
    const allMessages: BaseMessage[] = [];

    requestLog.info("starting agent stream");

    const stream = await agent.stream({
      messages: [...history, userMessage],
    });

    requestLog.info("agent stream created, starting iteration");

    for await (const chunk of stream) {
      if (abortController.signal.aborted) {
        requestLog.warn("stream aborted during agent processing");
        return;
      }

      requestLog.info({ chunkKeys: Object.keys(chunk) }, "received chunk from agent.stream");

      // LangGraph stream yields { agent: { messages: [messages] } }
      if (chunk.agent && Array.isArray(chunk.agent.messages)) {
        for (const message of chunk.agent.messages) {
          allMessages.push(message);

          const messageType = getMessageType(message);
          const content = normalizeMessageContent(message.content);

          if (messageType === "ai" || messageType === "assistant") {
            // Stream AI message content token by token
            if (content && content.length > currentAssistantContent.length) {
              const newTokens = content.slice(currentAssistantContent.length);
              currentAssistantContent = content;
              fullText += newTokens;

              sendChunk({
                type: "delta",
                data: {
                  textDelta: newTokens,
                  fullText,
                },
              });
              requestLog.debug({ tokenLength: newTokens.length }, "ai token streamed");
            }
          } else if (messageType === "tool" || messageType === "function") {
            // Capture tool outputs
            if (content && content.trim().length > 0) {
              try {
                const parsed = JSON.parse(content);
                const formatted = JSON.stringify(parsed, null, 2);
                toolOutputs.push(formatted);
                fullText += "\n\n" + formatted;

                sendChunk({
                  type: "delta",
                  data: {
                    textDelta: "\n\n" + formatted,
                    fullText,
                  },
                });
                requestLog.debug({ toolOutputLength: formatted.length }, "tool output streamed");
              } catch {
                toolOutputs.push(content);
                fullText += "\n\n" + content;

                sendChunk({
                  type: "delta",
                  data: {
                    textDelta: "\n\n" + content,
                    fullText,
                  },
                });
              }
            }
          }
        }
      }
    }

    // Save final conversation state
    const finalMessages = [...history, userMessage, ...allMessages];
    await conversationStore.set(conversationId, finalMessages);

    sendChunk({
      type: "complete",
      data: {
        conversationId,
        text: fullText,
      },
    });
    requestLog.info({ conversationId, textLength: fullText.length, toolCount: toolOutputs.length }, "stream completed");
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
    requestLog.debug("stream response closed");
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

function getMessageType(message: BaseMessage): string | undefined {
  const getType = Reflect.get(message, "_getType") as (() => string) | undefined;
  if (typeof getType === "function") {
    try {
      return getType.call(message);
    } catch {
      // ignore
    }
  }

  const typeField = Reflect.get(message, "type");
  return typeof typeField === "string" ? typeField : undefined;
}

export const agentRouter: ReturnType<typeof Router> = router;
