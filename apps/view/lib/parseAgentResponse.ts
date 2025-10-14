import { z } from 'zod';
import type { AgentStructuredPayload } from '@/types';

export interface ParsedAgentResponse {
  text: string;
  payloads: AgentStructuredPayload[];
}

export function parseAgentResponse(raw: unknown): ParsedAgentResponse {
  const source = normalizeRawResponse(raw);
  const { textSegments, payloads } = collectSegments(source);
  const text = formatTextSegments(textSegments);
  return { text, payloads };
}

function normalizeRawResponse(raw: unknown): string {
  if (typeof raw === 'string') {
    return raw;
  }
  if (raw === undefined || raw === null) {
    return '';
  }
  try {
    return JSON.stringify(raw, null, 2);
  } catch {
    return '[unserializable-response]';
  }
}

function collectSegments(input: string): { textSegments: string[]; payloads: AgentStructuredPayload[] } {
  const payloads: AgentStructuredPayload[] = [];
  const textSegments: string[] = [];

  let cursor = 0;
  while (cursor < input.length) {
    const start = findNextJsonStart(input, cursor);
    if (start === -1) {
      textSegments.push(input.slice(cursor));
      break;
    }

    const leading = input.slice(cursor, start);
    if (leading.trim().length > 0) {
      textSegments.push(leading);
    }

    const { block, value, nextIndex } = extractJsonBlock(input, start);
    if (block) {
      if (value !== undefined) {
        payloads.push(normalizePayload(value));
      } else {
        textSegments.push(block);
      }
      cursor = nextIndex;
    } else {
      textSegments.push(input.slice(start));
      break;
    }
  }

  return { textSegments, payloads };
}

function findNextJsonStart(input: string, from: number): number {
  const objectIndex = input.indexOf('{', from);
  const arrayIndex = input.indexOf('[', from);

  if (objectIndex === -1 && arrayIndex === -1) {
    return -1;
  }
  if (objectIndex === -1) {
    return arrayIndex;
  }
  if (arrayIndex === -1) {
    return objectIndex;
  }
  return Math.min(objectIndex, arrayIndex);
}

function extractJsonBlock(input: string, start: number): { block?: string; value?: unknown; nextIndex: number } {
  const opening = input[start];
  if (opening !== '{' && opening !== '[') {
    return { nextIndex: start + 1 };
  }

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < input.length; i++) {
    const char = input[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{' || char === '[') {
      depth++;
    } else if (char === '}' || char === ']') {
      depth--;
      if (depth === 0) {
        const block = input.slice(start, i + 1);
        const parseResult = tryParseJson(block);
        if (parseResult.ok) {
          return { block, value: parseResult.value, nextIndex: i + 1 };
        }
        return { nextIndex: i + 1 };
      }
    }
  }

  return { nextIndex: input.length };
}

interface ParseSuccess {
  ok: true;
  value: unknown;
}

interface ParseFailure {
  ok: false;
}

type ParseResult = ParseSuccess | ParseFailure;

function tryParseJson(candidate: string): ParseResult {
  const trimmed = candidate.trim();
  if (trimmed.length === 0) {
    return { ok: false };
  }

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return { ok: false };
  }

  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch {
    return { ok: false };
  }
}

function formatTextSegments(segments: string[]): string {
  return segments
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join('\n\n');
}

const structuredPayloadSchema = z.object({
  source: z.string().optional(),
  language: z.string().optional(),
  message: z.string().optional(),
  error: z.boolean().optional(),
  code: z.string().optional(),
  retryable: z.boolean().optional(),
  suggestions: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()).optional(),
  data: z.unknown().optional(),
});

function normalizePayload(input: unknown): AgentStructuredPayload {
  const parsed = structuredPayloadSchema.safeParse(input);
  if (!parsed.success) {
    return { raw: input };
  }

  const payload = parsed.data;
  return {
    raw: input,
    ...payload,
  };
}
