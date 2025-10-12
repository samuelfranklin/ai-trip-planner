import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

/**
 * Tool to search flights between airports or cities.
 */
export const searchFlightsTool = tool(
  async ({
    origin,
    destination,
    maxResults = 10,
    maxPrice,
    maxStops,
    sortBy = 'price',
  }: {
    origin: string;
    destination: string;
    maxResults?: number;
    maxPrice?: number;
    maxStops?: number;
    sortBy?: 'price' | 'duration';
  }) => {
    try {
      // Lookup origin and destination airports
      const originAirports = await prisma.airport.findMany({
        where: {
          OR: [
            { iataCode: { equals: origin.toUpperCase() } },
            { city: { contains: origin, mode: 'insensitive' } },
            { name: { contains: origin, mode: 'insensitive' } },
          ],
        },
        select: {
          iataCode: true,
          name: true,
          city: true,
          country: true,
        },
        take: 10,
      });

      const destAirports = await prisma.airport.findMany({
        where: {
          OR: [
            { iataCode: { equals: destination.toUpperCase() } },
            { city: { contains: destination, mode: 'insensitive' } },
            { name: { contains: destination, mode: 'insensitive' } },
          ],
        },
        select: {
          iataCode: true,
          name: true,
          city: true,
          country: true,
        },
        take: 10,
      });

      if (originAirports.length === 0) {
        return JSON.stringify(
          {
            data: [],
            message: `I couldn't find any airports for the origin "${origin}".`,
            suggestions: [
              'Double-check the IATA code or city name',
              'Try a nearby departure airport',
            ],
            source: 'airports',
            language: 'en',
          },
          null,
          2
        );
      }

      if (destAirports.length === 0) {
        return JSON.stringify(
          {
            data: [],
            message: `I couldn't find any airports for the destination "${destination}".`,
            suggestions: [
              'Confirm the IATA code or city spelling',
              'Search for an alternative arrival airport',
            ],
            source: 'airports',
            language: 'en',
          },
          null,
          2
        );
      }

      const originCodes = originAirports.map((a) => a.iataCode).filter(Boolean);
      const destCodes = destAirports.map((a) => a.iataCode).filter(Boolean);

      // Search itineraries
      const whereClause: any = {
        origin: { in: originCodes },
        destination: { in: destCodes },
        isActive: true,
      };

      if (maxPrice) {
        whereClause.totalPrice = { lte: maxPrice };
      }

      if (maxStops !== undefined) {
        whereClause.stops = { lte: maxStops };
      }

      const itineraries = await prisma.flightItinerary.findMany({
        where: whereClause,
        select: {
          itineraryId: true,
          origin: true,
          destination: true,
          airline: true,
          totalPrice: true,
          stops: true,
          returnDate: true,
          departDate: true,
          baggageIncluded: true,
          outboundSegments: true,
          inboundSegments: true,
          originAirport: {
            select: {
              iataCode: true,
              city: true,
              name: true,
            },
          },
          destinationAirport: {
            select: {
              iataCode: true,
              city: true,
              name: true,
            },
          },
        },
        orderBy:
          sortBy === 'price'
            ? { totalPrice: 'asc' }
            : { stops: 'asc' },
        take: maxResults,
      });

      if (itineraries.length === 0) {
        return JSON.stringify(
          {
            data: [],
            message: `I couldn't find flights from ${origin} to ${destination}.`,
            suggestions: [
              'Allow more stops or broaden the travel dates',
              'Try nearby origin or destination airports',
              'Increase the maxPrice filter if it is very strict',
            ],
            source: 'flights',
            language: 'en',
          },
          null,
          2
        );
      }

      const formatSegments = (segments: unknown): Array<Record<string, unknown>> => {
        if (!Array.isArray(segments)) return [];
        return segments.map((segment) => {
          if (segment && typeof segment === "object") {
            return segment as Record<string, unknown>;
          }
          return { raw: segment };
        });
      };

      const formatted = itineraries.map((itin) => ({
        id: itin.itineraryId,
        origin: {
          code: itin.origin,
          airport: itin.originAirport?.name ?? null,
          city: itin.originAirport?.city ?? null,
        },
        destination: {
          code: itin.destination,
          airport: itin.destinationAirport?.name ?? null,
          city: itin.destinationAirport?.city ?? null,
        },
        airline: itin.airline,
        totalPrice: itin.totalPrice,
        totalPriceLabel: `R$ ${itin.totalPrice.toFixed(2)}`,
        stops: itin.stops,
        tripType: itin.returnDate ? "round_trip" : "one_way",
        departureDate: itin.departDate.toISOString().split("T")[0],
        returnDate: itin.returnDate ? itin.returnDate.toISOString().split("T")[0] : null,
        baggageIncluded: itin.baggageIncluded,
        outboundSegments: formatSegments(itin.outboundSegments),
        returnSegments: formatSegments(itin.inboundSegments),
      }));

      return JSON.stringify(
        {
          data: formatted,
          source: 'flights',
          language: 'en',
          suggestions: [
            'Run search_hotels to compare nearby stays',
            'Use get_airport_info for airport amenities and alternatives',
          ],
        },
        null,
        2
      );
    } catch (error) {
      console.error('Error while searching flights:', error);
      return JSON.stringify(
        {
          error: true,
          message:
            'I ran into an issue while fetching flights. Could you share more about your route, budget, or timing so I can try again?',
          nextSteps: [
            'Confirm the origin and destination details',
            'Loosen filters like max stops or max price',
            'Ask about airport information or alternate travel dates',
          ],
          language: 'en',
        },
        null,
        2
      );
    }
  },
  {
    name: 'search_flights',
    description:
      'Searches flights between cities or airports. Supports filters like max price, stops, and sorting by price or duration. Use this when someone needs air travel options between two places.',
    schema: z.object({
      origin: z
        .string()
        .describe("Origin city or airport IATA code (e.g., 'São Paulo', 'GRU')"),
      destination: z
        .string()
        .describe("Destination city or airport IATA code (e.g., 'Lisboa', 'LIS')"),
      maxResults: z
        .number()
        .optional()
        .default(10)
        .describe('Maximum number of itineraries to return (default: 10).'),
      maxPrice: z
        .number()
        .optional()
        .describe('Maximum total price in BRL (e.g., 2000).'),
      maxStops: z
        .number()
        .optional()
        .describe('Maximum number of stops (0 = non-stop).'),
      sortBy: z
        .enum(['price', 'duration'])
        .optional()
        .default('price')
        .describe("Sort results by 'price' or 'duration'."),
    }),
  }
);

