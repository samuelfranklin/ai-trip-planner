/// <reference types="jest" />

jest.mock('../../lib/prisma', () => {
  const hotel = {
    findMany: jest.fn(),
  };
  const category = {
    findMany: jest.fn(),
  };

  return {
    prisma: {
      hotel,
      category,
    },
  };
});

import { searchHotelsTool, getHotelCategoriesTool, getHotelAmenitiesTool } from '../hotel.tools';
import { prisma } from '../../lib/prisma';

type PrismaMock = jest.Mocked<typeof prisma>;
const prismaMock = prisma as unknown as PrismaMock;

describe('hotel tools', () => {
  let originalConsoleError: typeof console.error;
  let consoleErrorMock: jest.Mock;

  beforeAll(() => {
    originalConsoleError = console.error;
    consoleErrorMock = jest.fn();
    console.error = consoleErrorMock as unknown as typeof console.error;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorMock.mockReset();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  describe('searchHotelsTool', () => {
    it('returns formatted hotels when matches exist', async () => {
      (prismaMock.hotel.findMany as jest.Mock).mockResolvedValueOnce([
        {
          hotelId: 'hotel-1',
          name: 'Ocean View Resort',
          city: 'Lisbon',
          address: 'Rua do Sol, 100',
          nightlyRate: 500,
          currency: 'EUR',
          rating: 4.7,
          reviewCount: 320,
          highlights: ['wifi', 'piscina'],
          latitude: 38.7,
          longitude: -9.1,
          distanceToCenter: 1.2,
          distanceToAirport: 10.5,
          refundable: true,
          breakfastIncluded: true,
          cancellationPolicy: 'Free cancellation up to 48h',
          categories: [
            {
              category: {
                id: 'cat-1',
                name: 'Resort',
                slug: 'resort',
              },
            },
          ],
        },
      ]);

      const result = await searchHotelsTool.invoke({ location: 'Lisbon' });
      const payload = JSON.parse(result);

      expect(payload.language).toBe('en');
      expect(payload.data).toHaveLength(1);
      expect(payload.data[0]).toMatchObject({
        name: 'Ocean View Resort',
        nightlyRateLabel: 'EUR 500.00',
        amenities: ['wifi', 'piscina'],
      });
    });

    it('returns guidance when no hotels match', async () => {
      (prismaMock.hotel.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await searchHotelsTool.invoke({ location: 'Atlantis' });
      const payload = JSON.parse(result);

      expect(payload.data).toEqual([]);
      expect(payload.message).toMatch(/couldn't find hotels/i);
      expect(payload.suggestions).toContain('Broaden the price range or remove required amenities');
    });

    it('returns friendly fallback on errors', async () => {
      (prismaMock.hotel.findMany as jest.Mock).mockRejectedValueOnce(new Error('timeout'));

      const result = await searchHotelsTool.invoke({ location: 'Lisbon' });
      const payload = JSON.parse(result);

      expect(payload.error).toBe(true);
      expect(payload.message).toMatch(/ran into an issue retrieving hotels/i);
      expect(payload.nextSteps).toContain('Adjust the filters such as max price or amenities');
    });
  });

  describe('getHotelCategoriesTool', () => {
    it('returns categories when available', async () => {
      (prismaMock.category.findMany as jest.Mock).mockResolvedValueOnce([
        { name: 'Resort', slug: 'resort', description: 'Beachfront stays' },
      ]);

      const result = await getHotelCategoriesTool.invoke({});
      const payload = JSON.parse(result);

      expect(payload.source).toBe('hotel_categories');
      expect(payload.data).toHaveLength(1);
      expect(payload.language).toBe('en');
    });

    it('returns guidance when no categories exist', async () => {
      (prismaMock.category.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await getHotelCategoriesTool.invoke({});
      const payload = JSON.parse(result);

      expect(payload.data).toEqual([]);
      expect(payload.message).toMatch(/do not have hotel categories/i);
      expect(payload.suggestions).toHaveLength(2);
    });

    it('returns friendly fallback on errors', async () => {
      (prismaMock.category.findMany as jest.Mock).mockRejectedValueOnce(new Error('db fail'));

      const result = await getHotelCategoriesTool.invoke({});
      const payload = JSON.parse(result);

      expect(payload.error).toBe(true);
      expect(payload.message).toMatch(/could not load the hotel categories/i);
      expect(payload.nextSteps).toContain('Describe the style of hotel you want so I can tailor the search');
    });
  });

  describe('getHotelAmenitiesTool', () => {
    it('returns amenities list when hotels exist', async () => {
      (prismaMock.hotel.findMany as jest.Mock).mockResolvedValueOnce([
        { highlights: ['wifi', 'piscina'] },
      ]);

      const result = await getHotelAmenitiesTool.invoke({});
      const payload = JSON.parse(result);

      expect(payload.data).toHaveLength(2);
      expect(payload.data[0]).toHaveProperty('code');
      expect(payload.language).toBe('en');
    });

    it('returns guidance when no amenities are cataloged', async () => {
      (prismaMock.hotel.findMany as jest.Mock).mockResolvedValueOnce([{ highlights: [] }]);

      const result = await getHotelAmenitiesTool.invoke({});
      const payload = JSON.parse(result);

      expect(payload.data).toEqual([]);
      expect(payload.message).toMatch(/have not cataloged hotel amenities yet/i);
      expect(payload.suggestions).toHaveLength(2);
    });

    it('returns friendly fallback on errors', async () => {
      (prismaMock.hotel.findMany as jest.Mock).mockRejectedValueOnce(new Error('network'));

      const result = await getHotelAmenitiesTool.invoke({});
      const payload = JSON.parse(result);

      expect(payload.error).toBe(true);
      expect(payload.message).toMatch(/could not list hotel amenities/i);
      expect(payload.nextSteps).toContain('Share the amenities you are interested in so I can filter hotels manually');
    });
  });
});
