export type ChatRole = 'user' | 'assistant';

export interface AgentStructuredPayload {
  raw: unknown;
  source?: string;
  data?: unknown;
  message?: string;
  suggestions?: string[];
  nextSteps?: string[];
  error?: boolean;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text?: string;
  structured?: AgentStructuredPayload[];
  status: 'thinking' | 'complete' | 'error';
  createdAt: number;
}

export type ChatAction =
  | { type: 'bookFlight'; itineraryId: string }
  | { type: 'bookHotel'; hotelId: string };

export interface FlightItinerary {
  itineraryId: string;
  airline?: string | null;
  totalPrice?: number | null;
  currency?: string | null;
  totalLabel?: string | null;
  stops?: number | null;
  baggageIncluded?: boolean | null;
  outbound?: Array<Record<string, unknown>>;
  inbound?: Array<Record<string, unknown>>;
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
  amenities?: unknown;
  refundable?: boolean | null;
  breakfastIncluded?: boolean | null;
  cancellationPolicy?: string | null;
  categories?: Array<{ id?: string | null; name?: string | null; slug?: string | null }> | null;
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
