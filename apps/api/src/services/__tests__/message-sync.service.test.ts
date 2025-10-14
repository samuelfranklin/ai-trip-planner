/// <reference types="jest" />

// Mock environment before imports
process.env.LANGGRAPH_ASSISTANT_ID = "test-assistant-id";
process.env.LANGGRAPH_API_URL = "http://localhost:8123";

jest.mock("../../services/langgraph.client");
jest.mock("../../lib/prisma");

import { syncThreadMessages } from "../message-sync.service";
import { getLangGraphClient } from "../langgraph.client";
import { prisma } from "../../lib/prisma";
import { MessageRole } from "../../generated/prisma";

const mockLangGraphClient = getLangGraphClient as jest.MockedFunction<typeof getLangGraphClient>;
// Create mock types
const mockConversationSession = {
  findUnique: jest.fn(),
  update: jest.fn(),
};

const mockConversationMessage = {
  deleteMany: jest.fn(),
  createMany: jest.fn(),
};

const mockPrismaTransaction = jest.fn();

const mockPrisma = {
  conversationSession: mockConversationSession,
  conversationMessage: mockConversationMessage,
  $transaction: mockPrismaTransaction,
};

// Override the prisma import
(prisma as any).conversationSession = mockConversationSession;
(prisma as any).conversationMessage = mockConversationMessage;
(prisma as any).$transaction = mockPrismaTransaction;

