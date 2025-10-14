import { resolveApiUrl } from './api';
import { agentStreamEventSchema, type AgentStreamEvent } from '@/types';

export interface StreamAgentParams {
  conversationId: string;
  message: string;
  reset?: boolean;
  signal?: AbortSignal;
}

export interface StreamAgentCallbacks {
  onEvent?: (event: AgentStreamEvent) => void;
}

export interface StreamAgentResult {
  ok: boolean;
  conversationId?: string;
  text?: string;
  error?: string;
  status?: number;
}

export async function streamAgentResponse(
  params: StreamAgentParams,
  callbacks?: StreamAgentCallbacks,
): Promise<StreamAgentResult> {
  try {
    const response = await fetch(resolveApiUrl('/agent/stream'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: params.conversationId,
        message: params.message,
        reset: params.reset ?? false,
      }),
      signal: params.signal,
    });

    if (!response.ok || !response.body) {
      return { ok: false, status: response.status };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalConversationId = params.conversationId;
    let finalText = '';
    let encounteredError: string | undefined;

    const processBuffer = () => {
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const rawLine = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (rawLine.length > 0) {
          const parsed = parseEvent(rawLine);
          if (parsed) {
            callbacks?.onEvent?.(parsed);
            if (parsed.type === 'meta') {
              finalConversationId = parsed.data.conversationId;
            } else if (parsed.type === 'delta') {
              finalText = parsed.data.fullText;
            } else if (parsed.type === 'complete') {
              finalConversationId = parsed.data.conversationId;
              finalText = parsed.data.text;
            } else if (parsed.type === 'error') {
              encounteredError = parsed.data.message;
            }
          }
        }
        newlineIndex = buffer.indexOf('\n');
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      processBuffer();
    }

    buffer += decoder.decode();
    processBuffer();

    if (encounteredError) {
      return {
        ok: false,
        conversationId: finalConversationId,
        text: finalText,
        error: encounteredError,
      };
    }

    return {
      ok: true,
      conversationId: finalConversationId,
      text: finalText,
    };
  } catch (error) {
    if (params.signal?.aborted) {
      return { ok: false, error: 'cancelled' };
    }
    const message = error instanceof Error ? error.message : 'unknown-error';
    return { ok: false, error: message };
  }
}

function parseEvent(raw: string): AgentStreamEvent | undefined {
  try {
    const json = JSON.parse(raw);
    const result = agentStreamEventSchema.safeParse(json);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}
