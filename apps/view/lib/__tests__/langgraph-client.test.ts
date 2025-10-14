import {
  createThread,
  listThreads,
  getThread,
  deleteThread,
  streamMessages,
  type ThreadMetadata,
  type StreamEvent,
} from '../langgraph-client';

// Mock resolveApiUrl
jest.mock('../api', () => ({
  resolveApiUrl: (path: string) => `http://localhost:3000${path}`,
}));

describe('LangGraph Client', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createThread()', () => {
    it('creates a thread with title', async () => {
      const mockResponse = {
        thread: {
          id: 'thread-123',
          title: 'My Trip',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
          status: 'ACTIVE',
          summary: {
            lastUserMessage: null,
            lastAssistantMessage: null,
            totalMessages: 0,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await createThread('My Trip');

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'My Trip' }),
      });

      expect(result).toEqual(mockResponse);
    });

    it('creates a thread without title', async () => {
      const mockResponse = {
        thread: {
          id: 'thread-456',
          title: 'Nova conversa',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
          status: 'ACTIVE',
          summary: {
            lastUserMessage: null,
            lastAssistantMessage: null,
            totalMessages: 0,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await createThread();

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: undefined }),
      });

      expect(result).toEqual(mockResponse);
    });

    it('throws error on failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => 'Backend error',
      });

      await expect(createThread('Test')).rejects.toThrow(
        'Failed to create thread: 502 Backend error'
      );
    });
  });

  describe('listThreads()', () => {
    it('lists threads with default limit', async () => {
      const mockResponse = {
        threads: [
          {
            id: 'thread-1',
            title: 'Thread 1',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T12:00:00Z',
            status: 'ACTIVE',
            summary: {
              lastUserMessage: 'Hello',
              lastAssistantMessage: 'Hi',
              totalMessages: 2,
            },
          },
          {
            id: 'thread-2',
            title: 'Thread 2',
            createdAt: '2025-01-02T00:00:00Z',
            updatedAt: '2025-01-02T12:00:00Z',
            status: 'ACTIVE',
            summary: {
              lastUserMessage: 'Test',
              lastAssistantMessage: 'Response',
              totalMessages: 4,
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await listThreads();

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/threads?limit=20');
      expect(result).toEqual(mockResponse);
      expect(result.threads).toHaveLength(2);
    });

    it('lists threads with custom limit', async () => {
      const mockResponse = { threads: [] };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await listThreads(10);

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/threads?limit=10');
    });

    it('throws error on failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal error',
      });

      await expect(listThreads()).rejects.toThrow('Failed to list threads: 500 Internal error');
    });
  });

  describe('getThread()', () => {
    it('gets a thread with messages', async () => {
      const mockResponse = {
        thread: {
          id: 'thread-123',
          title: 'My Trip',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T12:00:00Z',
          status: 'ACTIVE',
          summary: {
            lastUserMessage: 'Hello',
            lastAssistantMessage: 'Hi',
            totalMessages: 2,
          },
        },
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Hello',
            createdAt: '2025-01-01T00:00:00Z',
          },
          {
            id: 'msg-2',
            role: 'assistant',
            content: 'Hi there!',
            createdAt: '2025-01-01T00:01:00Z',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getThread('thread-123');

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/threads/thread-123');
      expect(result).toEqual(mockResponse);
      expect(result.messages).toHaveLength(2);
    });

    it('throws specific error for 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(getThread('nonexistent')).rejects.toThrow('Thread not found');
    });

    it('throws generic error for other failures', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      });

      await expect(getThread('thread-123')).rejects.toThrow('Failed to get thread: 500 Server error');
    });
  });

  describe('deleteThread()', () => {
    it('deletes a thread successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await deleteThread('thread-123');

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/threads/thread-123', {
        method: 'DELETE',
      });
    });

    it('ignores 404 errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(deleteThread('nonexistent')).resolves.not.toThrow();
    });

    it('throws error for other failures', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => 'LangGraph unavailable',
      });

      await expect(deleteThread('thread-123')).rejects.toThrow(
        'Failed to delete thread: 502 LangGraph unavailable'
      );
    });
  });

  describe('streamMessages()', () => {
    it('parses NDJSON correctly and emits events', async () => {
      const events: StreamEvent[] = [];
      const onEvent = jest.fn((event: StreamEvent) => {
        events.push(event);
      });

      const mockStream = [
        '{"type":"meta","data":{"threadId":"thread-123"}}\n',
        '{"type":"event","event":"on_chain_start","id":"1","data":{"input":"test"}}\n',
        '{"type":"event","event":"on_chat_model_stream","id":"2","data":{"chunk":"Hello"}}\n',
        '{"type":"complete","data":{"threadId":"thread-123"}}\n',
      ].join('');

      const encoder = new TextEncoder();
      const chunks = [encoder.encode(mockStream)];

      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({ value: chunks[0], done: false })
          .mockResolvedValueOnce({ value: undefined, done: true }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      await streamMessages('thread-123', 'Hello', onEvent);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/langgraph/threads/thread-123/stream',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Hello' }),
          signal: undefined,
        }
      );

      expect(onEvent).toHaveBeenCalledTimes(4);
      expect(events).toEqual([
        { type: 'meta', data: { threadId: 'thread-123' } },
        { type: 'event', event: 'on_chain_start', id: '1', data: { input: 'test' } },
        { type: 'event', event: 'on_chat_model_stream', id: '2', data: { chunk: 'Hello' } },
        { type: 'complete', data: { threadId: 'thread-123' } },
      ]);
    });

    it('handles multiple chunks correctly', async () => {
      const events: StreamEvent[] = [];
      const onEvent = jest.fn((event: StreamEvent) => {
        events.push(event);
      });

      const encoder = new TextEncoder();
      const chunk1 = encoder.encode('{"type":"meta","data":{"th');
      const chunk2 = encoder.encode('readId":"thread-123"}}\n');
      const chunk3 = encoder.encode('{"type":"complete","data":{}}\n');

      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({ value: chunk1, done: false })
          .mockResolvedValueOnce({ value: chunk2, done: false })
          .mockResolvedValueOnce({ value: chunk3, done: false })
          .mockResolvedValueOnce({ value: undefined, done: true }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      await streamMessages('thread-123', 'Test', onEvent);

      expect(onEvent).toHaveBeenCalledTimes(2);
      expect(events[0]).toEqual({ type: 'meta', data: { threadId: 'thread-123' } });
      expect(events[1]).toEqual({ type: 'complete', data: {} });
    });

    it('handles malformed JSON gracefully', async () => {
      const events: StreamEvent[] = [];
      const onEvent = jest.fn((event: StreamEvent) => {
        events.push(event);
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const mockStream = [
        '{"type":"meta","data":{"threadId":"thread-123"}}\n',
        'invalid json line\n',
        '{"type":"complete","data":{}}\n',
      ].join('');

      const encoder = new TextEncoder();
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({ value: encoder.encode(mockStream), done: false })
          .mockResolvedValueOnce({ value: undefined, done: true }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      await streamMessages('thread-123', 'Test', onEvent);

      expect(onEvent).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to parse stream event:',
        'invalid json line',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('passes abort signal', async () => {
      const onEvent = jest.fn();
      const abortController = new AbortController();

      const mockReader = {
        read: jest.fn().mockResolvedValueOnce({ value: undefined, done: true }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      await streamMessages('thread-123', 'Test', onEvent, abortController.signal);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/langgraph/threads/thread-123/stream',
        expect.objectContaining({
          signal: abortController.signal,
        })
      );
    });

    it('throws error when stream is cancelled', async () => {
      const onEvent = jest.fn();
      const abortController = new AbortController();
      abortController.abort();

      const mockReader = {
        read: jest.fn().mockRejectedValueOnce(new Error('Aborted')),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      await expect(
        streamMessages('thread-123', 'Test', onEvent, abortController.signal)
      ).rejects.toThrow('Stream cancelled');
    });

    it('throws error when response is not ok', async () => {
      const onEvent = jest.fn();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(streamMessages('thread-123', 'Test', onEvent)).rejects.toThrow(
        'Stream request failed with status 500'
      );
    });

    it('throws error when response body is missing', async () => {
      const onEvent = jest.fn();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: null,
      });

      await expect(streamMessages('thread-123', 'Test', onEvent)).rejects.toThrow(
        'Stream request failed with status 200'
      );
    });
  });
});