describe("Message Sync Service", () => {
  let mockGetState: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetState = jest.fn();

    mockLangGraphClient.mockReturnValue({
      threads: {
        getState: mockGetState,
      },
    } as any);

    // Mock transaction to execute callback immediately
    mockPrismaTransaction.mockImplementation(async (callback) => {
      return callback(mockPrisma);
    });
  });

  describe("syncThreadMessages()", () => {
    it("successfully syncs messages from LangGraph to Prisma", async () => {
      const threadId = "thread-123";

      // Mock Prisma session exists
      mockConversationSession.findUnique.mockResolvedValueOnce({
        id: threadId,
        intent: "Test",
      });

      // Mock LangGraph state with messages
      mockGetState.mockResolvedValueOnce({
        values: {
          messages: [
            {
              type: "human",
              content: "Hello",
            },
            {
              type: "ai",
              content: "Hi there! How can I help?",
            },
            {
              type: "human",
              content: "I need flight info",
            },
          ],
        },
      });

      mockConversationMessage.deleteMany.mockResolvedValueOnce({ count: 0 });
      mockConversationMessage.createMany.mockResolvedValueOnce({ count: 3 });
      mockConversationSession.update.mockResolvedValueOnce({});

      await syncThreadMessages(threadId);

      // Verify session was checked
      expect(mockConversationSession.findUnique).toHaveBeenCalledWith({
        where: { id: threadId },
      });

      // Verify LangGraph state was fetched
      expect(mockGetState).toHaveBeenCalledWith(threadId);

      // Verify old messages were deleted
      expect(mockConversationMessage.deleteMany).toHaveBeenCalledWith({
        where: { sessionId: threadId },
      });

      // Verify new messages were created
      expect(mockConversationMessage.createMany).toHaveBeenCalledWith({
        data: [
          {
            sessionId: threadId,
            role: "USER",
            content: "Hello",
            toolCalls: expect.anything(), // Can be null or Prisma.JsonNull
            intent: null,
            entities: expect.anything(), // Can be null or Prisma.JsonNull
            sentiment: null,
          },
          {
            sessionId: threadId,
            role: "ASSISTANT",
            content: "Hi there! How can I help?",
            toolCalls: expect.anything(),
            intent: null,
            entities: expect.anything(),
            sentiment: null,
          },
          {
            sessionId: threadId,
            role: "USER",
            content: "I need flight info",
            toolCalls: expect.anything(),
            intent: null,
            entities: expect.anything(),
            sentiment: null,
          },
        ],
      });

      // Verify session was updated with metadata
      expect(mockConversationSession.update).toHaveBeenCalledWith({
        where: { id: threadId },
        data: {
          lastActivityAt: expect.any(Date),
          context: {
            totalMessages: 3,
            lastUserMessage: "I need flight info",
            lastAssistantMessage: "Hi there! How can I help?",
            updatedAt: expect.any(String),
          },
        },
      });
    });

    it("maps message roles correctly", async () => {
      const threadId = "thread-456";

      mockConversationSession.findUnique.mockResolvedValueOnce({
        id: threadId,
      });

      mockGetState.mockResolvedValueOnce({
        values: {
          messages: [
            { type: "HumanMessage", content: "user message" },
            { type: "AIMessage", content: "assistant message" },
            { type: "SystemMessage", content: "system message" },
            { role: "user", content: "user via role" },
            { role: "assistant", content: "assistant via role" },
            { type: "ToolMessage", content: "tool message" },
          ],
        },
      });

      mockConversationMessage.deleteMany.mockResolvedValueOnce({ count: 0 });
      mockConversationMessage.createMany.mockResolvedValueOnce({ count: 6 });
      mockConversationSession.update.mockResolvedValueOnce({});

      await syncThreadMessages(threadId);

      expect(mockPrisma.conversationMessage.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ role: "USER", content: "user message" }),
          expect.objectContaining({ role: "ASSISTANT", content: "assistant message" }),
          expect.objectContaining({ role: "SYSTEM", content: "system message" }),
          expect.objectContaining({ role: "USER", content: "user via role" }),
          expect.objectContaining({ role: "ASSISTANT", content: "assistant via role" }),
          expect.objectContaining({ role: "ASSISTANT", content: "tool message" }),
        ]),
      });
    });

    it("handles complex content arrays", async () => {
      const threadId = "thread-789";

      mockConversationSession.findUnique.mockResolvedValueOnce({
        id: threadId,
      });

      mockGetState.mockResolvedValueOnce({
        values: {
          messages: [
            {
              type: "human",
              content: [
                { type: "text", text: "First part" },
                { type: "text", text: "Second part" },
                { type: "image", url: "http://example.com/image.jpg" },
              ],
            },
          ],
        },
      });

      mockConversationMessage.deleteMany.mockResolvedValueOnce({ count: 0 });
      mockConversationMessage.createMany.mockResolvedValueOnce({ count: 1 });
      mockConversationSession.update.mockResolvedValueOnce({});

      await syncThreadMessages(threadId);

      expect(mockPrisma.conversationMessage.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            content: "First part\nSecond part",
          }),
        ],
      });
    });

    it("extracts tool calls from messages", async () => {
      const threadId = "thread-tools";

      mockConversationSession.findUnique.mockResolvedValueOnce({
        id: threadId,
      });

      mockGetState.mockResolvedValueOnce({
        values: {
          messages: [
            {
              type: "ai",
              content: "Let me search for flights",
              tool_calls: [
                {
                  id: "call-1",
                  name: "search_flights",
                  args: { origin: "GRU", destination: "JFK" },
                  type: "function",
                },
              ],
            },
          ],
        },
      });

      mockConversationMessage.deleteMany.mockResolvedValueOnce({ count: 0 });
      mockConversationMessage.createMany.mockResolvedValueOnce({ count: 1 });
      mockConversationSession.update.mockResolvedValueOnce({});

      await syncThreadMessages(threadId);

      expect(mockPrisma.conversationMessage.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            toolCalls: [
              {
                id: "call-1",
                name: "search_flights",
                args: { origin: "GRU", destination: "JFK" },
                type: "function",
              },
            ],
          }),
        ],
      });
    });

    it("handles missing thread in Prisma gracefully", async () => {
      const threadId = "missing-thread";

      mockConversationSession.findUnique.mockResolvedValueOnce(null);

      await syncThreadMessages(threadId);

      // Should not attempt to fetch from LangGraph
      expect(mockGetState).not.toHaveBeenCalled();
      expect(mockConversationMessage.createMany).not.toHaveBeenCalled();
    });

    it("handles missing thread in LangGraph gracefully", async () => {
      const threadId = "thread-not-in-langgraph";

      mockConversationSession.findUnique.mockResolvedValueOnce({
        id: threadId,
      });

      mockGetState.mockRejectedValueOnce(new Error("Thread not found"));

      await syncThreadMessages(threadId);

      // Should not attempt to create messages
      expect(mockConversationMessage.createMany).not.toHaveBeenCalled();
    });

    it("handles empty messages array", async () => {
      const threadId = "thread-empty";

      mockConversationSession.findUnique.mockResolvedValueOnce({
        id: threadId,
      });

      mockGetState.mockResolvedValueOnce({
        values: {
          messages: [],
        },
      });

      await syncThreadMessages(threadId);

      // Should not attempt to create messages
      expect(mockConversationMessage.createMany).not.toHaveBeenCalled();
    });

    it("handles missing messages in state", async () => {
      const threadId = "thread-no-messages";

      mockConversationSession.findUnique.mockResolvedValueOnce({
        id: threadId,
      });

      mockGetState.mockResolvedValueOnce({
        values: {},
      });

      await syncThreadMessages(threadId);

      // Should not attempt to create messages
      expect(mockConversationMessage.createMany).not.toHaveBeenCalled();
    });

    it("handles LangGraph connection errors", async () => {
      const threadId = "thread-error";

      mockConversationSession.findUnique.mockResolvedValueOnce({
        id: threadId,
      });

      mockGetState.mockRejectedValueOnce(new Error("Connection refused"));

      await expect(syncThreadMessages(threadId)).rejects.toThrow("Connection refused");
    });

    it("handles Prisma transaction errors", async () => {
      const threadId = "thread-tx-error";

      mockConversationSession.findUnique.mockResolvedValueOnce({
        id: threadId,
      });

      mockGetState.mockResolvedValueOnce({
        values: {
          messages: [{ type: "human", content: "Hello" }],
        },
      });

      mockPrismaTransaction.mockRejectedValueOnce(new Error("Transaction failed"));

      await expect(syncThreadMessages(threadId)).rejects.toThrow("Transaction failed");
    });

    it("handles malformed messages gracefully", async () => {
      const threadId = "thread-malformed";

      mockConversationSession.findUnique.mockResolvedValueOnce({
        id: threadId,
      });

      mockGetState.mockResolvedValueOnce({
        values: {
          messages: [
            { type: "human", content: "Valid message" },
            { type: "unknown", content: null }, // Malformed
            { type: "ai", content: "Another valid message" },
          ],
        },
      });

      mockConversationMessage.deleteMany.mockResolvedValueOnce({ count: 0 });
      mockConversationMessage.createMany.mockResolvedValueOnce({ count: 3 });
      mockConversationSession.update.mockResolvedValueOnce({});

      await syncThreadMessages(threadId);

      // Should create all 3 messages (malformed one with placeholder)
      expect(mockPrisma.conversationMessage.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ content: "Valid message" }),
          expect.objectContaining({ content: "(empty message)" }),
          expect.objectContaining({ content: "Another valid message" }),
        ]),
      });
    });

    it("accepts optional runId for logging", async () => {
      const threadId = "thread-with-runid";
      const runId = "run-12345";

      mockConversationSession.findUnique.mockResolvedValueOnce({
        id: threadId,
      });

      mockGetState.mockResolvedValueOnce({
        values: {
          messages: [{ type: "human", content: "Test" }],
        },
      });

      mockConversationMessage.deleteMany.mockResolvedValueOnce({ count: 0 });
      mockConversationMessage.createMany.mockResolvedValueOnce({ count: 1 });
      mockConversationSession.update.mockResolvedValueOnce({});

      // Should not throw even with runId
      await expect(syncThreadMessages(threadId, runId)).resolves.not.toThrow();
    });
  });
});