/**
 * Tool to retrieve airport details.
 */
export const getAirportInfoTool = tool(
  async ({ query }: { query: string }) => {
    try {
      const airports = await prisma.airport.findMany({
        where: {
          OR: [
            { iataCode: { equals: query.toUpperCase() } },
            { city: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
            { country: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          iataCode: true,
          name: true,
          city: true,
          country: true,
          isInternational: true,
          latitude: true,
          longitude: true,
          alternativeAirports: true,
          popularityScore: true,
        },
        orderBy: {
          popularityScore: "desc",
        },
        take: 5,
      });

      if (airports.length === 0) {
        return JSON.stringify(
          {
            data: [],
            message: `I couldn't find any airports that match "${query}".`,
            suggestions: [
              'Provide the airport IATA code if you know it',
              'Search by the city or country name',
            ],
            source: 'airports',
            language: 'en',
          },
          null,
          2
        );
      }

      const formatted = airports.map((airport) => ({
        code: airport.iataCode,
        name: airport.name,
        city: airport.city,
        country: airport.country,
        international: airport.isInternational,
        coordinates:
          airport.latitude && airport.longitude
            ? {
                latitude: Number(airport.latitude.toFixed(4)),
                longitude: Number(airport.longitude.toFixed(4)),
              }
            : null,
        alternativeAirports: airport.alternativeAirports,
        popularityScore: airport.popularityScore,
      }));

      return JSON.stringify(
        {
          data: formatted,
          source: 'airports',
          language: 'en',
          suggestions: [
            'Pair with search_flights to explore routes',
            'Ask search_hotels for lodging once the airport is confirmed',
          ],
        },
        null,
        2
      );
    } catch (error) {
      console.error('Error while fetching airport information:', error);
      return JSON.stringify(
        {
          error: true,
          message:
            'I had trouble retrieving airport details. Could you share more about the airport or region you have in mind?',
          nextSteps: [
            'Share the airport code, city, or nearby country',
            'Ask about flights or destinations so I can look them up another way',
          ],
          language: 'en',
        },
        null,
        2
      );
    }
  },
  {
    name: 'get_airport_info',
    description:
      'Retrieves airport metadata such as IATA code, location, international status, coordinates, and nearby alternatives. Use this when someone asks about a specific airport or needs possible alternatives.',
    schema: z.object({
      query: z
        .string()
        .describe('Airport code, name, city, or country to look up.'),
    }),
  }
);
