/// <reference types="jest" />

jest.mock('../../lib/prisma', () => {
  const conversationSession = {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  };

  const conversationMessage = {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  };

  return {
    prisma: {
      conversationSession,
      conversationMessage,
    },
  };
});

import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { Prisma } from '../../generated/prisma';
import { prisma } from '../../lib/prisma';
import { ConversationStore } from '../conversation-store';

const prismaMock = prisma as unknown as {
  conversationSession: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
    delete: jest.Mock;
  };
  conversationMessage: {
    deleteMany: jest.Mock;
    createMany: jest.Mock;
  };
};

describe('ConversationStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty array when conversation is missing', async () => {
    prismaMock.conversationSession.findUnique.mockResolvedValueOnce(null);

    const store = new ConversationStore();
    await expect(store.get('missing')).resolves.toEqual([]);
  });

  it('persists history within the configured window', async () => {
    const store = new ConversationStore();
    const messages = Array.from({ length: 25 }, (_, index) => new HumanMessage(`message-${index}`));

    prismaMock.conversationSession.upsert.mockResolvedValueOnce({ id: 'thread' });
    prismaMock.conversationMessage.deleteMany.mockResolvedValueOnce({ count: 0 });
    prismaMock.conversationMessage.createMany.mockResolvedValueOnce({ count: 20 });

    await store.set('thread', messages);

    expect(prismaMock.conversationMessage.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ content: 'message-5' }),
          expect.objectContaining({ content: 'message-24' }),
        ]),
      }),
    );

    const forwardedData = prismaMock.conversationMessage.createMany.mock.calls[0][0].data as Prisma.ConversationMessageCreateManyInput[];
    expect(forwardedData).toHaveLength(20);
    expect(forwardedData[0]?.content).toBe('message-5');
    expect(forwardedData[forwardedData.length - 1]?.content).toBe('message-24');
  });

  it('reconstructs message history from persistence', async () => {
    prismaMock.conversationSession.findUnique.mockResolvedValueOnce({
      id: 'thread',
      context: {},
      messages: [
        {
          role: 'USER',
          content: 'Hello',
          intent: null,
          sentiment: null,
          entities: null,
          toolCalls: null,
        },
        {
          role: 'ASSISTANT',
          content: 'Olá! Como posso ajudar?',
          intent: null,
          sentiment: null,
          entities: null,
          toolCalls: null,
        },
      ],
    });

    const store = new ConversationStore();
    const history = await store.get('thread');

    expect(history).toHaveLength(2);
    expect(history[0]).toBeInstanceOf(HumanMessage);
    expect(history[1]).toBeInstanceOf(AIMessage);
  });

  it('clears history when requested', async () => {
    prismaMock.conversationMessage.deleteMany.mockResolvedValueOnce({ count: 1 });
    prismaMock.conversationSession.delete.mockRejectedValueOnce(Object.assign(new Error('not found'), { code: 'P2025' }));

    const store = new ConversationStore();
    await expect(store.clear('thread')).resolves.toBeUndefined();

    expect(prismaMock.conversationMessage.deleteMany).toHaveBeenCalledWith({ where: { sessionId: 'thread' } });
    expect(prismaMock.conversationSession.delete).toHaveBeenCalledWith({ where: { id: 'thread' } });
  });
});
