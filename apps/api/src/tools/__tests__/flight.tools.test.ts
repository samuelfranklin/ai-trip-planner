/// <reference types="jest" />

jest.mock("../../lib/prisma", () => {
  const airport = {
    findMany: jest.fn(),
  };
  const flightItinerary = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  };
  const flightBooking = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  return {
    prisma: {
      airport,
      flightItinerary,
      flightBooking,
    },
  };
});

import {
  listFlightsTool,
  getAirportInfoTool,
  bookFlightTool,
} from "../flight.tools";
import { prisma } from "../../lib/prisma";

type PrismaMock = jest.Mocked<typeof prisma>;
const prismaMock = prisma as unknown as PrismaMock;

describe("flight tools", () => {
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

  describe("listFlightsTool", () => {
    it("returns itineraries when flights are available", async () => {
      (prismaMock.airport.findMany as jest.Mock)
        .mockResolvedValueOnce([
          {
            iataCode: "GRU",
            name: "Guarulhos",
            city: "São Paulo",
            country: "Brazil",
          },
        ])
        .mockResolvedValueOnce([
          {
            iataCode: "LIS",
            name: "Humberto Delgado",
            city: "Lisbon",
            country: "Portugal",
          },
        ]);
      (prismaMock.flightItinerary.findMany as jest.Mock).mockResolvedValueOnce([
        {
          itineraryId: "itin-1",
          origin: "GRU",
          destination: "LIS",
          airline: "TAP",
          totalPrice: 3200,
          currency: "BRL",
          stops: 0,
          returnDate: new Date("2025-01-20T00:00:00.000Z"),
          departDate: new Date("2025-01-10T00:00:00.000Z"),
          baggageIncluded: true,
          outboundSegments: [{ flightNumber: "TP88" }],
          inboundSegments: [{ flightNumber: "TP89" }],
          originAirport: {
            iataCode: "GRU",
            city: "São Paulo",
            name: "Guarulhos",
          },
          destinationAirport: {
            iataCode: "LIS",
            city: "Lisbon",
            name: "Humberto Delgado",
          },
        },
      ]);

      const result = await listFlightsTool.invoke({
        origin: "GRU",
        destination: "LIS",
        departDate: "2025-01-10",
        returnDate: "2025-01-20",
      });
      const payload = JSON.parse(result);

      expect(payload.language).toBe("en");
      expect(payload.data).toHaveLength(1);
      expect(payload.data[0]).toMatchObject({
        itineraryId: "itin-1",
        totalLabel: "BRL 3200.00",
      });
      expect(payload.suggestions).toContain(
        "Ask book_flight to lock a seat using an itineraryId"
      );
    });

    it("returns guidance when origin airports are missing", async () => {
      (prismaMock.airport.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            iataCode: "LIS",
            name: "Humberto Delgado",
            city: "Lisbon",
            country: "Portugal",
          },
        ]);

      const result = await listFlightsTool.invoke({
        origin: "AAA",
        destination: "LIS",
        departDate: "2025-01-10",
      });
      const payload = JSON.parse(result);

      expect(payload.data).toEqual([]);
      expect(payload.message).toMatch(/no airports found for origin/i);
      expect(payload.suggestions).toContain(
        "Double-check the city or IATA code"
      );
    });

    it("returns guidance when flights are not found", async () => {
      (prismaMock.airport.findMany as jest.Mock)
        .mockResolvedValueOnce([
          {
            iataCode: "GRU",
            name: "Guarulhos",
            city: "São Paulo",
            country: "Brazil",
          },
        ])
        .mockResolvedValueOnce([
          {
            iataCode: "LIS",
            name: "Humberto Delgado",
            city: "Lisbon",
            country: "Portugal",
          },
        ]);
      (prismaMock.flightItinerary.findMany as jest.Mock).mockResolvedValueOnce(
        []
      );

      const result = await listFlightsTool.invoke({
        origin: "GRU",
        destination: "LIS",
        departDate: "2025-01-10",
      });
      const payload = JSON.parse(result);

      expect(payload.data).toEqual([]);
      expect(payload.message).toMatch(/no flights found/i);
      expect(payload.suggestions).toHaveLength(3);
    });

    it("returns friendly fallback on errors", async () => {
      (prismaMock.airport.findMany as jest.Mock).mockRejectedValueOnce(
        new Error("network")
      );

      const result = await listFlightsTool.invoke({
        origin: "GRU",
        destination: "LIS",
        departDate: "2025-01-10",
      });
      const payload = JSON.parse(result);

      expect(payload.error).toBe(true);
      expect(payload.message).toBe("network");
      expect(payload.nextSteps).toContain(
        "Ensure origin/destination inputs are valid cities or IATA codes"
      );
    });
  });

  it("falls back to structured itineraries for known corridors when DB has no flights", async () => {
    (prismaMock.airport.findMany as jest.Mock)
      .mockResolvedValueOnce([
        { iataCode: "CNF", name: "Tancredo Neves", city: "Belo Horizonte" },
      ])
      .mockResolvedValueOnce([]);
    (prismaMock.flightItinerary.findMany as jest.Mock).mockResolvedValueOnce(
      []
    );

    const result = await listFlightsTool.invoke({
      origin: "Belo Horizonte (CNF)",
      destination: "San Francisco (SFO)",
      departDate: "2025-10-01",
      returnDate: "2025-10-10",
      adults: 2,
    });

    const payload = JSON.parse(result);

    expect(payload.source).toBe("flights");
    expect(payload.data).toHaveLength(2);
    expect(payload.data[0].summary).toMatchObject({
      origin: expect.objectContaining({ code: "CNF", city: "Belo Horizonte" }),
      destination: expect.objectContaining({
        code: "SFO",
        city: "San Francisco",
      }),
      departDate: "2025-10-01",
      returnDate: "2025-10-10",
      adults: 2,
    });
    expect(Array.isArray(payload.data[0].outbound)).toBe(true);
    expect(payload.data[0].outbound.length).toBeGreaterThan(0);
  });

  describe("bookFlightTool", () => {
    it("persists extended metadata and returns a ticketed booking", async () => {
      (
        prismaMock.flightItinerary.findUnique as jest.Mock
      ).mockResolvedValueOnce({
        itineraryId: "FLT-CNF-SFO-20251001-001",
        totalPrice: 4850,
        currency: "BRL",
      });

      (prismaMock.flightBooking.findUnique as jest.Mock).mockResolvedValueOnce(
        null
      );

      (prismaMock.flightBooking.create as jest.Mock).mockResolvedValueOnce({
        id: "booking-1",
        pnr: "ABC123",
        status: "TICKETED",
        total: 4850,
        currency: "BRL",
        passengerName: "Maria Passenger",
        passengerEmail: "maria@example.com",
        passengerPhone: "+55-31-99999-0000",
        adults: 2,
        seatClass: "business",
        fareBasis: "J7NR",
        specialRequests: "Vegetarian meal",
        metadata: { corporateCode: "ACME" },
        itineraryId: "FLT-CNF-SFO-20251001-001",
        createdAt: new Date(),
        updatedAt: new Date(),
        ticketedAt: new Date(),
        canceledAt: null,
        userId: null,
      });

      const result = await bookFlightTool.invoke({
        itineraryId: "FLT-CNF-SFO-20251001-001",
        adults: 2,
        seatClass: "business",
        fareBasis: "J7NR",
        specialRequests: "Vegetarian meal",
        metadata: { corporateCode: "ACME" },
        passenger: {
          fullName: "Maria Passenger",
          email: "maria@example.com",
          phone: "+55-31-99999-0000",
        },
      });

      expect(prismaMock.flightBooking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passengerPhone: "+55-31-99999-0000",
            adults: 2,
            seatClass: "business",
            fareBasis: "J7NR",
            specialRequests: "Vegetarian meal",
            metadata: { corporateCode: "ACME" },
          }),
        })
      );

      const payload = JSON.parse(result);

      expect(payload).toMatchObject({
        pnr: "ABC123",
        adults: 2,
        seatClass: "business",
        specialRequests: "Vegetarian meal",
        metadata: { corporateCode: "ACME" },
      });
    });
  });

  describe("getAirportInfoTool", () => {
    it("returns airport metadata when matches exist", async () => {
      (prismaMock.airport.findMany as jest.Mock).mockResolvedValueOnce([
        {
          iataCode: "LIS",
          name: "Humberto Delgado",
          city: "Lisbon",
          country: "Portugal",
          isInternational: true,
          latitude: 38.7742,
          longitude: -9.1342,
          alternativeAirports: ["OPO"],
          popularityScore: 80,
        },
      ]);

      const result = await getAirportInfoTool.invoke({ query: "Lisbon" });
      const payload = JSON.parse(result);

      expect(payload.language).toBe("en");
      expect(payload.data[0]).toMatchObject({
        code: "LIS",
        international: true,
      });
    });

    it("returns guidance when no airports match", async () => {
      (prismaMock.airport.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await getAirportInfoTool.invoke({ query: "Atlantis" });
      const payload = JSON.parse(result);

      expect(payload.data).toEqual([]);
      expect(payload.message).toMatch(/couldn't find any airports/i);
      expect(payload.suggestions).toContain(
        "Provide the airport IATA code if you know it"
      );
    });

    it("returns friendly fallback on errors", async () => {
      (prismaMock.airport.findMany as jest.Mock).mockRejectedValueOnce(
        new Error("timeout")
      );

      const result = await getAirportInfoTool.invoke({ query: "Lisbon" });
      const payload = JSON.parse(result);

      expect(payload.error).toBe(true);
      expect(payload.message).toMatch(
        /had trouble retrieving airport details/i
      );
      expect(payload.nextSteps).toContain(
        "Share the airport code, city, or nearby country"
      );
    });
  });
});
