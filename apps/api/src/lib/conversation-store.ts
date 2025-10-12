import type { BaseMessage } from '@langchain/core/messages';

const MAX_HISTORY_LENGTH = 20;

function trimHistory(messages: BaseMessage[]): BaseMessage[] {
  if (messages.length <= MAX_HISTORY_LENGTH) {
    return messages;
  }

  return messages.slice(messages.length - MAX_HISTORY_LENGTH);
}

export class ConversationStore {
  private readonly conversations = new Map<string, BaseMessage[]>();

  get(conversationId: string): BaseMessage[] {
    return this.conversations.get(conversationId) ?? [];
  }

  set(conversationId: string, messages: BaseMessage[]): void {
    this.conversations.set(conversationId, trimHistory(messages));
  }

  clear(conversationId: string): void {
    this.conversations.delete(conversationId);
  }
}

export const conversationStore = new ConversationStore();
