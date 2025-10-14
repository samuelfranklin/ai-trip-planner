import { Router } from "express";
import { randomUUID } from "crypto";
import { z, ZodError } from "zod";
import logger from "../config/logger";
import { prisma } from "../lib/prisma";
import { getLangGraphClient } from "../services/langgraph.client";

const router = Router();

const listThreadsQuerySchema = z
  .object({
    limit: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) => {
        if (value === undefined) {
          return 20;
        }
        const parsed = Number(value);
        return Number.isNaN(parsed) ? 20 : parsed;
      })
      .pipe(z.number().int().positive().max(100)),
  })
  .default({ limit: 20 });

const createThreadSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "title cannot be empty")
      .max(120, "title is too long")
      .optional(),
  })
  .default({});

const threadIdParamSchema = z.object({
  id: z.string().trim().min(1, "thread id is required"),
});

type RawContext = Record<string, unknown> | null;

function extractContext(value: unknown): RawContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function formatThread(session: {
  id: string;
  intent: string | null;
  startedAt: Date;
  lastActivityAt: Date;
  completedAt: Date | null;
  context: unknown;
}) {
  const context = extractContext(session.context);

  const lastUserMessage =
    typeof context?.lastUserMessage === "string" ? context.lastUserMessage : null;
  const lastAssistantMessage =
    typeof context?.lastAssistantMessage === "string" ? context.lastAssistantMessage : null;
  const totalMessages =
    typeof context?.totalMessages === "number" ? context.totalMessages : undefined;
  const historyCount = Array.isArray((session as { messages?: unknown }).messages)
    ? ((session as { messages?: unknown }).messages as Array<unknown>).length
    : undefined;

  const updatedAt =
    (typeof context?.updatedAt === "string" ? new Date(context.updatedAt) : undefined) ??
    session.lastActivityAt;

  return {
    id: session.id,
    title: session.intent ?? lastUserMessage ?? "Nova conversa",
    createdAt: session.startedAt,
    updatedAt,
    status: session.completedAt ? "COMPLETED" : "ACTIVE",
    summary: {
      lastUserMessage,
      lastAssistantMessage,
      totalMessages: totalMessages ?? historyCount ?? 0,
    },
  };
}

function formatMessage(message: {
  id: string;
  role: string;
  content: string;
  intent: string | null;
  entities: unknown;
  sentiment: string | null;
  toolCalls: unknown;
  createdAt: Date;
}) {
  const roleLower = message.role.toLowerCase();
  return {
    id: message.id,
    role: roleLower === "user" || roleLower === "assistant" || roleLower === "system" ? roleLower : "assistant",
    content: message.content,
    intent: message.intent,
    entities: message.entities ?? null,
    sentiment: message.sentiment,
    toolCalls: message.toolCalls ?? null,
    createdAt: message.createdAt.toISOString(),
  };
}

router.get("/", async (req, res, next) => {
  try {
    const { limit } = listThreadsQuerySchema.parse(req.query);

    const sessions = await prisma.conversationSession.findMany({
      orderBy: { lastActivityAt: "desc" },
      take: limit,
    });

    const threads = sessions.map(formatThread);
    res.json({ threads });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: "invalid_request",
        details: error.errors,
      });
      return;
    }
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const requestLog = logger.child({ route: "/threads", method: "POST" });
  try {
    const body = createThreadSchema.parse(req.body ?? {});
    const threadId = randomUUID();

    const langGraph = getLangGraphClient();
    try {
      await langGraph.threads.create({
        threadId,
        metadata: body.title ? { title: body.title } : undefined,
      });
    } catch (error) {
      requestLog.error({ err: error, threadId }, "failed to create langgraph thread");
      res.status(502).json({ error: "langgraph_thread_creation_failed" });
      return;
    }

    let session;
    try {
      session = await prisma.conversationSession.create({
        data: {
          id: threadId,
          intent: body.title ?? null,
          context: {
            totalMessages: 0,
            lastUserMessage: null,
            lastAssistantMessage: null,
            updatedAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      requestLog.error({ err: error, threadId }, "failed to persist thread locally");
      try {
        await langGraph.threads.delete(threadId);
      } catch (cleanupError) {
        requestLog.warn({ err: cleanupError, threadId }, "failed to rollback langgraph thread");
      }
      throw error;
    }

    res.status(201).json({ thread: formatThread(session) });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: "invalid_request",
        details: error.errors,
      });
      return;
    }
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = threadIdParamSchema.parse(req.params);
    const session = await prisma.conversationSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: "thread_not_found" });
      return;
    }

    const thread = formatThread(session);
    const messages = session.messages.map((message) =>
      formatMessage({
        id: message.id,
        role: message.role,
        content: message.content,
        intent: message.intent,
        entities: message.entities,
        sentiment: message.sentiment,
        toolCalls: message.toolCalls,
        createdAt: message.createdAt,
      }),
    );

    res.json({ thread, messages });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: "invalid_request",
        details: error.errors,
      });
      return;
    }
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  const requestLog = logger.child({ route: "/threads/:id", method: "DELETE" });
  try {
    const { id } = threadIdParamSchema.parse(req.params);
    const langGraph = getLangGraphClient();

    try {
      await langGraph.threads.delete(id);
    } catch (error) {
      requestLog.error({ err: error, threadId: id }, "failed to delete langgraph thread");
      res.status(502).json({ error: "langgraph_thread_deletion_failed" });
      return;
    }

    try {
      await prisma.$transaction([
        prisma.conversationMessage.deleteMany({ where: { sessionId: id } }),
        prisma.conversationSession.delete({ where: { id } }),
      ]);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2025"
      ) {
        res.status(404).json({ error: "thread_not_found" });
        return;
      }

      // We already deleted the LangGraph thread, so just surface the error.
      throw error;
    }

    res.status(204).send();
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: "invalid_request",
        details: error.errors,
      });
      return;
    }
    next(error);
  }
});

export const threadsRouter: ReturnType<typeof Router> = router;
