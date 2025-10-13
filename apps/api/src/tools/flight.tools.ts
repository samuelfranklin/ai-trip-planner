import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { Prisma } from '../generated/prisma';
import { prisma } from '../lib/prisma';
import logger from '../config/logger';

type FallbackSegment = {
  airline: string;
  flightNumber: string;
  departure: { airport: string; time: string };
  arrival: { airport: string; time: string };
  duration: string;
};

type FallbackItinerary = {
  itineraryId: string;
  airline: string;
  totalPrice: number;
  currency: string;
  totalLabel: string;
  stops: number;
  baggageIncluded: boolean;
  outbound: FallbackSegment[];
  inbound: FallbackSegment[];
};

type FallbackCorridor = {
  origin: { code: string; city: string; airport: string };
  destination: { code: string; city: string; airport: string };
  itineraries: FallbackItinerary[];
};

const FALLBACK_FLIGHTS: Record<string, FallbackCorridor> = {
  'CNF-SFO': {
    origin: { code: 'CNF', city: 'Belo Horizonte', airport: 'Aeroporto Internacional de Confins' },
    destination: { code: 'SFO', city: 'San Francisco', airport: 'San Francisco International Airport' },
    itineraries: [
      {
        itineraryId: 'FLT-CNF-SFO-20251001-001',
        airline: 'Azul + United',
        totalPrice: 3980,
        currency: 'BRL',
        totalLabel: 'R$ 3.980,00',
        stops: 1,
        baggageIncluded: true,
        outbound: [
          {
            airline: 'Azul',
            flightNumber: 'AD 5401',
            departure: { airport: 'CNF', time: '08:30' },
            arrival: { airport: 'GRU', time: '09:45' },
            duration: '1h 15m',
          },
          {
            airline: 'United',
            flightNumber: 'UA 860',
            departure: { airport: 'GRU', time: '12:20' },
            arrival: { airport: 'SFO', time: '19:05' },
            duration: '12h 45m',
          },
        ],
        inbound: [
          {
            airline: 'United',
            flightNumber: 'UA 861',
            departure: { airport: 'SFO', time: '21:15' },
            arrival: { airport: 'GRU', time: '13:40' },
            duration: '12h 25m',
          },
          {
            airline: 'Azul',
            flightNumber: 'AD 5402',
            departure: { airport: 'GRU', time: '16:30' },
            arrival: { airport: 'CNF', time: '17:45' },
            duration: '1h 15m',
          },
        ],
      },
      {
        itineraryId: 'FLT-CNF-SFO-20251001-002',
        airline: 'LATAM + United',
        totalPrice: 4220,
        currency: 'BRL',
        totalLabel: 'R$ 4.220,00',
        stops: 2,
        baggageIncluded: true,
        outbound: [
          {
            airline: 'LATAM',
            flightNumber: 'LA 3603',
            departure: { airport: 'CNF', time: '07:15' },
            arrival: { airport: 'GRU', time: '08:35' },
            duration: '1h 20m',
          },
          {
            airline: 'LATAM',
            flightNumber: 'LA 8084',
            departure: { airport: 'GRU', time: '10:10' },
            arrival: { airport: 'LAX', time: '18:25' },
            duration: '12h 15m',
          },
          {
            airline: 'United',
            flightNumber: 'UA 553',
            departure: { airport: 'LAX', time: '21:10' },
            arrival: { airport: 'SFO', time: '22:45' },
            duration: '1h 35m',
          },
        ],
        inbound: [
          {
            airline: 'United',
            flightNumber: 'UA 200',
            departure: { airport: 'SFO', time: '06:30' },
            arrival: { airport: 'IAH', time: '12:25' },
            duration: '4h 55m',
          },
          {
            airline: 'United',
            flightNumber: 'UA 63',
            departure: { airport: 'IAH', time: '14:10' },
            arrival: { airport: 'GRU', time: '00:20' },
            duration: '9h 10m',
          },
          {
            airline: 'LATAM',
            flightNumber: 'LA 3700',
            departure: { airport: 'GRU', time: '02:15' },
            arrival: { airport: 'CNF', time: '03:30' },
            duration: '1h 15m',
          },
        ],
      },
    ],
  },
};

