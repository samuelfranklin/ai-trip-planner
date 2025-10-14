import { resolveApiUrl } from './api';

export interface ThreadMetadata {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: 'ACTIVE' | 'COMPLETED';
  summary: {
    lastUserMessage: string | null;
    lastAssistantMessage: string | null;
    totalMessages: number;
  };
}

export interface SDKMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: string | null;
  entities?: unknown;
  sentiment?: string | null;
  toolCalls?: unknown;
  createdAt: string;
}

export interface StreamEvent {
  type: 'meta' | 'event' | 'complete' | 'error';
  event?: string;
  id?: string;
  data: any;
}

export interface CreateThreadResponse {
  thread: ThreadMetadata;
}

export interface ListThreadsResponse {
  threads: ThreadMetadata[];
}

export interface GetThreadResponse {
  thread: ThreadMetadata;
  messages: SDKMessage[];
}

/**
 * Creates a new thread (conversation session) on the backend.
 */
export async function createThread(title?: string): Promise<CreateThreadResponse> {
  const response = await fetch(resolveApiUrl('/threads'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create thread: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Lists threads from the backend.
 */
export async function listThreads(limit = 20): Promise<ListThreadsResponse> {
  const url = resolveApiUrl(`/threads?limit=${limit}`);
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list threads: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Gets a single thread with its messages.
 */
export async function getThread(threadId: string): Promise<GetThreadResponse> {
  const response = await fetch(resolveApiUrl(`/threads/${threadId}`));

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Thread not found');
    }
    const errorText = await response.text();
    throw new Error(`Failed to get thread: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Deletes a thread.
 */
export async function deleteThread(threadId: string): Promise<void> {
  const response = await fetch(resolveApiUrl(`/threads/${threadId}`), {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`Failed to delete thread: ${response.status} ${errorText}`);
  }
}

/**
 * Streams messages using the LangGraph SDK endpoint.
 * Parses NDJSON streaming response and calls onEvent for each event.
 */
export async function streamMessages(
  threadId: string,
  message: string,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(resolveApiUrl(`/langgraph/threads/${threadId}/stream`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Stream request failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const processBuffer = () => {
    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const rawLine = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (rawLine.length > 0) {
        try {
          const event = JSON.parse(rawLine) as StreamEvent;
          onEvent(event);
        } catch (error) {
          console.warn('Failed to parse stream event:', rawLine, error);
        }
      }

      newlineIndex = buffer.indexOf('\n');
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      processBuffer();
    }

    buffer += decoder.decode();
    processBuffer();
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Stream cancelled');
    }
    throw error;
  }
}
