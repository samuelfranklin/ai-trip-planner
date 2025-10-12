import type { AgentStructuredPayload } from '../types';

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

  for (let end = start + 1; end <= input.length; end += 1) {
    const fragment = input.slice(start, end);
    const parseResult = tryParseJson(fragment);
    if (parseResult.ok) {
      return { block: fragment, value: parseResult.value, nextIndex: end };
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

function normalizePayload(input: unknown): AgentStructuredPayload {
  if (!input || typeof input !== 'object') {
    return { raw: input };
  }

  const candidate = input as Record<string, unknown>;
  const payload: AgentStructuredPayload = {
    raw: candidate,
  };

  if (typeof candidate.source === 'string') {
    payload.source = candidate.source;
  }
  if (typeof candidate.message === 'string') {
    payload.message = candidate.message;
  }
  if (typeof candidate.error === 'boolean') {
    payload.error = candidate.error;
  }
  if (Array.isArray(candidate.suggestions)) {
    payload.suggestions = candidate.suggestions.filter((item): item is string => typeof item === 'string');
  }
  if (Array.isArray(candidate.nextSteps)) {
    payload.nextSteps = candidate.nextSteps.filter((item): item is string => typeof item === 'string');
  }
  if (typeof candidate.data !== 'undefined') {
    payload.data = candidate.data;
  }

  return payload;
}

