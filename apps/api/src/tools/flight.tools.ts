import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { Prisma } from '../generated/prisma';
import { prisma } from '../lib/prisma';

const BOOKING_MIN_DELAY_MS = 300;
const BOOKING_MAX_DELAY_MS = 1200;
const BOOKING_FAILURE_RATE = 0.15;

function parseIsoDate(value: string, fieldName: string): Date {
  const trimmed = value.trim();
  const normalized = trimmed.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$3-$2-$1');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date in ISO format (YYYY-MM-DD).`);
  }
  return date;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date.getTime());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date.getTime());
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function randomDelayMs(): number {
  const range = BOOKING_MAX_DELAY_MS - BOOKING_MIN_DELAY_MS;
  return BOOKING_MIN_DELAY_MS + Math.floor(Math.random() * (range + 1));
}

async function waitForLatency(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, randomDelayMs()));
}

function shouldFailBooking(): boolean {
  return Math.random() < BOOKING_FAILURE_RATE;
}

function formatSegments(segments: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(segments)) {
    return [];
  }
  return segments.map((segment) => {
    if (segment && typeof segment === 'object') {
      return segment as Record<string, unknown>;
    }
    return { raw: segment };
  });
}

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function buildBookingErrorPayload(action: 'flight' | 'hotel') {
  return JSON.stringify(
    {
      error: true,
      code: `${action.toUpperCase()}_BOOKING_FAILED`,
      retryable: true,
      message:
        'We hit a transient issue while confirming the reservation. Please wait a moment and try again. The retry button in the UI should help.',
    },
    null,
    2,
  );
}

function normalizeAirportQuery(term: string): string {
  return term.trim();
}