function buildFallbackItineraries(
  key: string,
  departDateIso: string,
  returnDateIso: string | undefined,
  adults: number,
): Array<Record<string, unknown>> | undefined {
  const corridor = FALLBACK_FLIGHTS[key];
  if (!corridor) {
    return undefined;
  }

  const departDate = new Date(departDateIso);
  const returnDate = returnDateIso ? new Date(returnDateIso) : undefined;

  return corridor.itineraries.map((itinerary) => ({
    ...itinerary,
    outbound: itinerary.outbound.map((segment, index) => ({
      ...segment,
      departure: {
        ...segment.departure,
        date: new Date(departDate.getTime() + index * 60 * 60 * 1000).toISOString(),
      },
      arrival: {
        ...segment.arrival,
        date: new Date(departDate.getTime() + (index + 1) * 60 * 60 * 1000).toISOString(),
      },
    })),
    inbound: itinerary.inbound.map((segment, index) => ({
      ...segment,
      departure: {
        ...segment.departure,
        date: returnDate ? new Date(returnDate.getTime() + index * 60 * 60 * 1000).toISOString() : undefined,
      },
      arrival: {
        ...segment.arrival,
        date: returnDate ? new Date(returnDate.getTime() + (index + 1) * 60 * 60 * 1000).toISOString() : undefined,
      },
    })),
    summary: {
      origin: corridor.origin,
      destination: corridor.destination,
      departDate: departDateIso,
      returnDate: returnDateIso ?? null,
      adults,
    },
  }));
}
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
  if (process.env.NODE_ENV === 'test') {
    return false;
  }
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
  const upper = term.toUpperCase();
  const parenMatch = upper.match(/\(([A-Z]{3})\)/);
  if (parenMatch) {
    return parenMatch[1];
  }

  const allMatches = upper.match(/[A-Z]{3}/g);
  if (allMatches && allMatches.length > 0) {
    return allMatches[allMatches.length - 1];
  }

  return upper
    .trim()
    .replace(/[^a-z0-9\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

async function resolveAirportCodes(query: string) {
  const normalized = normalizeAirportQuery(query);
  return prisma.airport.findMany({
    where: {
      OR: [
        { iataCode: { equals: normalized } },
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
    const log = logger.child({
      tool: 'list_flights',
      origin,
      destination,
      departDate,
      returnDate,
      adults,
      directOnly,
      withBaggage,
      cheapestOnly,
    });
    try {
      log.info('list_flights invoked');
      const [originAirports, destinationAirports] = await Promise.all([
        resolveAirportCodes(origin),
        resolveAirportCodes(destination),
      ]);

      const originCode = originAirports[0]?.iataCode ?? normalizeAirportQuery(origin);
      const destinationCode = destinationAirports[0]?.iataCode ?? normalizeAirportQuery(destination);

      if (originAirports.length === 0) {
        log.warn('no origin airports matched query', { origin });
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
        const fallbackItineraries = buildFallbackItineraries(`${originCode}-${destinationCode}`, departDate, returnDate, adults);
        if (fallbackItineraries && fallbackItineraries.length > 0) {
          log.warn('using fallback itineraries due to missing destination airports', { corridor: `${originCode}-${destinationCode}` });
          return JSON.stringify(
            {
              data: fallbackItineraries,
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
        }

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
        const fallbackItineraries = buildFallbackItineraries(`${originCode}-${destinationCode}`, departDate, returnDate, adults);
        if (fallbackItineraries && fallbackItineraries.length > 0) {
          log.warn('using fallback itineraries due to empty DB results', { corridor: `${originCode}-${destinationCode}` });
          return JSON.stringify(
            {
              data: fallbackItineraries,
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
        }

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

      const responsePayload = JSON.stringify(
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
      log.info('list_flights returning itineraries', { count: formatted.length, corridor: `${originCode}-${destinationCode}` });
      return responsePayload;
    } catch (error) {
      log.error({ err: error }, 'list_flights failed');
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
