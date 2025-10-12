/// <reference types="jest" />

jest.mock('../../lib/prisma', () => {
  const airport = {
    findMany: jest.fn(),
  };
  const flightItinerary = {
    findMany: jest.fn(),
  };

  return {
    prisma: {
      airport,
      flightItinerary,
    },
  };
});

import { searchFlightsTool, getAirportInfoTool } from '../flight.tools';
import { prisma } from '../../lib/prisma';

type PrismaMock = jest.Mocked<typeof prisma>;
const prismaMock = prisma as unknown as PrismaMock;

describe('flight tools', () => {
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

  describe('searchFlightsTool', () => {
    it('returns itineraries when flights are available', async () => {
      (prismaMock.airport.findMany as jest.Mock)
        .mockResolvedValueOnce([
          { iataCode: 'GRU', name: 'Guarulhos', city: 'São Paulo', country: 'Brazil' },
        ])
        .mockResolvedValueOnce([
          { iataCode: 'LIS', name: 'Humberto Delgado', city: 'Lisbon', country: 'Portugal' },
        ]);
      (prismaMock.flightItinerary.findMany as jest.Mock).mockResolvedValueOnce([
        {
          itineraryId: 'itin-1',
          origin: 'GRU',
          destination: 'LIS',
          airline: 'TAP',
          totalPrice: 3200,
          stops: 0,
          returnDate: new Date('2025-01-20T00:00:00.000Z'),
          departDate: new Date('2025-01-10T00:00:00.000Z'),
          baggageIncluded: true,
          outboundSegments: [{ flightNumber: 'TP88' }],
          inboundSegments: [{ flightNumber: 'TP89' }],
          originAirport: {
            iataCode: 'GRU',
            city: 'São Paulo',
            name: 'Guarulhos',
          },
          destinationAirport: {
            iataCode: 'LIS',
            city: 'Lisbon',
            name: 'Humberto Delgado',
          },
        },
      ]);

      const result = await searchFlightsTool.invoke({ origin: 'GRU', destination: 'LIS' });
      const payload = JSON.parse(result);

      expect(payload.language).toBe('en');
      expect(payload.data).toHaveLength(1);
      expect(payload.data[0]).toMatchObject({
        origin: { code: 'GRU' },
        destination: { code: 'LIS' },
        totalPriceLabel: 'R$ 3200.00',
      });
      expect(payload.suggestions).toContain('Run search_hotels to compare nearby stays');
    });

    it('returns guidance when origin airports are missing', async () => {
      (prismaMock.airport.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { iataCode: 'LIS', name: 'Humberto Delgado', city: 'Lisbon', country: 'Portugal' },
        ]);

      const result = await searchFlightsTool.invoke({ origin: 'AAA', destination: 'LIS' });
      const payload = JSON.parse(result);

      expect(payload.data).toEqual([]);
      expect(payload.message).toMatch(/couldn't find any airports for the origin/i);
      expect(payload.suggestions).toContain('Double-check the IATA code or city name');
    });

    it('returns guidance when flights are not found', async () => {
      (prismaMock.airport.findMany as jest.Mock)
        .mockResolvedValueOnce([
          { iataCode: 'GRU', name: 'Guarulhos', city: 'São Paulo', country: 'Brazil' },
        ])
        .mockResolvedValueOnce([
          { iataCode: 'LIS', name: 'Humberto Delgado', city: 'Lisbon', country: 'Portugal' },
        ]);
      (prismaMock.flightItinerary.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await searchFlightsTool.invoke({ origin: 'GRU', destination: 'LIS' });
      const payload = JSON.parse(result);

      expect(payload.data).toEqual([]);
      expect(payload.message).toMatch(/couldn't find flights/i);
      expect(payload.suggestions).toHaveLength(3);
    });

    it('returns friendly fallback on errors', async () => {
      (prismaMock.airport.findMany as jest.Mock).mockRejectedValueOnce(new Error('network'));

      const result = await searchFlightsTool.invoke({ origin: 'GRU', destination: 'LIS' });
      const payload = JSON.parse(result);

      expect(payload.error).toBe(true);
      expect(payload.message).toMatch(/ran into an issue while fetching flights/i);
      expect(payload.nextSteps).toContain('Confirm the origin and destination details');
    });
  });

  describe('getAirportInfoTool', () => {
    it('returns airport metadata when matches exist', async () => {
      (prismaMock.airport.findMany as jest.Mock).mockResolvedValueOnce([
        {
          iataCode: 'LIS',
          name: 'Humberto Delgado',
          city: 'Lisbon',
          country: 'Portugal',
          isInternational: true,
          latitude: 38.7742,
          longitude: -9.1342,
          alternativeAirports: ['OPO'],
          popularityScore: 80,
        },
      ]);

      const result = await getAirportInfoTool.invoke({ query: 'Lisbon' });
      const payload = JSON.parse(result);

      expect(payload.language).toBe('en');
      expect(payload.data[0]).toMatchObject({
        code: 'LIS',
        international: true,
      });
    });

    it('returns guidance when no airports match', async () => {
      (prismaMock.airport.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await getAirportInfoTool.invoke({ query: 'Atlantis' });
      const payload = JSON.parse(result);

      expect(payload.data).toEqual([]);
      expect(payload.message).toMatch(/couldn't find any airports/i);
      expect(payload.suggestions).toContain('Provide the airport IATA code if you know it');
    });

    it('returns friendly fallback on errors', async () => {
      (prismaMock.airport.findMany as jest.Mock).mockRejectedValueOnce(new Error('timeout'));

      const result = await getAirportInfoTool.invoke({ query: 'Lisbon' });
      const payload = JSON.parse(result);

      expect(payload.error).toBe(true);
      expect(payload.message).toMatch(/had trouble retrieving airport details/i);
      expect(payload.nextSteps).toContain('Share the airport code, city, or nearby country');
    });
  });
});
