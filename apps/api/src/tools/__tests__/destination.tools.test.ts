/// <reference types="jest" />

jest.mock("../../lib/prisma", () => {
  const destination = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  };
  const seasonalData = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  };

  return {
    prisma: {
      destination,
      seasonalData,
    },
  };
});

import {
  searchDestinationsTool,
  getSeasonalInfoTool,
} from "../destination.tools";
import { prisma } from "../../lib/prisma";

type PrismaMock = jest.Mocked<typeof prisma>;
const prismaMock = prisma as unknown as PrismaMock;

describe("destination tools", () => {
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

  describe("searchDestinationsTool", () => {
    it("returns formatted destinations when matches are found", async () => {
      (prismaMock.destination.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: "dest-1",
          name: "Paris",
          city: "Paris",
          country: "France",
          shortDescription: "City of lights",
          description: "A beautiful destination in France.",
          bestMonths: [5, 6, 9],
          averageBudget: 1500,
          popularityScore: 95,
          categories: [
            {
              category: {
                id: "cat-1",
                name: "Romantic",
                slug: "romantic",
              },
            },
          ],
        },
      ]);

      const result = await searchDestinationsTool.invoke({ query: "Paris" });
      const payload = JSON.parse(result);

      expect(payload.language).toBe("en");
      expect(payload.source).toBe("destinations");
      expect(payload.data).toHaveLength(1);
      expect(payload.data[0]).toMatchObject({
        name: "Paris",
        categories: [
          {
            id: "cat-1",
            name: "Romantic",
            slug: "romantic",
          },
        ],
      });
      expect(payload.suggestions).toContain(
        "Ask get_seasonal_info for the best months to visit"
      );
    });

    it("tokenizes natural language queries to find relevant destinations", async () => {
      (prismaMock.destination.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: "dest-2",
          name: "Salvador",
          city: "Salvador",
          country: "Brasil",
          shortDescription: null,
          description:
            "Verão vibrante com festas e praias no nordeste brasileiro.",
          bestMonths: [12, 1, 2],
          averageBudget: 1200,
          popularityScore: 88,
          categories: [],
        },
      ]);

      const query = "Quais destinos você recomenda no Brasil para dezembro?";
      const result = await searchDestinationsTool.invoke({ query });
      const payload = JSON.parse(result);

      expect(prismaMock.destination.findMany).toHaveBeenCalled();
      const [callArgs] =
        (prismaMock.destination.findMany as jest.Mock).mock.calls.at(-1) ?? [];
      expect(callArgs.where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            country: expect.objectContaining({
              contains: "brasil",
              mode: "insensitive",
            }),
          }),
          expect.objectContaining({
            description: expect.objectContaining({
              contains: "dezembro",
              mode: "insensitive",
            }),
          }),
        ])
      );

      expect(payload.source).toBe("destinations");
      expect(payload.data[0]).toMatchObject({
        name: "Salvador",
        country: "Brasil",
      });
    });

    it("returns curated fallback destinations when database is empty", async () => {
      (prismaMock.destination.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await searchDestinationsTool.invoke({
        query: "Quais destinos você recomenda no Brasil para dezembro?",
      });

      const payload = JSON.parse(result);

      expect(payload.source).toBe("destinations");
      expect(payload.data.length).toBeGreaterThanOrEqual(1);
      expect(payload.data[0]).toMatchObject({
        country: "Brasil",
      });
      expect(payload.suggestions).toContain(
        "Use list_hotels para explorar estadas no destino selecionado"
      );
    });

    it("returns friendly guidance when no destinations match", async () => {
      (prismaMock.destination.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await searchDestinationsTool.invoke({ query: "Atlantis" });
      const payload = JSON.parse(result);

      expect(payload.data).toEqual([]);
      expect(payload.message).toMatch(/could not find destinations/i);
      expect(payload.suggestions).toHaveLength(3);
    });

    it("returns friendly fallback when an error occurs", async () => {
      (prismaMock.destination.findMany as jest.Mock).mockRejectedValueOnce(
        new Error("db down")
      );

      const result = await searchDestinationsTool.invoke({ query: "Paris" });
      const payload = JSON.parse(result);

      expect(payload.error).toBe(true);
      expect(payload.message).toMatch(/trouble retrieving destinations/i);
      expect(payload.nextSteps).toContain(
        "Clarify the destination name or trip style"
      );
    });
  });

  describe("getSeasonalInfoTool", () => {
    it("returns seasonal data for a specific month when available", async () => {
      (prismaMock.destination.findFirst as jest.Mock).mockResolvedValueOnce({
        id: "dest-1",
        name: "Paris",
        city: "Paris",
        country: "France",
        bestMonths: [5, 6, 9],
      });
      (prismaMock.seasonalData.findUnique as jest.Mock).mockResolvedValueOnce({
        avgTempMin: 10,
        avgTempMax: 20,
        rainyDays: 8,
        weatherDescription: "Mild and pleasant",
        season: "spring",
        priceMultiplier: 1.2,
        crowdLevel: "moderate",
        events: ["Spring festival"],
      });

      const result = await getSeasonalInfoTool.invoke({
        destinationName: "Paris",
        month: 5,
      });
      const payload = JSON.parse(result);

      expect(payload.source).toBe("seasonal");
      expect(payload.data.month).toBe("May");
      expect(payload.data.stats).toMatchObject({
        temperatureMinCelsius: 10,
        temperatureMaxCelsius: 20,
      });
    });

    it("returns year overview when month is not provided", async () => {
      (prismaMock.destination.findFirst as jest.Mock).mockResolvedValueOnce({
        id: "dest-1",
        name: "Paris",
        city: "Paris",
        country: "France",
        bestMonths: [5, 6, 9],
      });
      (prismaMock.seasonalData.findMany as jest.Mock).mockResolvedValueOnce([
        {
          month: 5,
          season: "spring",
          weatherDescription: "Sunny",
          priceMultiplier: 1.1,
        },
      ]);

      const result = await getSeasonalInfoTool.invoke({
        destinationName: "Paris",
      });
      const payload = JSON.parse(result);

      expect(payload.data.destination.name).toBe("Paris");
      expect(payload.data.bestMonths).toEqual(["May", "Jun", "Sep"]);
      expect(payload.data.monthlyOverview).toHaveLength(1);
    });

    it("returns message when destination is not found", async () => {
      (prismaMock.destination.findFirst as jest.Mock).mockResolvedValueOnce(
        null
      );

      const result = await getSeasonalInfoTool.invoke({
        destinationName: "Unknown",
      });
      const payload = JSON.parse(result);

      expect(payload.data).toBeNull();
      expect(payload.message).toMatch(/could not find unknown/i);
    });

    it("returns friendly fallback on error", async () => {
      (prismaMock.destination.findFirst as jest.Mock).mockRejectedValueOnce(
        new Error("timeout")
      );

      const result = await getSeasonalInfoTool.invoke({
        destinationName: "Paris",
      });
      const payload = JSON.parse(result);

      expect(payload.error).toBe(true);
      expect(payload.message).toMatch(/could not load the seasonal details/i);
      expect(payload.nextSteps).toContain(
        "Clarify the destination or month you have in mind"
      );
    });
  });
});
