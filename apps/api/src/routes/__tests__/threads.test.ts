/// <reference types="jest" />

// Mock environment before imports
process.env.LANGGRAPH_ASSISTANT_ID = "test-assistant-id";
process.env.LANGGRAPH_API_URL = "http://localhost:8123";

jest.mock("../../services/langgraph.client");
jest.mock("../../lib/prisma");

import request from "supertest";
import express, { type Express } from "express";
import { threadsRouter } from "../threads";
import { getLangGraphClient } from "../../services/langgraph.client";
import { prisma } from "../../lib/prisma";

const mockLangGraphClient = getLangGraphClient as jest.MockedFunction<typeof getLangGraphClient>;
const mockPrisma = prisma as unknown as {
  conversationSession: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  conversationMessage: {
    deleteMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe("Threads API", () => {
  let app: Express;
  let mockThreadsCreate: jest.Mock;
  let mockThreadsDelete: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockThreadsCreate = jest.fn();
    mockThreadsDelete = jest.fn();

    mockLangGraphClient.mockReturnValue({
      threads: {
        create: mockThreadsCreate,
        delete: mockThreadsDelete,
      },
    } as any);

    app = express();
    app.use(express.json());
    app.use("/threads", threadsRouter);
  });

  describe("POST /threads", () => {
    it("creates a thread in both Prisma and LangGraph", async () => {
      const mockSession = {
        id: "test-thread-id",
        intent: "Test Thread",
        startedAt: new Date("2025-01-01T00:00:00Z"),
        lastActivityAt: new Date("2025-01-01T00:00:00Z"),
        completedAt: null,
        context: {
          totalMessages: 0,
          lastUserMessage: null,
          lastAssistantMessage: null,
          updatedAt: expect.any(String),
        },
      };

      mockThreadsCreate.mockResolvedValueOnce({ thread_id: "test-thread-id" });
      (mockPrisma.conversationSession.create as jest.Mock).mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .post("/threads")
        .send({ title: "Test Thread" })
        .expect(201);

      expect(mockThreadsCreate).toHaveBeenCalledWith({
        threadId: expect.any(String),
        metadata: { title: "Test Thread" },
      });

      expect(mockPrisma.conversationSession.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String),
          intent: "Test Thread",
          context: {
            totalMessages: 0,
            lastUserMessage: null,
            lastAssistantMessage: null,
            updatedAt: expect.any(String),
          },
        },
      });

      expect(response.body).toMatchObject({
        thread: {
          id: "test-thread-id",
          title: "Test Thread",
          status: "ACTIVE",
        },
      });
    });

    it("creates a thread without title", async () => {
      const mockSession = {
        id: "test-thread-id",
        intent: null,
        startedAt: new Date("2025-01-01T00:00:00Z"),
        lastActivityAt: new Date("2025-01-01T00:00:00Z"),
        completedAt: null,
        context: {
          totalMessages: 0,
          lastUserMessage: null,
          lastAssistantMessage: null,
          updatedAt: expect.any(String),
        },
      };

      mockThreadsCreate.mockResolvedValueOnce({ thread_id: "test-thread-id" });
      (mockPrisma.conversationSession.create as jest.Mock).mockResolvedValueOnce(mockSession);

      const response = await request(app).post("/threads").send({}).expect(201);

      expect(mockThreadsCreate).toHaveBeenCalledWith({
        threadId: expect.any(String),
        metadata: undefined,
      });

      expect(response.body.thread.title).toBe("Nova conversa");
    });

    it("returns 502 when LangGraph thread creation fails", async () => {
      mockThreadsCreate.mockRejectedValueOnce(new Error("LangGraph unavailable"));

      const response = await request(app)
        .post("/threads")
        .send({ title: "Test Thread" })
        .expect(502);

      expect(response.body).toEqual({ error: "langgraph_thread_creation_failed" });
      expect(mockPrisma.conversationSession.create).not.toHaveBeenCalled();
    });

    it("rolls back LangGraph thread when Prisma creation fails", async () => {
      mockThreadsCreate.mockResolvedValueOnce({ thread_id: "test-thread-id" });
      (mockPrisma.conversationSession.create as jest.Mock).mockRejectedValueOnce(
        new Error("Database error"),
      );

      await request(app).post("/threads").send({ title: "Test Thread" }).expect(500);

      expect(mockThreadsDelete).toHaveBeenCalledWith(expect.any(String));
    });

    it("validates title length", async () => {
      const longTitle = "a".repeat(121);

      const response = await request(app).post("/threads").send({ title: longTitle }).expect(400);

      expect(response.body.error).toBe("invalid_request");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: "title is too long",
          }),
        ]),
      );
    });

    it("validates empty title", async () => {
      const response = await request(app).post("/threads").send({ title: "   " }).expect(400);

      expect(response.body.error).toBe("invalid_request");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: "title cannot be empty",
          }),
        ]),
      );
    });
  });

  describe("GET /threads", () => {
    it("lists threads ordered by lastActivityAt", async () => {
      const mockSessions = [
        {
          id: "thread-1",
          intent: "Recent thread",
          startedAt: new Date("2025-01-02T00:00:00Z"),
          lastActivityAt: new Date("2025-01-02T12:00:00Z"),
          completedAt: null,
          context: {
            totalMessages: 5,
            lastUserMessage: "Hello",
            lastAssistantMessage: "Hi there",
          },
        },
        {
          id: "thread-2",
          intent: "Older thread",
          startedAt: new Date("2025-01-01T00:00:00Z"),
          lastActivityAt: new Date("2025-01-01T12:00:00Z"),
          completedAt: null,
          context: {
            totalMessages: 2,
          },
        },
      ];

      (mockPrisma.conversationSession.findMany as jest.Mock).mockResolvedValueOnce(mockSessions);

      const response = await request(app).get("/threads").expect(200);

      expect(mockPrisma.conversationSession.findMany).toHaveBeenCalledWith({
        orderBy: { lastActivityAt: "desc" },
        take: 20,
      });

      expect(response.body.threads).toHaveLength(2);
      expect(response.body.threads[0]).toMatchObject({
        id: "thread-1",
        title: "Recent thread",
        status: "ACTIVE",
        summary: {
          lastUserMessage: "Hello",
          lastAssistantMessage: "Hi there",
          totalMessages: 5,
        },
      });
    });

    it("respects limit parameter", async () => {
      (mockPrisma.conversationSession.findMany as jest.Mock).mockResolvedValueOnce([]);

      await request(app).get("/threads").query({ limit: 10 }).expect(200);

      expect(mockPrisma.conversationSession.findMany).toHaveBeenCalledWith({
        orderBy: { lastActivityAt: "desc" },
        take: 10,
      });
    });

    it("validates limit is positive", async () => {
      const response = await request(app).get("/threads").query({ limit: -5 }).expect(400);

      expect(response.body.error).toBe("invalid_request");
    });

    it("validates limit is within max range", async () => {
      const response = await request(app).get("/threads").query({ limit: 200 }).expect(400);

      expect(response.body.error).toBe("invalid_request");
    });

    it("uses default limit when not provided", async () => {
      (mockPrisma.conversationSession.findMany as jest.Mock).mockResolvedValueOnce([]);

      await request(app).get("/threads").expect(200);

      expect(mockPrisma.conversationSession.findMany).toHaveBeenCalledWith({
        orderBy: { lastActivityAt: "desc" },
        take: 20,
      });
    });
  });

  describe("GET /threads/:id", () => {
    it("retrieves thread with messages", async () => {
      const mockSession = {
        id: "thread-1",
        intent: "Test thread",
        startedAt: new Date("2025-01-01T00:00:00Z"),
        lastActivityAt: new Date("2025-01-01T12:00:00Z"),
        completedAt: null,
        context: {},
        messages: [
          {
            id: "msg-1",
            role: "USER",
            content: "Hello",
            intent: null,
            entities: null,
            sentiment: null,
            toolCalls: null,
            createdAt: new Date("2025-01-01T00:00:00Z"),
          },
          {
            id: "msg-2",
            role: "ASSISTANT",
            content: "Hi there!",
            intent: null,
            entities: null,
            sentiment: null,
            toolCalls: null,
            createdAt: new Date("2025-01-01T00:01:00Z"),
          },
        ],
      };

      (mockPrisma.conversationSession.findUnique as jest.Mock).mockResolvedValueOnce(mockSession);

      const response = await request(app).get("/threads/thread-1").expect(200);

      expect(mockPrisma.conversationSession.findUnique).toHaveBeenCalledWith({
        where: { id: "thread-1" },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      expect(response.body.thread.id).toBe("thread-1");
      expect(response.body.messages).toHaveLength(2);
      expect(response.body.messages[0]).toMatchObject({
        id: "msg-1",
        role: "user",
        content: "Hello",
      });
      expect(response.body.messages[1]).toMatchObject({
        id: "msg-2",
        role: "assistant",
        content: "Hi there!",
      });
    });

    it("returns 404 when thread not found", async () => {
      (mockPrisma.conversationSession.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app).get("/threads/nonexistent").expect(404);

      expect(response.body).toEqual({ error: "thread_not_found" });
    });

    it("validates thread id is not empty", async () => {
      // URL encoded space becomes empty after trim, validation fails
      const response = await request(app).get("/threads/%20").expect(400);

      expect(response.body.error).toBe("invalid_request");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: "thread id is required",
          }),
        ]),
      );
    });
  });

  describe("DELETE /threads/:id", () => {
    it("deletes thread from both systems", async () => {
      mockThreadsDelete.mockResolvedValueOnce(undefined);
      (mockPrisma.$transaction as jest.Mock).mockResolvedValueOnce([{ count: 3 }, { id: "thread-1" }]);

      await request(app).delete("/threads/thread-1").expect(204);

      expect(mockThreadsDelete).toHaveBeenCalledWith("thread-1");
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Array));
    });

    it("returns 502 when LangGraph deletion fails", async () => {
      mockThreadsDelete.mockRejectedValueOnce(new Error("LangGraph unavailable"));

      const response = await request(app).delete("/threads/thread-1").expect(502);

      expect(response.body).toEqual({ error: "langgraph_thread_deletion_failed" });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("returns 404 when Prisma deletion fails with P2025", async () => {
      mockThreadsDelete.mockResolvedValueOnce(undefined);

      const prismaError = new Error("Record not found");
      Object.assign(prismaError, { code: "P2025" });
      (mockPrisma.$transaction as jest.Mock).mockRejectedValueOnce(prismaError);

      const response = await request(app).delete("/threads/thread-1").expect(404);

      expect(response.body).toEqual({ error: "thread_not_found" });
    });

    it("validates thread id is not empty", async () => {
      // URL encoded spaces become empty after trim, validation fails
      const response = await request(app).delete("/threads/%20%20").expect(400);

      expect(response.body.error).toBe("invalid_request");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: "thread id is required",
          }),
        ]),
      );
    });
  });
});
