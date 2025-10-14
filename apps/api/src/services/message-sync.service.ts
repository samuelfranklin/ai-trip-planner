import { MessageRole, Prisma } from "../generated/prisma";
import logger from "../config/logger";
import { prisma } from "../lib/prisma";
import { getLangGraphClient } from "./langgraph.client";

/**
 * Message structure from LangGraph SDK thread state
 */
interface LangGraphMessage {
  id?: string;
  type?: string;
  content: string | Array<{ type: string; text?: string; [key: string]: unknown }>;
  role?: string;
  name?: string;
  tool_calls?: Array<{
    id?: string;
    name: string;
    args: Record<string, unknown>;
    type?: string;
  }>;
  tool_call_id?: string;
  additional_kwargs?: Record<string, unknown>;
  response_metadata?: Record<string, unknown>;
}

/**
 * Formatted message ready for Prisma
 */
interface PrismaMessageData {
  role: MessageRole;
  content: string;
  toolCalls: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
  intent: string | null;
  entities: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
  sentiment: string | null;
}

/**
 * Extracts text content from LangGraph message content
 * Handles both string content and array of content blocks
 */
function extractTextContent(content: LangGraphMessage["content"]): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const textParts = content
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .filter((text): text is string => text !== undefined);

    return textParts.join("\n").trim();
  }

  return "";
}

/**
 * Extracts tool calls from LangGraph message
 * Returns null if no tool calls present
 */
function extractToolCalls(message: LangGraphMessage): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  if (!message.tool_calls || message.tool_calls.length === 0) {
    return Prisma.JsonNull;
  }

  return message.tool_calls.map((toolCall) => ({
    id: toolCall.id,
    name: toolCall.name,
    args: toolCall.args,
    type: toolCall.type ?? "function",
  })) as Prisma.InputJsonValue;
}

/**
 * Maps LangGraph message role to Prisma MessageRole enum
 */
function mapMessageRole(message: LangGraphMessage): MessageRole {
  const roleType = message.type?.toLowerCase() || message.role?.toLowerCase() || "";

  // Map common role types from LangGraph
  if (roleType.includes("human") || roleType === "user") {
    return "USER";
  }

  if (roleType.includes("ai") || roleType === "assistant") {
    return "ASSISTANT";
  }

  if (roleType.includes("system")) {
    return "SYSTEM";
  }

  // Tool messages are typically considered part of assistant flow
  if (roleType.includes("tool")) {
    return "ASSISTANT";
  }

  // Default to ASSISTANT for unknown types
  logger.warn({ messageType: message.type, messageRole: message.role }, "unknown message role type, defaulting to ASSISTANT");
  return "ASSISTANT";
}

/**
 * Converts LangGraph SDK message to Prisma-compatible format
 */
function formatMessageForPrisma(message: LangGraphMessage): PrismaMessageData {
  const content = extractTextContent(message.content);
  const role = mapMessageRole(message);
  const toolCalls = extractToolCalls(message);

  return {
    role,
    content: content || "(empty message)",
    toolCalls,
    intent: null,
    entities: Prisma.JsonNull,
    sentiment: null,
  };
}

/**
 * Syncs messages from LangGraph checkpointer to Prisma database
 *
 * This function:
 * 1. Fetches the latest thread state from LangGraph
 * 2. Extracts messages from the state
 * 3. Converts them to Prisma format
 * 4. Updates the database using a transaction (delete old + create new)
 *
 * @param threadId - The LangGraph thread ID to sync
 * @param runId - Optional run ID for logging purposes
 * @throws Error if sync fails critically
 */
export async function syncThreadMessages(threadId: string, runId?: string): Promise<void> {
  const syncLog = logger.child({
    function: "syncThreadMessages",
    threadId,
    runId,
  });

  syncLog.debug("starting message sync from langgraph to prisma");

  try {
    // Verify the conversation session exists in Prisma
    const session = await prisma.conversationSession.findUnique({
      where: { id: threadId },
    });

    if (!session) {
      syncLog.warn("conversation session not found in prisma, skipping sync");
      return;
    }

    // Fetch thread state from LangGraph
    const langGraph = getLangGraphClient();
    let threadState;

    try {
      threadState = await langGraph.threads.getState(threadId);
    } catch (error) {
      // If thread doesn't exist in LangGraph, log warning and return
      // This is not critical since the thread might have been just created
      if (error instanceof Error && error.message.includes("not found")) {
        syncLog.warn("langgraph thread not found, skipping sync");
        return;
      }
      throw error;
    }

    // Extract messages from state
    // The state.values can be an array or object depending on the graph structure
    const stateValues = threadState.values;
    let messages: LangGraphMessage[] | undefined;

    if (Array.isArray(stateValues)) {
      // If state.values is an array, look for messages in each item
      const messagesArray = stateValues.flatMap((item) => {
        if (item && typeof item === "object" && "messages" in item) {
          return Array.isArray(item.messages) ? item.messages : [];
        }
        return [];
      });
      messages = messagesArray.length > 0 ? (messagesArray as LangGraphMessage[]) : undefined;
    } else if (stateValues && typeof stateValues === "object" && "messages" in stateValues) {
      // If state.values is an object with a messages property
      messages = Array.isArray(stateValues.messages) ? (stateValues.messages as LangGraphMessage[]) : undefined;
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      syncLog.debug("no messages found in langgraph thread state");
      return;
    }

    syncLog.debug({ messageCount: messages.length }, "fetched messages from langgraph");

    // Convert messages to Prisma format
    const prismaMessages = messages.map((message, index) => {
      try {
        return formatMessageForPrisma(message);
      } catch (error) {
        syncLog.error(
          { err: error, messageIndex: index, messageType: message.type },
          "failed to format message, using placeholder",
        );
        return {
          role: "ASSISTANT" as MessageRole,
          content: "(message format error)",
          toolCalls: Prisma.JsonNull,
          intent: null,
          entities: Prisma.JsonNull,
          sentiment: null,
        };
      }
    });

    // Update database in transaction (delete all existing + create new ones)
    await prisma.$transaction(async (tx) => {
      // Delete all existing messages for this session
      const deleted = await tx.conversationMessage.deleteMany({
        where: { sessionId: threadId },
      });

      syncLog.debug({ deletedCount: deleted.count }, "deleted existing messages");

      // Create new messages
      const createData: Prisma.ConversationMessageCreateManyInput[] = prismaMessages.map((msg) => ({
        sessionId: threadId,
        role: msg.role,
        content: msg.content,
        toolCalls: msg.toolCalls,
        intent: msg.intent,
        entities: msg.entities,
        sentiment: msg.sentiment,
      }));

      await tx.conversationMessage.createMany({
        data: createData,
      });

      // Update session metadata
      const lastUserMessage = prismaMessages
        .filter((msg) => msg.role === "USER")
        .map((msg) => msg.content)
        .pop();

      const lastAssistantMessage = prismaMessages
        .filter((msg) => msg.role === "ASSISTANT")
        .map((msg) => msg.content)
        .pop();

      await tx.conversationSession.update({
        where: { id: threadId },
        data: {
          lastActivityAt: new Date(),
          context: {
            totalMessages: prismaMessages.length,
            lastUserMessage: lastUserMessage ?? null,
            lastAssistantMessage: lastAssistantMessage ?? null,
            updatedAt: new Date().toISOString(),
          },
        },
      });
    });

    syncLog.info({ syncedMessageCount: prismaMessages.length }, "successfully synced messages from langgraph to prisma");
  } catch (error) {
    syncLog.error({ err: error }, "message sync failed");
    throw error;
  }
}
