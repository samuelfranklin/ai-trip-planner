import { render, screen, waitFor, act } from '@testing-library/react';
import { ChatProvider, useChat } from '../chat-provider';
import * as streamingLib from '@/lib/streaming';
import * as apiLib from '@/lib/api';

// Mock dependencies
jest.mock('@/lib/streaming');
jest.mock('@/lib/api');
jest.mock('@/lib/parseAgentResponse', () => ({
  parseAgentResponse: jest.fn((response: string) => ({
    text: response,
    payloads: [],
  })),
}));

const mockStreamAgentResponse = streamingLib.streamAgentResponse as jest.MockedFunction<
  typeof streamingLib.streamAgentResponse
>;
const mockCreateConversationId = apiLib.createConversationId as jest.MockedFunction<
  typeof apiLib.createConversationId
>;

// Test component to access chat context
function TestComponent({ onStateChange }: { onStateChange?: (state: any) => void }) {
  const chat = useChat();

  if (onStateChange) {
    onStateChange(chat);
  }

  return (
    <div>
      <div data-testid="message-count">{chat.messages.length}</div>
      <div data-testid="is-sending">{chat.isSending ? 'true' : 'false'}</div>
      <div data-testid="conversation-id">{chat.conversationId}</div>
      <div data-testid="thread-count">{chat.threads.length}</div>
      <div data-testid="current-thread-id">{chat.currentThreadId}</div>
      <button onClick={() => chat.sendMessage('Test message')}>Send</button>
      <button onClick={() => chat.createThread('New Thread')}>Create Thread</button>
      <button onClick={() => chat.resetConversation()}>Reset</button>
    </div>
  );
}