async function resolveAirportCodes(query: string) {
  const normalized = normalizeAirportQuery(query);
  return prisma.airport.findMany({
    where: {
      OR: [
        { iataCode: { equals: normalized.toUpperCase() } },
        { city: { contains: normalized, mode: 'insensitive' } },
        { name: { contains: normalized, mode: 'insensitive' } },
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
}

function generatePNR(): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let index = 0; index < 6; index += 1) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset[randomIndex];
  }
  return result;
}

export const listFlightsTool = tool(
  async ({
    origin,
    destination,
    departDate,
    returnDate,
    adults = 1,
    directOnly = false,
    withBaggage,
    cheapestOnly = false,
    maxResults = 10,
  }) => {
    try {
      const [originAirports, destinationAirports] = await Promise.all([
        resolveAirportCodes(origin),
        resolveAirportCodes(destination),
      ]);

      if (originAirports.length === 0) {
        return JSON.stringify(
          {
            data: [],
            message: `No airports found for origin "${origin}".`,
            suggestions: [
              'Double-check the city or IATA code',
              'Try nearby departure airports',
            ],
            source: 'airports',
            language: 'en',
          },
          null,
          2,
        );
      }

      if (destinationAirports.length === 0) {
        return JSON.stringify(
          {
            data: [],
            message: `No airports found for destination "${destination}".`,
            suggestions: [
              'Check the city spelling or IATA code',
              'Consider alternative arrival airports',
            ],
            source: 'airports',
            language: 'en',
          },
          null,
          2,
        );
      }

      const depart = parseIsoDate(departDate, 'departDate');
      const returnTrip = returnDate ? parseIsoDate(returnDate, 'returnDate') : undefined;

      const whereClause: Record<string, unknown> = {
        origin: { in: originAirports.map((airport) => airport.iataCode) },
        destination: { in: destinationAirports.map((airport) => airport.iataCode) },
        departDate: {
          gte: startOfDay(depart),
          lte: endOfDay(depart),
        },
        isActive: true,
      };

      if (returnTrip) {
        whereClause.returnDate = {
          gte: startOfDay(returnTrip),
          lte: endOfDay(returnTrip),
        };
      }

      if (directOnly) {
        whereClause.stops = 0;
      }

      if (withBaggage !== undefined) {
        whereClause.baggageIncluded = withBaggage;
      }

      const orderBy = cheapestOnly
        ? [{ totalPrice: 'asc' as const }]
        : [{ totalPrice: 'asc' as const }, { stops: 'asc' as const }, { popularityScore: 'desc' as const }];

      const itineraries = await prisma.flightItinerary.findMany({
        where: whereClause,
        orderBy,
        take: cheapestOnly ? 1 : maxResults,
        select: {
          itineraryId: true,
          origin: true,
          destination: true,
          departDate: true,
          returnDate: true,
          airline: true,
          totalPrice: true,
          currency: true,
          stops: true,
          baggageIncluded: true,
          outboundSegments: true,
          inboundSegments: true,
          originAirport: {
            select: {
              name: true,
              city: true,
              iataCode: true,
            },
          },
          destinationAirport: {
            select: {
              name: true,
              city: true,
              iataCode: true,
            },
          },
        },
      });

      if (itineraries.length === 0) {
        return JSON.stringify(
          {
            data: [],
            message: `No flights found from ${origin} to ${destination} for the selected dates.`,
            suggestions: [
              'Relax baggage or stops filters',
              'Try alternative travel dates',
              'Consider nearby airports both ends',
            ],
            source: 'flights',
            language: 'en',
          },
          null,
          2,
        );
      }

      const formatted = itineraries.map((itin) => ({
        itineraryId: itin.itineraryId,
        airline: itin.airline,
        totalPrice: Number(itin.totalPrice),
        currency: itin.currency,
        totalLabel: formatCurrency(Number(itin.totalPrice), itin.currency),
        stops: itin.stops,
        baggageIncluded: itin.baggageIncluded,
        outbound: formatSegments(itin.outboundSegments),
        inbound: formatSegments(itin.inboundSegments),
        summary: {
          origin: {
            code: itin.origin,
            city: itin.originAirport?.city ?? null,
            airport: itin.originAirport?.name ?? null,
          },
          destination: {
            code: itin.destination,
            city: itin.destinationAirport?.city ?? null,
            airport: itin.destinationAirport?.name ?? null,
          },
          departDate: itin.departDate.toISOString().slice(0, 10),
          returnDate: itin.returnDate ? itin.returnDate.toISOString().slice(0, 10) : null,
          adults,
        },
      }));

      return JSON.stringify(
        {
          data: formatted,
          source: 'flights',
          language: 'en',
          suggestions: [
            'Ask book_flight to lock a seat using an itineraryId',
            'Run list_hotels to compare stays at the destination',
          ],
        },
        null,
        2,
      );
    } catch (error) {
      console.error('Error while listing flights:', error);
      const friendlyMessage =
        error instanceof Error && error.message
          ? error.message
          : 'I could not search flights right now. Confirm the route and dates, then try again shortly.';
      return JSON.stringify(
        {
          error: true,
          message: friendlyMessage,
          nextSteps: [
            'Ensure origin/destination inputs are valid cities or IATA codes',
            'Keep the date format as YYYY-MM-DD',
            'Remove optional filters to widen the search',
          ],
        },
        null,
        2,
      );
    }
  },
  {
    name: 'list_flights',
    description: 'Fetches round-trip flight itineraries. Requires origin, destination, and departure date; return date optional for one-way.',
    schema: z.object({
      origin: z.string().min(2).describe('Origin city name or IATA code.'),
      destination: z.string().min(2).describe('Destination city name or IATA code.'),
      departDate: z.string().min(8).describe('Departure date in ISO format (YYYY-MM-DD).'),
      returnDate: z.string().min(8).optional().describe('Return date in ISO format when searching round trips.'),
      adults: z.number().int().min(1).default(1).describe('Number of adult travelers.'),
      directOnly: z.boolean().optional().default(false).describe('If true, restrict to non-stop flights.'),
      withBaggage: z.boolean().optional().describe('Filter by baggage included flag.'),
      cheapestOnly: z.boolean().optional().default(false).describe('If true, only return the single cheapest itinerary.'),
      maxResults: z.number().int().min(1).max(20).optional().default(10).describe('Maximum itineraries to return when cheapestOnly is false.'),
    }),
  },
);

export const bookFlightTool = tool(
  async ({
    itineraryId,
    passenger,
    adults = 1,
    seatClass,
    fareBasis,
    specialRequests,
    metadata,
  }) => {
    try {
      const itinerary = await prisma.flightItinerary.findUnique({
        where: { itineraryId },
        select: {
          itineraryId: true,
          totalPrice: true,
          currency: true,
        },
      });

      if (!itinerary) {
        return JSON.stringify(
          {
            error: true,
            message: `Itinerary ${itineraryId} was not found. List flights again to refresh options.`,
            retryable: false,
          },
          null,
          2,
        );
      }

      await waitForLatency();

      if (shouldFailBooking()) {
        return buildBookingErrorPayload('flight');
      }

      let pnr: string;
      let collisions = 0;
      do {
        pnr = generatePNR();
        // eslint-disable-next-line no-await-in-loop
        const existing = await prisma.flightBooking.findUnique({ where: { pnr } });
        if (!existing) {
          break;
        }
        collisions += 1;
        if (collisions > 5) {
          return JSON.stringify(
            {
              error: true,
              message: 'Unable to generate a unique PNR right now. Please retry the booking.',
              retryable: true,
            },
            null,
            2,
          );
        }
      } while (true);

      const booking = await prisma.flightBooking.create({
        data: {
          pnr,
          status: 'TICKETED',
          total: itinerary.totalPrice,
          currency: itinerary.currency,
          passengerName: passenger.fullName,
          passengerEmail: passenger.email,
          passengerPhone: passenger.phone ?? null,
          adults,
          seatClass: seatClass ?? null,
          fareBasis: fareBasis ?? null,
          specialRequests: specialRequests ?? null,
          ...(typeof metadata !== 'undefined' ? { metadata: metadata as Prisma.InputJsonValue } : {}),
          itineraryId: itinerary.itineraryId,
        },
      });

      return JSON.stringify(
        {
          pnr: booking.pnr,
          status: booking.status,
          total: Number(booking.total),
          currency: booking.currency,
          totalLabel: formatCurrency(Number(booking.total), booking.currency),
          passenger,
          adults: booking.adults,
          seatClass: booking.seatClass,
          fareBasis: booking.fareBasis,
          specialRequests: booking.specialRequests,
          metadata: booking.metadata ?? null,
          itineraryId: booking.itineraryId,
          message: 'Flight confirmed successfully.',
        },
        null,
        2,
      );
    } catch (error) {
      console.error('Error while booking flight:', error);
      return JSON.stringify(
        {
          error: true,
          message: 'We could not complete the flight reservation. Please confirm the details and retry shortly.',
          retryable: true,
        },
        null,
        2,
      );
    }
  },
  {
    name: 'book_flight',
    description: 'Confirms a flight itinerary and returns a ticketed PNR. Simulates latency and occasional transient failures.',
    schema: z.object({
      itineraryId: z.string().min(3).describe('Identifier returned by list_flights.'),
      passenger: z.object({
        fullName: z.string().min(3).describe('Passenger full name.'),
        email: z
          .string()
          .email()
          .describe('Passenger contact email.'),
        phone: z.string().min(8).max(30).optional().describe('Optional passenger phone for contact and notifications.'),
      }),
      adults: z.number().int().min(1).default(1).describe('Number of adults included in the booking.'),
      seatClass: z.string().min(1).max(20).optional().describe('Preferred cabin class (e.g., economy, premium, business).'),
      fareBasis: z.string().min(1).max(20).optional().describe('Optional fare basis code for corporate bookings.'),
      specialRequests: z.string().min(3).max(500).optional().describe('Free-form notes like meal preference or seating needs.'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional structured metadata to persist with the booking.'),
    }),
  },
);

export const cancelFlightTool = tool(
  async ({ pnr }) => {
    try {
      const booking = await prisma.flightBooking.findUnique({ where: { pnr } });

      if (!booking) {
        return JSON.stringify(
          {
            error: true,
            message: `PNR ${pnr} was not found in our records. Double-check the code and try again.`,
            retryable: false,
          },
          null,
          2,
        );
      }

      if (booking.status === 'CANCELED') {
        return JSON.stringify(
          {
            status: booking.status,
            pnr: booking.pnr,
            message: 'The reservation was already canceled.',
          },
          null,
          2,
        );
      }

      const updated = await prisma.flightBooking.update({
        where: { pnr },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
        },
      });

      return JSON.stringify(
        {
          status: updated.status,
          pnr: updated.pnr,
          message: 'Flight reservation canceled successfully.',
        },
        null,
        2,
      );
    } catch (error) {
      console.error('Error while canceling flight:', error);
      return JSON.stringify(
        {
          error: true,
          message: 'Could not cancel the flight right now. Please retry in a moment.',
          retryable: true,
        },
        null,
        2,
      );
    }
  },
  {
    name: 'cancel_flight',
    description: 'Cancels a previously ticketed flight reservation using its PNR.',
    schema: z.object({
      pnr: z.string().min(5).describe('PNR received from book_flight.'),
    }),
  },
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
            'Pair with list_flights to explore routes',
            'Ask list_hotels for lodging once the airport is confirmed',
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
