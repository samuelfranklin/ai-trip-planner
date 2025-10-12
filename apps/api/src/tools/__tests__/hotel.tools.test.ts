/// <reference types="jest" />

jest.mock('../../lib/prisma', () => {
  const hotel = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  };
  const category = {
    findMany: jest.fn(),
  };
  const hotelBooking = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  return {
    prisma: {
      hotel,
      category,
      hotelBooking,
    },
  };
});

import { listHotelsTool, getHotelCategoriesTool, getHotelAmenitiesTool, bookHotelTool } from '../hotel.tools';
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

  describe('listHotelsTool', () => {
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

      const result = await listHotelsTool.invoke({
        city: 'Lisbon',
        checkin: '2025-10-01',
        checkout: '2025-10-05',
      });
      const payload = JSON.parse(result);

      expect(payload.language).toBe('en');
      expect(payload.data).toHaveLength(1);
      expect(payload.data[0]).toMatchObject({
        name: 'Ocean View Resort',
        nightlyLabel: 'EUR 500.00',
        totalLabel: 'EUR 2000.00',
        summary: {
          checkin: '2025-10-01',
          checkout: '2025-10-05',
          nights: 4,
        },
        amenities: ['wifi', 'piscina'],
      });
      expect(payload.suggestions).toContain('Use book_hotel to reserve a stay by providing hotelId, dates, and guest info');
    });

    it('returns guidance when no hotels match', async () => {
      (prismaMock.hotel.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await listHotelsTool.invoke({
        city: 'Atlantis',
        checkin: '2025-10-01',
        checkout: '2025-10-05',
      });
      const payload = JSON.parse(result);

      expect(payload.data).toEqual([]);
      expect(payload.message).toMatch(/no hotels found/i);
      expect(payload.suggestions).toContain('Broaden the price range or remove required amenities');
    });

    it('returns friendly fallback on errors', async () => {
      (prismaMock.hotel.findMany as jest.Mock).mockRejectedValueOnce(new Error('timeout'));

      const result = await listHotelsTool.invoke({
        city: 'Lisbon',
        checkin: '2025-10-01',
        checkout: '2025-10-05',
      });
      const payload = JSON.parse(result);

      expect(payload.error).toBe(true);
      expect(payload.message).toBe('timeout');
      expect(payload.nextSteps).toContain('Adjust the filters such as amenities or rating');
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

  describe('bookHotelTool', () => {
    it('persists guest phone and structured metadata', async () => {
      (prismaMock.hotel.findUnique as jest.Mock).mockResolvedValueOnce({
        hotelId: 'hotel-sfo-001',
        nightlyRate: 1850,
        currency: 'BRL',
      });
      (prismaMock.hotelBooking.findUnique as jest.Mock).mockResolvedValueOnce(null);

      (prismaMock.hotelBooking.create as jest.Mock).mockResolvedValueOnce({
        id: 'hotel-booking-1',
        reservationId: 'ZXCV1234',
        status: 'BOOKED',
        total: 3700,
        currency: 'BRL',
        guestName: 'João Hóspede',
        guestEmail: 'joao@example.com',
        guestPhone: '+55-31-98888-0000',
        hotelId: 'hotel-sfo-001',
        checkin: new Date('2025-10-01T00:00:00.000Z'),
        checkout: new Date('2025-10-05T23:59:59.999Z'),
        rooms: 1,
        nights: 4,
        adults: 2,
        children: 1,
        specialRequests: 'Crib for toddler',
        metadata: { loyaltyId: 'SF123' },
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmedAt: new Date(),
        canceledAt: null,
        userId: null,
      });

      const result = await bookHotelTool.invoke({
        hotelId: 'hotel-sfo-001',
        checkin: '2025-10-01',
        checkout: '2025-10-05',
        rooms: 1,
        adults: 2,
        children: 1,
        specialRequests: 'Crib for toddler',
        metadata: { loyaltyId: 'SF123' },
        guest: {
          fullName: 'João Hóspede',
          email: 'joao@example.com',
          phone: '+55-31-98888-0000',
        },
      });

      expect(prismaMock.hotelBooking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            guestPhone: '+55-31-98888-0000',
            adults: 2,
            children: 1,
            specialRequests: 'Crib for toddler',
            metadata: { loyaltyId: 'SF123' },
          }),
        }),
      );

      const payload = JSON.parse(result);

      expect(payload).toMatchObject({
        reservationId: 'ZXCV1234',
        adults: 2,
        children: 1,
        specialRequests: 'Crib for toddler',
        metadata: { loyaltyId: 'SF123' },
      });
    });
  });
});
