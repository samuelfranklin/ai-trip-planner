/// <reference types="jest" />

import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { ConversationStore } from '../conversation-store';

const buildMockMessage = (text: string): BaseMessage => new HumanMessage(text);

describe('ConversationStore', () => {
  it('returns an empty array when conversation is missing', () => {
    const store = new ConversationStore();
    expect(store.get('missing')).toEqual([]);
  });

  it('persists history within the configured window', () => {
    const store = new ConversationStore();
    const messages = Array.from({ length: 25 }, (_, index) => buildMockMessage(`message-${index}`));

    store.set('thread', messages);

    const stored = store.get('thread');
    expect(stored).toHaveLength(20);
    expect(stored[0]?.content).toBe('message-5');
    expect(stored[stored.length - 1]?.content).toBe('message-24');
  });

  it('clears history when requested', () => {
    const store = new ConversationStore();
    store.set('thread', [buildMockMessage('hello')]);
    store.clear('thread');
    expect(store.get('thread')).toEqual([]);
  });
});
