import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

/**
 * Tool to search hotels.
 */
export const searchHotelsTool = tool(
  async ({
    location,
    maxResults = 10,
    maxPrice,
    minRating,
    amenities,
    sortBy = 'rating',
  }: {
    location: string;
    maxResults?: number;
    maxPrice?: number;
    minRating?: number;
    amenities?: string[];
    sortBy?: 'rating' | 'price';
  }) => {
    try {
      const whereClause: any = {
        OR: [
          { city: { contains: location, mode: 'insensitive' } },
          { name: { contains: location, mode: 'insensitive' } },
        ],
        isActive: true,
      };

      if (maxPrice) {
        whereClause.nightlyRate = { lte: maxPrice };
      }

      if (minRating) {
        whereClause.rating = { gte: minRating };
      }

      if (amenities && amenities.length > 0) {
        whereClause.highlights = { hasEvery: amenities };
      }

      const hotels = await prisma.hotel.findMany({
        where: whereClause,
        select: {
          hotelId: true,
          name: true,
          city: true,
          address: true,
          nightlyRate: true,
          currency: true,
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
        orderBy:
          sortBy === 'rating'
            ? { rating: 'desc' }
            : { nightlyRate: 'asc' },
        take: maxResults,
      });

      if (hotels.length === 0) {
        return JSON.stringify(
          {
            data: [],
            message: `I couldn't find hotels in "${location}" that match those filters just yet.`,
            suggestions: [
              'Broaden the price range or remove required amenities',
              'Try searching a nearby city or neighborhood',
              'Call get_hotel_categories to see available property styles',
            ],
            source: 'hotels',
            language: 'en',
          },
          null,
          2
        );
      }

      const formatted = hotels.map((hotel) => ({
        id: hotel.hotelId,
        name: hotel.name,
        city: hotel.city,
        address: hotel.address,
        nightlyRate: hotel.nightlyRate,
  nightlyRateLabel: `${hotel.currency ?? 'BRL'} ${hotel.nightlyRate.toFixed(2)}`,
        currency: hotel.currency,
        rating: hotel.rating,
        reviewCount: hotel.reviewCount,
        amenities: hotel.highlights,
        categories: hotel.categories.map((c) => ({
          id: c.category.id,
          name: c.category.name,
          slug: c.category.slug,
        })),
        coordinates:
          hotel.latitude && hotel.longitude
            ? {
                latitude: Number(hotel.latitude.toFixed(4)),
                longitude: Number(hotel.longitude.toFixed(4)),
              }
            : null,
        distanceToCenterKm: hotel.distanceToCenter,
        distanceToAirportKm: hotel.distanceToAirport,
        refundable: hotel.refundable,
        breakfastIncluded: hotel.breakfastIncluded,
        cancellationPolicy: hotel.cancellationPolicy,
      }));

      return JSON.stringify(
        {
          data: formatted,
          source: 'hotels',
          language: 'en',
          suggestions: [
            'Ask get_hotel_amenities for specific facilities',
            'Use get_hotel_categories to narrow by property style',
          ],
        },
        null,
        2
      );
    } catch (error) {
      console.error('Error while searching hotels:', error);
      return JSON.stringify(
        {
          error: true,
          message:
            'I ran into an issue retrieving hotels. Could you tell me more about your destination, price range, or must-have amenities?',
          nextSteps: [
            'Adjust the filters such as max price or amenities',
            'Share the exact neighborhood or landmark you care about',
            'Ask about categories or amenities first to refine the search',
          ],
          language: 'en',
        },
        null,
        2
      );
    }
  },
  {
    name: 'search_hotels',
    description:
      'Searches hotels by city, country, or property name. Supports filters for nightly price, minimum rating, mandatory amenities, and sorting by rating or price. Use this when someone needs lodging suggestions or wants to compare places to stay.',
    schema: z.object({
      location: z
        .string()
        .describe('City, country, or hotel name to search for.'),
      maxResults: z
        .number()
        .optional()
        .default(10)
        .describe('Maximum number of results to return (default: 10).'),
      maxPrice: z
        .number()
        .optional()
        .describe('Maximum nightly rate in BRL (e.g., 500).'),
      minRating: z
        .number()
        .optional()
        .describe('Minimum rating from 0 to 5 (e.g., 4.0).'),
      amenities: z
        .array(z.string())
        .optional()
        .describe(
          "List of required amenities (e.g., ['wifi', 'pool', 'parking'])."
        ),
      sortBy: z
        .enum(['rating', 'price'])
        .optional()
        .default('rating')
        .describe("Sort by 'rating' or 'price'."),
    }),
  }
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
              'Ask search_hotels directly with your preferred style',
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
            'Use search_hotels with one of these categories to filter results',
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
              'Search hotels directly and review their highlights',
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
            'Use these amenity codes with search_hotels to filter results',
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
