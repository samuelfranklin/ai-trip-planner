import express from "express";
import { randomUUID } from "crypto";
import { type BaseMessage, HumanMessage } from "@langchain/core/messages";
import logger from "./config/logger";
import { env } from "./config/env";
import { agent } from "./agent";
import { conversationStore } from "./lib/conversation-store";

const app = express();
const PORT = env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      conversationStore.clear(conversationId);
    }

    const history = conversationStore.get(conversationId);

    const result = (await agent.invoke({
      messages: [...history, new HumanMessage(trimmedMessage)],
    })) as { messages: BaseMessage[] };

    // Pega a última mensagem do agente
    const lastMessage = result.messages[result.messages.length - 1];

    conversationStore.set(conversationId, result.messages);

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
