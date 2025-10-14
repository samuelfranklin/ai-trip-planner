import { createReactAgent } from "@langchain/langgraph/prebuilt";
import type { CompiledStateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { createLLM } from "./services/llm.service";
import { getSeasonalInfoTool, searchDestinationsTool } from "./tools/destination.tools";
import {
  bookFlightTool,
  cancelFlightTool,
  getAirportInfoTool,
  listFlightsTool,
} from "./tools/flight.tools";
import {
  bookHotelTool,
  cancelHotelTool,
  getHotelAmenitiesTool,
  getHotelCategoriesTool,
  listHotelsTool,
} from "./tools/hotel.tools";

const AgentOutputFormatSchema = z.object({
  numeric_answer: z
    .number()
    .optional()
    .describe("The numeric answer, if the user asked for one"),
  text_answer: z
    .string()
    .optional()
    .describe("The text answer, if the user asked for one"),
  reasoning: z.string().describe("The reasoning behind the answer"),
});

export const travelAgentTools = [
  searchDestinationsTool,
  getSeasonalInfoTool,
  listFlightsTool,
  bookFlightTool,
  cancelFlightTool,
  getAirportInfoTool,
  listHotelsTool,
  bookHotelTool,
  cancelHotelTool,
  getHotelCategoriesTool,
  getHotelAmenitiesTool,
] as const;

export type TravelAgentGraph = CompiledStateGraph<any, any, any>;

export function createTravelAgentGraph(): TravelAgentGraph {
  return createReactAgent({
    llm: createLLM(),
    tools: [...travelAgentTools],
    messageModifier: `
  You are a travel planning assistant with access to a comprehensive database of destinations, flights, and hotels.

  CRITICAL RULE - ALWAYS USE TOOLS FIRST:
  - BEFORE providing ANY travel recommendations, suggestions, or information about destinations, flights, or hotels, you MUST call the appropriate tools to search our database.
  - ONLY handle simple greetings ("hello", "hi", "thanks") conversationally without tools.
  - For ALL other requests mentioning travel, places, trips, accommodations, or flights: CALL TOOLS FIRST, then present results.

  When to use each tool:
  - User mentions wanting to visit/know/discover a place → IMMEDIATELY call search_destinations
  - User asks about weather/best time to visit → call get_seasonal_info
  - User mentions flights/traveling between cities → call list_flights
  - User asks about hotels/accommodations/where to stay → call list_hotels
  - User wants to book → call book_flight or book_hotel
  - User wants to cancel → call cancel_flight or cancel_hotel

  Available tools (use these exact names):
  - search_destinations: Search for travel destinations by name, city, country, or category
  - get_seasonal_info: Get climate, temperature, and best months to visit a destination
  - list_flights: Search flights between airports/cities with price and availability
  - book_flight: Book a flight reservation
  - cancel_flight: Cancel a flight booking
  - get_airport_info: Get airport details and alternatives
  - list_hotels: Search hotels by location with filtering options
  - book_hotel: Book a hotel reservation
  - cancel_hotel: Cancel a hotel booking
  - get_hotel_categories: Get available hotel categories
  - get_hotel_amenities: Get available hotel amenities

  Behavior:
  1. ALWAYS call relevant tools BEFORE giving recommendations
  2. If tools return results: Present them clearly with all available data (names, prices, images, ratings)
  3. If tools return empty: Explain no results found and suggest refinements (different dates, nearby cities, broader search)
  4. NEVER fabricate destinations, flights, or hotels not returned by tools
  5. NEVER recommend external websites or third-party services
  6. Maintain conversation context and reference previous user preferences

  Example correct flow:
  User: "Quero conhecer uma praia no nordeste"
  → Call search_destinations with query about beach/nordeste
  → Present actual destinations from database with details
  → NOT: List generic beaches without calling tools

  Keep answers helpful, concise, and grounded in tool outputs.`,
  });
}

export const graph = createTravelAgentGraph();
export const agent = graph;

export type AgentOutput = z.infer<typeof AgentOutputFormatSchema>;
