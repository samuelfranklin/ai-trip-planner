import { z } from 'zod';

export type ChatRole = 'user' | 'assistant';

export interface AgentStructuredPayload {
  raw: unknown;
  source?: string;
  language?: string;
  data?: unknown;
  message?: string;
  suggestions?: string[];
  nextSteps?: string[];
  error?: boolean;
  code?: string;
  retryable?: boolean;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text?: string;
  structured?: AgentStructuredPayload[];
  status: 'thinking' | 'streaming' | 'complete' | 'error';
  createdAt: number;
}

export type ChatAction =
  | { type: 'bookFlight'; itineraryId: string }
  | { type: 'bookHotel'; hotelId: string }
  | { type: 'cancelFlight'; pnr: string }
  | { type: 'cancelHotel'; reservationId: string };

export interface FlightSegmentEndpoint {
  airport?: string | null;
  time?: string | null;
  date?: string | null;
}

export interface FlightSegment {
  airline?: string | null;
  flightNumber?: string | null;
  departure?: FlightSegmentEndpoint | null;
  arrival?: FlightSegmentEndpoint | null;
  duration?: string | null;
}

export interface FlightItinerary {
  itineraryId: string;
  airline?: string | null;
  totalPrice?: number | null;
  currency?: string | null;
  totalLabel?: string | null;
  stops?: number | null;
  baggageIncluded?: boolean | null;
  outbound?: FlightSegment[] | null;
  inbound?: FlightSegment[] | null;
  status?: string | null;
  pnr?: string | null;
  summary?: {
    origin?: {
      code?: string | null;
      city?: string | null;
      airport?: string | null;
    } | null;
    destination?: {
      code?: string | null;
      city?: string | null;
      airport?: string | null;
    } | null;
    departDate?: string | null;
    returnDate?: string | null;
    adults?: number | null;
  } | null;
}

export interface HotelOption {
  hotelId: string;
  name?: string | null;
  city?: string | null;
  address?: string | null;
  heroImageUrl?: string | null;
  galleryImageUrls?: string[] | null;
  rating?: number | null;
  reviewCount?: number | null;
  nightlyRate?: number | null;
  total?: number | null;
  nightlyLabel?: string | null;
  totalLabel?: string | null;
  currency?: string | null;
  nights?: number | null;
  rooms?: number | null;
  reservationId?: string | null;
  status?: string | null;
  amenities?: unknown;
  refundable?: boolean | null;
  breakfastIncluded?: boolean | null;
  cancellationPolicy?: string | null;
  categories?: Array<{ id?: string | null; name?: string | null; slug?: string | null }> | null;
  specialRequests?: string | null;
  adults?: number | null;
  children?: number | null;
  summary?: {
    checkin?: string | null;
    checkout?: string | null;
    rooms?: number | null;
    nights?: number | null;
  } | null;
}

export interface DestinationOption {
  id: string;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  heroImageUrl?: string | null;
  galleryImageUrls?: string[] | null;
  summary?: string | null;
  bestMonths?: string[] | null;
  averageBudget?: number | null;
  averageBudgetLabel?: string | null;
  categories?: Array<{ id?: string | null; name?: string | null; slug?: string | null }> | null;
}

export interface PassengerContact {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface GuestContact {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface FlightBookingConfirmation {
  pnr: string;
  status?: string | null;
  total?: number | null;
  currency?: string | null;
  totalLabel?: string | null;
  adults?: number | null;
  seatClass?: string | null;
  fareBasis?: string | null;
  specialRequests?: string | null;
  metadata?: Record<string, unknown> | null;
  itineraryId?: string | null;
  passenger?: PassengerContact | null;
}

export interface HotelBookingConfirmation {
  reservationId: string;
  status?: string | null;
  total?: number | null;
  currency?: string | null;
  totalLabel?: string | null;
  rooms?: number | null;
  nights?: number | null;
  adults?: number | null;
  children?: number | null;
  specialRequests?: string | null;
  metadata?: Record<string, unknown> | null;
  hotelId?: string | null;
  checkin?: string | null;
  checkout?: string | null;
  guest?: GuestContact | null;
}

export interface FlightCancellationInfo {
  pnr: string;
  status?: string | null;
}

export interface HotelCancellationInfo {
  reservationId: string;
  status?: string | null;
}

export const agentStreamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('meta'),
    data: z.object({
      conversationId: z.string(),
    }),
  }),
  z.object({
    type: z.literal('delta'),
    data: z.object({
      textDelta: z.string().optional(),
      fullText: z.string(),
    }),
  }),
  z.object({
    type: z.literal('complete'),
    data: z.object({
      conversationId: z.string(),
      text: z.string(),
    }),
  }),
  z.object({
    type: z.literal('error'),
    data: z.object({
      message: z.string(),
    }),
  }),
]);

export type AgentStreamEvent = z.infer<typeof agentStreamEventSchema>;

// LangGraph SDK Types
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