describe('ChatProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateConversationId.mockReturnValue('conv-test-123');
  });

  describe('Initialization', () => {
    it('initializes with welcome message and default thread', () => {
      render(
        <ChatProvider>
          <TestComponent />
        </ChatProvider>
      );

      expect(screen.getByTestId('message-count')).toHaveTextContent('1');
      expect(screen.getByTestId('thread-count')).toHaveTextContent('1');
      expect(screen.getByTestId('current-thread-id')).toHaveTextContent('thread-1');
      expect(screen.getByTestId('is-sending')).toHaveTextContent('false');
    });

    it('generates a conversation ID', () => {
      render(
        <ChatProvider>
          <TestComponent />
        </ChatProvider>
      );

      expect(screen.getByTestId('conversation-id')).toHaveTextContent('conv-test-123');
    });
  });

  describe('sendMessage()', () => {
    it('adds user message and assistant placeholder', async () => {
      let chatState: any;

      mockStreamAgentResponse.mockResolvedValueOnce({
        ok: true,
        conversationId: 'conv-test-123',
        text: 'Assistant response',
      });

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      await act(async () => {
        await chatState.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(chatState.messages).toHaveLength(3); // Welcome + User + Assistant
      });

      expect(chatState.messages[1].role).toBe('user');
      expect(chatState.messages[1].text).toBe('Hello');
      expect(chatState.messages[2].role).toBe('assistant');
    });

    it('updates assistant message with streamed response', async () => {
      let chatState: any;

      mockStreamAgentResponse.mockImplementation(async (params, callbacks) => {
        // Simulate streaming events
        callbacks?.onEvent?.({
          type: 'meta',
          data: { conversationId: 'conv-test-123' },
        });

        callbacks?.onEvent?.({
          type: 'delta',
          data: { textDelta: 'Hello', fullText: 'Hello' },
        });

        callbacks?.onEvent?.({
          type: 'delta',
          data: { textDelta: ' world', fullText: 'Hello world' },
        });

        callbacks?.onEvent?.({
          type: 'complete',
          data: { conversationId: 'conv-test-123', text: 'Hello world' },
        });

        return {
          ok: true,
          conversationId: 'conv-test-123',
          text: 'Hello world',
        };
      });

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      await act(async () => {
        await chatState.sendMessage('Test');
      });

      await waitFor(() => {
        const lastMessage = chatState.messages[chatState.messages.length - 1];
        expect(lastMessage.text).toBe('Hello world');
        expect(lastMessage.status).toBe('complete');
      });
    });

    it('handles streaming errors gracefully', async () => {
      let chatState: any;

      mockStreamAgentResponse.mockImplementation(async (params, callbacks) => {
        callbacks?.onEvent?.({
          type: 'error',
          data: { message: 'Stream failed' },
        });

        return {
          ok: false,
          error: 'Stream failed',
        };
      });

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      await act(async () => {
        await chatState.sendMessage('Test');
      });

      await waitFor(() => {
        const lastMessage = chatState.messages[chatState.messages.length - 1];
        expect(lastMessage.status).toBe('error');
      });
    });

    it('falls back to legacy conversation on 404', async () => {
      let chatState: any;
      global.fetch = jest.fn();

      // First attempt: streaming fails with 404
      mockStreamAgentResponse.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      // Second attempt: legacy endpoint succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversationId: 'conv-test-456',
          response: 'Fallback response',
        }),
      });

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      await act(async () => {
        await chatState.sendMessage('Test');
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/agent'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('ignores empty messages', async () => {
      let chatState: any;

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      const initialMessageCount = chatState.messages.length;

      await act(async () => {
        await chatState.sendMessage('   ');
      });

      expect(chatState.messages.length).toBe(initialMessageCount);
    });

    it('prevents concurrent sends', async () => {
      let chatState: any;

      mockStreamAgentResponse.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  conversationId: 'conv-test-123',
                  text: 'Response',
                }),
              100
            )
          )
      );

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      // Try to send two messages simultaneously
      await act(async () => {
        const promise1 = chatState.sendMessage('First');
        const promise2 = chatState.sendMessage('Second');
        await Promise.all([promise1, promise2]);
      });

      await waitFor(() => {
        expect(chatState.isSending).toBe(false);
      });

      // Only the first message should be processed
      expect(mockStreamAgentResponse).toHaveBeenCalledTimes(1);
    });
  });

  describe('Thread Management', () => {
    it('creates a new thread', async () => {
      let chatState: any;

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      const initialThreadCount = chatState.threads.length;

      await act(async () => {
        chatState.createThread('My Trip');
      });

      expect(chatState.threads.length).toBe(initialThreadCount + 1);
      expect(chatState.threads[1].title).toBe('My Trip');
      expect(chatState.currentThreadId).toBe(chatState.threads[1].id);
    });

    it('switches between threads', async () => {
      let chatState: any;

      mockStreamAgentResponse.mockResolvedValue({
        ok: true,
        conversationId: 'conv-test-123',
        text: 'Response',
      });

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      // Send message to first thread
      await act(async () => {
        await chatState.sendMessage('Message 1');
      });

      const thread1Messages = [...chatState.messages];

      // Create and switch to second thread
      await act(async () => {
        chatState.createThread('Second Thread');
      });

      // Send message to second thread
      await act(async () => {
        await chatState.sendMessage('Message 2');
      });

      const thread2Messages = [...chatState.messages];

      // Switch back to first thread
      await act(async () => {
        chatState.switchThread(chatState.threads[0].id);
      });

      await waitFor(() => {
        expect(chatState.messages).toEqual(thread1Messages);
      });

      // Switch to second thread again
      await act(async () => {
        chatState.switchThread(chatState.threads[1].id);
      });

      await waitFor(() => {
        expect(chatState.messages).toEqual(thread2Messages);
      });
    });

    it('deletes a thread', async () => {
      let chatState: any;

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      // Create a second thread
      await act(async () => {
        chatState.createThread('Thread to Delete');
      });

      const threadToDelete = chatState.threads[1].id;

      await act(async () => {
        chatState.deleteThread(threadToDelete);
      });

      expect(chatState.threads.length).toBe(1);
      expect(chatState.threads.find((t: any) => t.id === threadToDelete)).toBeUndefined();
    });

    it('switches to another thread when deleting current thread', async () => {
      let chatState: any;

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      // Create a second thread and switch to it
      await act(async () => {
        chatState.createThread('Second Thread');
      });

      const currentThreadId = chatState.currentThreadId;

      // Delete current thread
      await act(async () => {
        chatState.deleteThread(currentThreadId);
      });

      expect(chatState.currentThreadId).not.toBe(currentThreadId);
      expect(chatState.threads.length).toBe(1);
    });

    it('creates new thread when deleting last thread', async () => {
      let chatState: any;

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      const threadId = chatState.threads[0].id;

      // Delete the only thread
      await act(async () => {
        chatState.deleteThread(threadId);
      });

      expect(chatState.threads.length).toBe(1);
      expect(chatState.threads[0].id).not.toBe(threadId);
      expect(chatState.messages.length).toBe(1); // Welcome message
    });

    it('renames a thread', async () => {
      let chatState: any;

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      const threadId = chatState.threads[0].id;

      await act(async () => {
        chatState.renameThread(threadId, 'Renamed Thread');
      });

      expect(chatState.threads[0].title).toBe('Renamed Thread');
    });
  });

  describe('resetConversation()', () => {
    it('resets to welcome message', async () => {
      let chatState: any;

      mockStreamAgentResponse.mockResolvedValue({
        ok: true,
        conversationId: 'conv-test-123',
        text: 'Response',
      });

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      // Send a message
      await act(async () => {
        await chatState.sendMessage('Test');
      });

      expect(chatState.messages.length).toBeGreaterThan(1);

      // Reset conversation
      await act(async () => {
        chatState.resetConversation();
      });

      expect(chatState.messages.length).toBe(1);
      expect(chatState.messages[0].role).toBe('assistant');
    });

    it('generates new conversation ID on reset', async () => {
      let chatState: any;

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      const originalId = chatState.conversationId;

      mockCreateConversationId.mockReturnValue('conv-new-456');

      await act(async () => {
        chatState.resetConversation();
      });

      expect(chatState.conversationId).not.toBe(originalId);
      expect(chatState.conversationId).toBe('conv-new-456');
    });
  });

  describe('Error Handling', () => {
    it('throws error when useChat is used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useChat must be used within a ChatProvider');

      consoleError.mockRestore();
    });

    it('handles network errors gracefully', async () => {
      let chatState: any;

      mockStreamAgentResponse.mockRejectedValueOnce(new Error('Network error'));

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      await act(async () => {
        await chatState.sendMessage('Test');
      });

      await waitFor(() => {
        const lastMessage = chatState.messages[chatState.messages.length - 1];
        expect(lastMessage.status).toBe('error');
      });
    });
  });

  describe('handleAction()', () => {
    it('generates action prompt for bookFlight', () => {
      let chatState: any;

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      const prompt = chatState.handleAction({
        type: 'bookFlight',
        itineraryId: 'itin-123',
      });

      expect(prompt).toContain('book_flight');
      expect(prompt).toContain('itin-123');
    });

    it('generates action prompt for bookHotel', () => {
      let chatState: any;

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      const prompt = chatState.handleAction({
        type: 'bookHotel',
        hotelId: 'hotel-456',
      });

      expect(prompt).toContain('book_hotel');
      expect(prompt).toContain('hotel-456');
    });

    it('generates action prompt for cancelFlight', () => {
      let chatState: any;

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      const prompt = chatState.handleAction({
        type: 'cancelFlight',
        pnr: 'ABC123',
      });

      expect(prompt).toContain('cancel_flight');
      expect(prompt).toContain('ABC123');
    });

    it('generates action prompt for cancelHotel', () => {
      let chatState: any;

      render(
        <ChatProvider>
          <TestComponent onStateChange={(state) => (chatState = state)} />
        </ChatProvider>
      );

      const prompt = chatState.handleAction({
        type: 'cancelHotel',
        reservationId: 'res-789',
      });

      expect(prompt).toContain('cancel_hotel');
      expect(prompt).toContain('res-789');
    });
  });
});
