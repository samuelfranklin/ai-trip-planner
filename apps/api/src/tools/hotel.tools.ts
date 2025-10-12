import { tool } from '@langchain/core/tools';
import { z } from 'zod';
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

function ensureDateOrder(checkin: Date, checkout: Date): void {
  if (checkout.getTime() <= checkin.getTime()) {
    throw new Error('checkout must be after checkin.');
  }
}

function diffNights(checkin: Date, checkout: Date): number {
  const msPerNight = 1000 * 60 * 60 * 24;
  return Math.round((checkout.getTime() - checkin.getTime()) / msPerNight);
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

function formatCurrency(amount: number, currency: string | null | undefined): string {
  const effectiveCurrency = currency ?? 'BRL';
  return `${effectiveCurrency} ${amount.toFixed(2)}`;
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

function generateReservationId(): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let index = 0; index < 8; index += 1) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset[randomIndex];
  }
  return result;
}

export const listHotelsTool = tool(
  async ({
    city,
    checkin,
    checkout,
    rooms = 1,
    withBreakfast,
    refundableOnly,
    amenities,
    minRating,
    cheapestOnly,
    maxResults = 10,
  }) => {
    try {
      const checkinDate = parseIsoDate(checkin, 'checkin');
      const checkoutDate = parseIsoDate(checkout, 'checkout');
      ensureDateOrder(checkinDate, checkoutDate);

      const nights = diffNights(checkinDate, checkoutDate);

      const whereClause: Record<string, unknown> = {
        city: { contains: city, mode: 'insensitive' },
        isActive: true,
      };

      if (withBreakfast !== undefined) {
        whereClause.breakfastIncluded = withBreakfast;
      }

      if (refundableOnly) {
        whereClause.refundable = true;
      }

      if (minRating !== undefined) {
        whereClause.rating = { gte: minRating };
      }

      if (amenities && amenities.length > 0) {
        whereClause.highlights = { hasEvery: amenities };
      }

      const orderBy = cheapestOnly
        ? [{ nightlyRate: 'asc' as const }]
        : [{ rating: 'desc' as const }, { nightlyRate: 'asc' as const }];

      const hotels = await prisma.hotel.findMany({
        where: whereClause,
        orderBy,
        take: cheapestOnly ? 1 : maxResults,
        select: {
          hotelId: true,
          name: true,
          city: true,
          address: true,
          nightlyRate: true,
          currency: true,
          heroImageUrl: true,
          galleryImageUrls: true,
          rating: true,
          reviewCount: true,
          highlights: true,
          latitude: true,
          longitude: true,
          distanceToCenter: true,
          distanceToAirport: true,
          refundable: true,
          breakfastIncluded: true,
          cancellationPolicy: true,
          categories: {
            select: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

      if (hotels.length === 0) {
        return JSON.stringify(
          {
            data: [],
            message: `No hotels found in ${city} for the selected filters.`,
            suggestions: [
              'Broaden the price range or remove required amenities',
              'Try searching a nearby city or neighborhood',
              'Call get_hotel_categories to see available property styles',
            ],
            source: 'hotels',
            language: 'en',
          },
          null,
          2,
        );
      }

      const formatted = hotels.map((hotel) => {
        const nightlyRateNumber = Number(hotel.nightlyRate);
        const total = nightlyRateNumber * nights * rooms;
        return {
          hotelId: hotel.hotelId,
          name: hotel.name,
          city: hotel.city,
          address: hotel.address,
          rating: Number(hotel.rating),
          reviewCount: hotel.reviewCount,
          nightlyRate: nightlyRateNumber,
          nightlyLabel: formatCurrency(nightlyRateNumber, hotel.currency),
          total,
          totalLabel: formatCurrency(total, hotel.currency),
          currency: hotel.currency ?? 'BRL',
          heroImageUrl: hotel.heroImageUrl ?? null,
          galleryImageUrls: hotel.galleryImageUrls ?? [],
          nights,
          rooms,
          amenities: hotel.highlights,
          refundable: hotel.refundable,
          breakfastIncluded: hotel.breakfastIncluded,
          cancellationPolicy: hotel.cancellationPolicy,
          coordinates:
            hotel.latitude && hotel.longitude
              ? {
                  latitude: Number(hotel.latitude.toFixed(4)),
                  longitude: Number(hotel.longitude.toFixed(4)),
                }
              : null,
          distanceToCenterKm: hotel.distanceToCenter,
          distanceToAirportKm: hotel.distanceToAirport,
          categories: hotel.categories.map((c) => ({
            id: c.category.id,
            name: c.category.name,
            slug: c.category.slug,
          })),
          summary: {
            checkin: checkinDate.toISOString().slice(0, 10),
            checkout: checkoutDate.toISOString().slice(0, 10),
            rooms,
            nights,
          },
        };
      });

      return JSON.stringify(
        {
          data: formatted,
          source: 'hotels',
          language: 'en',
          suggestions: [
            'Use book_hotel to reserve a stay by providing hotelId, dates, and guest info',
            'Call get_hotel_amenities to see available facilities',
          ],
        },
        null,
        2,
      );
    } catch (error) {
      console.error('Error while listing hotels:', error);
      const friendlyMessage =
        error instanceof Error && error.message
          ? error.message
          : 'I ran into an issue retrieving hotels. Could you tell me more about your destination, price range, or must-have amenities?';
      return JSON.stringify(
        {
          error: true,
          message: friendlyMessage,
          nextSteps: [
            'Adjust the filters such as amenities or rating',
            'Confirm the city spelling and use YYYY-MM-DD dates',
            'Ask about categories or amenities first to refine the search',
          ],
        },
        null,
        2,
      );
    }
  },
  {
    name: 'list_hotels',
    description: 'Returns hotel options for a city and date range. Supports breakfast/refundable filters, amenities, and sorting.',
    schema: z.object({
      city: z.string().min(2).describe('Destination city (partial match allowed).'),
      checkin: z.string().min(8).describe('Check-in date in ISO format (YYYY-MM-DD).'),
      checkout: z.string().min(8).describe('Check-out date in ISO format (YYYY-MM-DD).'),
      rooms: z.number().int().min(1).default(1).describe('Number of rooms requested.'),
      withBreakfast: z.boolean().optional().describe('Filter by breakfast included flag.'),
      refundableOnly: z.boolean().optional().describe('Restrict results to refundable stays.'),
      amenities: z.array(z.string()).optional().describe('List of required amenities (e.g., wifi, spa).'),
      minRating: z.number().optional().describe('Minimum review rating (0-5).'),
      cheapestOnly: z.boolean().optional().default(false).describe('If true, return only the cheapest stay.'),
      maxResults: z.number().int().min(1).max(20).optional().default(10).describe('Maximum hotels to return when cheapestOnly is false.'),
    }),
  },
);

export const bookHotelTool = tool(
  async ({
    hotelId,
    checkin,
    checkout,
    guest,
    rooms = 1,
    adults = 1,
    children = 0,
    specialRequests,
    metadata,
  }) => {
    try {
      const hotel = await prisma.hotel.findUnique({
        where: { hotelId },
        select: {
          hotelId: true,
          nightlyRate: true,
          currency: true,
        },
      });

      if (!hotel) {
        return JSON.stringify(
          {
            error: true,
            message: `Hotel ${hotelId} was not found. List hotels again to refresh options.`,
            retryable: false,
          },
          null,
          2,
        );
      }

      const checkinDate = parseIsoDate(checkin, 'checkin');
      const checkoutDate = parseIsoDate(checkout, 'checkout');
      ensureDateOrder(checkinDate, checkoutDate);
      const nights = diffNights(checkinDate, checkoutDate);

      await waitForLatency();

      if (shouldFailBooking()) {
        return buildBookingErrorPayload('hotel');
      }

      const total = Number(hotel.nightlyRate) * nights * rooms;

      let reservationId: string;
      let collisions = 0;
      do {
        reservationId = generateReservationId();
        // eslint-disable-next-line no-await-in-loop
        const existing = await prisma.hotelBooking.findUnique({ where: { reservationId } });
        if (!existing) {
          break;
        }
        collisions += 1;
        if (collisions > 5) {
          return JSON.stringify(
            {
              error: true,
              message: 'Unable to generate a unique reservation ID right now. Please retry the booking.',
              retryable: true,
            },
            null,
            2,
          );
        }
      } while (true);

      const booking = await prisma.hotelBooking.create({
        data: {
          reservationId,
          status: 'BOOKED',
          total,
          currency: hotel.currency ?? 'BRL',
          guestName: guest.fullName,
          guestEmail: guest.email,
          guestPhone: guest.phone,
          hotelId: hotel.hotelId,
          checkin: startOfDay(checkinDate),
          checkout: endOfDay(checkoutDate),
          rooms,
          nights,
          adults,
          children,
          specialRequests,
          metadata,
        },
      });

      return JSON.stringify(
        {
          reservationId: booking.reservationId,
          status: booking.status,
          total: Number(booking.total),
          currency: booking.currency,
          totalLabel: formatCurrency(Number(booking.total), booking.currency),
          guest,
          hotelId: booking.hotelId,
          checkin: checkinDate.toISOString().slice(0, 10),
          checkout: checkoutDate.toISOString().slice(0, 10),
          rooms,
          nights,
          adults: booking.adults,
          children: booking.children,
          specialRequests: booking.specialRequests ?? null,
          metadata: booking.metadata ?? null,
          message: 'Hotel reserved successfully.',
        },
        null,
        2,
      );
    } catch (error) {
      console.error('Error while booking hotel:', error);
      return JSON.stringify(
        {
          error: true,
          message: 'We could not complete the hotel reservation. Please confirm the details and retry shortly.',
          retryable: true,
        },
        null,
        2,
      );
    }
  },
  {
    name: 'book_hotel',
    description: 'Creates a hotel reservation and returns a reservationId. Simulates latency and occasional transient failures.',
    schema: z.object({
      hotelId: z.string().min(3).describe('Identifier returned by list_hotels.'),
      checkin: z.string().min(8).describe('Check-in date in ISO format (YYYY-MM-DD).'),
      checkout: z.string().min(8).describe('Check-out date in ISO format (YYYY-MM-DD).'),
      rooms: z.number().int().min(1).default(1).describe('Number of rooms to book.'),
      guest: z.object({
        fullName: z.string().min(3).describe('Guest full name.'),
        email: z.string().email().describe('Guest contact email.'),
        phone: z.string().min(8).max(30).optional().describe('Optional guest phone for on-arrival coordination.'),
      }),
      adults: z.number().int().min(1).default(1).describe('Number of adults staying in the room(s).'),
      children: z.number().int().min(0).default(0).describe('Number of children staying in the room(s).'),
      specialRequests: z.string().min(3).max(500).optional().describe('Late check-in notes, bedding preferences, etc.'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional structured metadata to persist with the booking.'),
    }),
  },
);

export const cancelHotelTool = tool(
  async ({ reservationId }) => {
    try {
      const booking = await prisma.hotelBooking.findUnique({ where: { reservationId } });

      if (!booking) {
        return JSON.stringify(
          {
            error: true,
            message: `Reservation ${reservationId} was not found in our records.`,
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
            reservationId: booking.reservationId,
            message: 'The stay was already canceled.',
          },
          null,
          2,
        );
      }

      const updated = await prisma.hotelBooking.update({
        where: { reservationId },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
        },
      });

      return JSON.stringify(
        {
          status: updated.status,
          reservationId: updated.reservationId,
          message: 'Hotel reservation canceled successfully.',
        },
        null,
        2,
      );
    } catch (error) {
      console.error('Error while canceling hotel:', error);
      return JSON.stringify(
        {
          error: true,
          message: 'Could not cancel the hotel reservation right now. Please retry in a moment.',
          retryable: true,
        },
        null,
        2,
      );
    }
  },
  {
    name: 'cancel_hotel',
    description: 'Cancels a previously booked hotel stay using its reservation ID.',
    schema: z.object({
      reservationId: z.string().min(6).describe('Reservation code returned by book_hotel.'),
    }),
  },
);

/**
 * Tool to list available hotel categories.
 */
export const getHotelCategoriesTool = tool(
  async () => {
    try {
      const categories = await prisma.category.findMany({
        where: {
          type: 'hotel',
          isActive: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      if (categories.length === 0) {
        return JSON.stringify(
          {
            data: [],
            message: 'We do not have hotel categories configured yet.',
            suggestions: [
              'Ask list_hotels directly with your preferred style',
              'Specify amenities like spa, pool, or breakfast to refine results',
            ],
            source: 'hotel_categories',
            language: 'en',
          },
          null,
          2
        );
      }

      const formatted = categories.map((cat) => ({
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
      }));

      return JSON.stringify(
        {
          data: formatted,
          source: 'hotel_categories',
          language: 'en',
          suggestions: [
            'Use list_hotels with one of these categories to filter results',
            'Combine with get_hotel_amenities to match specific features',
          ],
        },
        null,
        2
      );
    } catch (error) {
      console.error('Error while fetching hotel categories:', error);
      return JSON.stringify(
        {
          error: true,
          message:
            'I could not load the hotel categories. Let me know the type of stay you prefer—luxury, boutique, family—and I will search hotels directly.',
          nextSteps: [
            'Describe the style of hotel you want so I can tailor the search',
            'Ask for amenities or price ranges instead of categories',
          ],
          language: 'en',
        },
        null,
        2
      );
    }
  },
  {
    name: 'get_hotel_categories',
    description:
      'Returns the list of hotel categories available in the system (e.g., Resort, Boutique Hotel, Budget Stay). Use this when someone wants to explore lodging styles.',
    schema: z.object({}),
  }
);

/**
 * Tool to list common hotel amenities.
 */
export const getHotelAmenitiesTool = tool(
  async () => {
    try {
      // Fetch unique amenities across hotels
      const hotels = await prisma.hotel.findMany({
        where: { isActive: true },
        select: { highlights: true },
      });

      const allAmenities = new Set<string>();
      hotels.forEach((hotel) => {
        hotel.highlights.forEach((amenity) => allAmenities.add(amenity));
      });

      const amenitiesList = Array.from(allAmenities).sort((a, b) =>
        a.localeCompare(b, 'en', { sensitivity: 'base' })
      );

      // Friendly descriptions for common amenities
      const amenityDescriptions: Record<string, string> = {
        wifi: 'Free Wi-Fi',
        piscina: 'Swimming pool',
        spa: 'Spa and wellness center',
        academia: 'Fitness center',
        estacionamento: 'Parking available',
        restaurante: 'On-site restaurant',
        bar: 'Bar or lounge',
        cafe_da_manha: 'Breakfast included',
        ar_condicionado: 'Air conditioning',
        pet_friendly: 'Pet-friendly',
        praia: 'Beach access',
        vista_mar: 'Ocean view',
        centro: 'Central location',
        transfer: 'Airport transfer service',
        room_service: '24-hour room service',
        business: 'Business center',
        kids_club: 'Kids club',
        laundry: 'Laundry service',
      };

      if (amenitiesList.length === 0) {
        return JSON.stringify(
          {
            data: [],
            message: 'We have not cataloged hotel amenities yet.',
            suggestions: [
              'List hotels directly and review their highlights',
              'Ask about hotel categories or budget ranges instead',
            ],
            source: 'hotel_amenities',
            language: 'en',
          },
          null,
          2
        );
      }

      const formatted = amenitiesList.map((amenity) => ({
        code: amenity,
        description: amenityDescriptions[amenity] || amenity,
      }));

      return JSON.stringify(
        {
          data: formatted,
          source: 'hotel_amenities',
          language: 'en',
          suggestions: [
            'Use these amenity codes with list_hotels to filter results',
            'Combine with get_hotel_categories to tailor the experience',
          ],
        },
        null,
        2
      );
    } catch (error) {
      console.error('Error while fetching hotel amenities:', error);
      return JSON.stringify(
        {
          error: true,
          message:
            'I could not list hotel amenities right now. Let me know which comforts matter most and I will search hotels around them.',
          nextSteps: [
            'Share the amenities you are interested in so I can filter hotels manually',
            'Ask about hotel categories or locations instead',
          ],
          language: 'en',
        },
        null,
        2
      );
    }
  },
  {
    name: 'get_hotel_amenities',
    description:
      'Lists amenity codes available across hotels (e.g., wifi, pool, spa, parking). Use this when someone wants to filter hotel searches by specific facilities.',
    schema: z.object({}),
  }
);
