import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { MessageRole } from '../generated/prisma';
import { Prisma } from '../generated/prisma';
import { prisma } from './prisma';

const MAX_HISTORY_LENGTH = 20;

const ROLE_TO_MESSAGE = {
  USER: HumanMessage,
  ASSISTANT: AIMessage,
  SYSTEM: SystemMessage,
} as const satisfies Record<MessageRole, new (args: any) => BaseMessage>;

function trimHistory(messages: BaseMessage[]): BaseMessage[] {
  if (messages.length <= MAX_HISTORY_LENGTH) {
    return messages;
  }

  return messages.slice(messages.length - MAX_HISTORY_LENGTH);
}

function normalizeMessageContent(content: BaseMessage['content']): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((chunk) => {
        if (typeof chunk === 'string') {
          return chunk;
        }

        const chunkRecord = chunk as Record<string, unknown>;

        if (chunkRecord?.type === 'text' && typeof chunkRecord.text === 'string') {
          return chunkRecord.text;
        }

        if (chunkRecord?.type === 'tool_response' && chunkRecord.toolResponse !== undefined) {
          const toolResponse = chunkRecord.toolResponse;
          return typeof toolResponse === 'string' ? toolResponse : JSON.stringify(toolResponse);
        }

        if ('json' in chunkRecord && chunkRecord.json !== undefined) {
          return JSON.stringify(chunkRecord.json);
        }

        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return String(content ?? '');
}

function toMessageRole(message: BaseMessage): MessageRole {
  if (message instanceof HumanMessage) {
    return 'USER';
  }
  if (message instanceof AIMessage) {
    return 'ASSISTANT';
  }
  if (message instanceof SystemMessage) {
    return 'SYSTEM';
  }

  // Tool and function messages are closer to assistant outputs.
  return 'ASSISTANT';
}

function buildContextSnapshot(messages: BaseMessage[]): Prisma.InputJsonValue {
  const latestUser = [...messages].reverse().find((msg) => msg instanceof HumanMessage);
  const latestAssistant = [...messages].reverse().find((msg) => msg instanceof AIMessage);

  const safeContent = (message?: BaseMessage): string | null => {
    if (!message) {
      return null;
    }
    const content = normalizeMessageContent(message.content);
    return content.length > 0 ? content : null;
  };

  return {
    totalMessages: messages.length,
    lastUserMessage: safeContent(latestUser),
    lastAssistantMessage: safeContent(latestAssistant),
    updatedAt: new Date().toISOString(),
  } satisfies Prisma.InputJsonValue;
}

function serializeMessage(conversationId: string, message: BaseMessage, index: number): Prisma.ConversationMessageCreateManyInput {
  const additionalRecord = (message.additional_kwargs ?? {}) as Record<string, unknown>;
  const role = toMessageRole(message);
  const baseData: Prisma.ConversationMessageCreateManyInput = {
    sessionId: conversationId,
    role,
    content: normalizeMessageContent(message.content),
  intent: typeof additionalRecord.intent === 'string' ? additionalRecord.intent : null,
  sentiment: typeof additionalRecord.sentiment === 'string' ? additionalRecord.sentiment : null,
    createdAt: new Date(Date.now() + index),
  };

  if (typeof additionalRecord.entities !== 'undefined') {
    baseData.entities = additionalRecord.entities as Prisma.InputJsonValue;
  }

  const toolInvocations = 'toolInvocations' in additionalRecord ? additionalRecord.toolInvocations : undefined;
  const modernToolCalls = 'toolCalls' in additionalRecord ? additionalRecord.toolCalls : undefined;
  const legacyToolCalls = Reflect.get(additionalRecord, 'tool_calls');
  const toolCalls = legacyToolCalls ?? toolInvocations ?? modernToolCalls;

  if (typeof toolCalls !== 'undefined') {
    baseData.toolCalls = toolCalls as Prisma.InputJsonValue;
  }

  return baseData;
}

function deserializeMessage(row: { role: MessageRole; content: string; intent: string | null; sentiment: string | null; entities: Prisma.JsonValue | null; toolCalls: Prisma.JsonValue | null }): BaseMessage {
  const MessageCtor = ROLE_TO_MESSAGE[row.role] ?? AIMessage;
  const additionalKwargs: Record<string, unknown> = {};

  if (row.intent) {
    additionalKwargs.intent = row.intent;
  }
  if (row.sentiment) {
    additionalKwargs.sentiment = row.sentiment;
  }
  if (row.entities) {
    additionalKwargs.entities = row.entities;
  }
  if (row.toolCalls) {
    additionalKwargs.tool_calls = row.toolCalls;
  }

  return new MessageCtor({ content: row.content, additional_kwargs: additionalKwargs });
}

export class ConversationStore {
  constructor(private readonly maxHistoryLength: number = MAX_HISTORY_LENGTH) {}

  async get(conversationId: string): Promise<BaseMessage[]> {
    const session = await prisma.conversationSession.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      return [];
    }

    return session.messages.map((message) =>
      deserializeMessage({
        role: message.role,
        content: message.content,
        intent: message.intent,
        sentiment: message.sentiment,
        entities: message.entities,
        toolCalls: message.toolCalls,
      }),
    );
  }

  async set(conversationId: string, messages: BaseMessage[]): Promise<void> {
    const trimmed = trimHistory(messages).slice(-this.maxHistoryLength);
    const contextSnapshot = buildContextSnapshot(trimmed);

    await prisma.conversationSession.upsert({
      where: { id: conversationId },
      update: {
        context: contextSnapshot,
        lastActivityAt: new Date(),
      },
      create: {
        id: conversationId,
        context: contextSnapshot,
      },
    });

    await prisma.conversationMessage.deleteMany({ where: { sessionId: conversationId } });

    if (trimmed.length === 0) {
      return;
    }

    const data = trimmed.map((message, index) => serializeMessage(conversationId, message, index));
    await prisma.conversationMessage.createMany({ data });
  }

  async clear(conversationId: string): Promise<void> {
    await prisma.conversationMessage.deleteMany({ where: { sessionId: conversationId } });
    try {
      await prisma.conversationSession.delete({ where: { id: conversationId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code !== 'P2025') {
          throw error;
        }
        return;
      }

      if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2025') {
        return;
      }

      throw error;
    }
  }
}

export const conversationStore = new ConversationStore();
