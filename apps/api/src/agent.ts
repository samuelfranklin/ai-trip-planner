import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import type { CompiledStateGraph } from "@langchain/langgraph";
import { createLLM } from "./services/llm.service";

// Import tools
import {
  searchDestinationsTool,
  getSeasonalInfoTool,
} from "./tools/destination.tools";
import {
  searchFlightsTool,
  getAirportInfoTool,
} from "./tools/flight.tools";
import {
  searchHotelsTool,
  getHotelCategoriesTool,
  getHotelAmenitiesTool,
} from "./tools/hotel.tools";

const model = createLLM();

const AgentOutputFormatSchema = z.object({
  numeric_answer: z.number().optional().describe("The numeric answer, if the user asked for one"),
  text_answer: z.string().optional().describe("The text answer, if the user asked for one"),
  reasoning: z.string().describe("The reasoning behind the answer"),
})

// Criar agente usando LangGraph (versão moderna)
export const agent: CompiledStateGraph<any, any, any> = createReactAgent({
    llm: model,
    tools: [
      // Destination tools
      searchDestinationsTool,
      getSeasonalInfoTool,
      // Flight tools
      searchFlightsTool,
      getAirportInfoTool,
      // Hotel tools
      searchHotelsTool,
      getHotelCategoriesTool,
      getHotelAmenitiesTool,
    ],
  messageModifier: `You are a travel planning assistant.

Core rules:
- Use your LLM ability to handle conversational inputs (greetings, rapport, clarifications, preference gathering) without calling tools. Stay friendly and concise.
- For any factual or data-dependent request (destinations, seasons, flights, airports, hotels, prices, availability), ALWAYS call the internal tools listed below and ground the answer strictly in their results.
- NEVER recommend external websites, apps, search engines, or third-party travel services. When information is unavailable in our database, explain the limitation, propose how to refine the request, or suggest nearby options from our data—do not send the user elsewhere.

Available tools (use these exact names):
- search_destinations
- get_seasonal_info
- search_flights
- get_airport_info
- search_hotels
- get_hotel_categories
- get_hotel_amenities

Behavior:
- Determine if a tool call is required; if so, choose the smallest set of tools to answer the question. Combine multiple tools when it improves accuracy and explicitly mention which tools informed the answer.
- Maintain context across the conversation. Reference prior user preferences or answers you requested earlier before asking for new details.
- Determine if a tool call is required; if so, choose the smallest set of tools to answer the question. Combine multiple tools when it improves accuracy and explicitly mention which tools informed the answer.
- If a tool returns no results, state that no records were found in our database and offer concrete next steps (broaden dates/locations, tweak filters, or ask follow-up questions).
- Never fabricate database facts. Ask clarifying questions when the user input is insufficient to choose the right tool parameters.

Keep all factual answers concise, helpful, and sourced from tool outputs.`,
});

export type AgentOutput = z.infer<typeof AgentOutputFormatSchema>;
