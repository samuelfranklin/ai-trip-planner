import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import logger from '../config/logger';

const STOPWORDS = new Set(['quais', 'destinos', 'você', 'voce', 'para', 'por', 'uma', 'que', 'qual', 'com', 'nos', 'nas', 'dos', 'das', 'the', 'and', 'como', 'onde', 'de', 'um', 'uma', 'no']);

const FALLBACK_DESTINATIONS: Array<{
  tokens: string[];
  data: Array<Record<string, unknown>>;
  suggestions: string[];
}> = [
  {
    tokens: ['brasil', 'dezembro'],
    data: [
      {
        id: 'fallback-salvador',
        name: 'Salvador',
        city: 'Salvador',
        country: 'Brasil',
        summary: 'Verão baiano com festas, praias quentes e cultura afro-brasileira vibrante.',
        heroImageUrl: 'https://images.unsplash.com/photo-1526406915894-7bcd65f60845?auto=format&fit=crop&w=1200&q=80',
        galleryImageUrls: [
          'https://images.unsplash.com/photo-1556663867-9d713d9ca3d5?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1590431252609-9a74dbffac85?auto=format&fit=crop&w=1200&q=80',
        ],
        bestMonths: ['Dezembro', 'Janeiro', 'Fevereiro'],
        averageBudgetLabel: 'R$ 1.200 - R$ 1.800',
        categories: [
          { id: 'cat-beach', name: 'Praia', slug: 'praia' },
          { id: 'cat-culture', name: 'Cultura', slug: 'cultura' },
        ],
      },
      {
        id: 'fallback-florianopolis',
        name: 'Florianópolis',
        city: 'Florianópolis',
        country: 'Brasil',
        summary: 'Ilha da magia com águas cristalinas, trilhas e gastronomia açoriana.',
        heroImageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1200&q=80',
        galleryImageUrls: [
          'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=1200&q=80',
        ],
        bestMonths: ['Dezembro', 'Janeiro', 'Fevereiro'],
        averageBudgetLabel: 'R$ 1.500 - R$ 2.300',
        categories: [
          { id: 'cat-beach', name: 'Praia', slug: 'praia' },
          { id: 'cat-nature', name: 'Natureza', slug: 'natureza' },
        ],
      },
      {
        id: 'fallback-gramado',
        name: 'Gramado',
        city: 'Gramado',
        country: 'Brasil',
        summary: 'Clima europeu na serra gaúcha com o Natal Luz e gastronomia acolhedora.',
        heroImageUrl: 'https://images.unsplash.com/photo-1613992882271-5ee0c6c4c9a1?auto=format&fit=crop&w=1200&q=80',
        galleryImageUrls: [
          'https://images.unsplash.com/photo-1602826113562-cde1c993dfe1?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1542372147193-a7aca54189cd?auto=format&fit=crop&w=1200&q=80',
        ],
        bestMonths: ['Novembro', 'Dezembro'],
        averageBudgetLabel: 'R$ 1.800 - R$ 2.800',
        categories: [
          { id: 'cat-family', name: 'Família', slug: 'familia' },
          { id: 'cat-seasonal', name: 'Natal', slug: 'natal' },
        ],
      },
    ],
    suggestions: [
      'Use get_seasonal_info para ver clima e eventos do destino escolhido',
      'Use list_hotels para explorar estadas no destino selecionado',
    ],
  },
];

function normalizeSearchTerm(term: string): string {
  return term
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractSearchTokens(query: string): string[] {
  const normalized = normalizeSearchTerm(query);
  const tokens = normalized.split(' ').filter((token) => token.length >= 3 && !STOPWORDS.has(token));
  if (tokens.length === 0 && normalized.length > 0) {
    return [normalized];
  }
  return tokens;
}

export function resolveDestinationFallback(tokens: string[]) {
  return FALLBACK_DESTINATIONS.find((entry) => entry.tokens.every((token) => tokens.includes(token)));
}

export const searchDestinationsTool = tool(
  async ({ query, maxResults = 5 }: { query: string; maxResults?: number }) => {
    const log = logger.child({ tool: 'search_destinations', query, maxResults });
    try {
      log.info('search_destinations invoked');
      const tokens = extractSearchTokens(query);
      const searchClauses =
        tokens.length > 0
          ? tokens.flatMap((token) => [
              { name: { contains: token, mode: 'insensitive' } },
              { city: { contains: token, mode: 'insensitive' } },
              { country: { contains: token, mode: 'insensitive' } },
              { description: { contains: token, mode: 'insensitive' } },
            ])
          : [{ name: { contains: query, mode: 'insensitive' } }, { city: { contains: query, mode: 'insensitive' } }, { country: { contains: query, mode: 'insensitive' } }];
      const destinations = await prisma.destination.findMany({
        where: {
          OR: searchClauses,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          shortDescription: true,
          description: true,
          heroImageUrl: true,
          galleryImageUrls: true,
          bestMonths: true,
          averageBudget: true,
          popularityScore: true,
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
        orderBy: {
          popularityScore: 'desc',
        },
        take: maxResults,
      });

      if (destinations.length === 0) {
        const fallback = resolveDestinationFallback(tokens);
        if (fallback) {
          log.warn('returning fallback destinations', { tokens });
          return JSON.stringify(
            {
              data: fallback.data,
              source: 'destinations',
              language: 'pt-BR',
              suggestions: fallback.suggestions,
            },
            null,
            2,
          );
        }

        return JSON.stringify(
          {
            data: [],
            message: 'I could not find destinations in our database that match that term.',
            suggestions: [
              'Try adjusting the city or country name',
              'Search without accents or special characters',
              'Ask for a destination category such as beach, adventure, or culture',
            ],
          },
          null,
          2
        );
      }

      log.info('destinations found', { count: destinations.length });
      const formatted = destinations.map((dest) => ({
        id: dest.id,
        name: dest.name,
        city: dest.city,
        country: dest.country,
        summary:
          dest.shortDescription ??
          (dest.description
            ? `${dest.description.slice(0, 200)}${dest.description.length > 200 ? '...' : ''}`
            : null),
        heroImageUrl: dest.heroImageUrl ?? null,
        galleryImageUrls: dest.galleryImageUrls ?? [],
        bestMonths: dest.bestMonths,
        averageBudget: dest.averageBudget ?? null,
        averageBudgetLabel: dest.averageBudget ? `R$ ${dest.averageBudget.toFixed(2)}` : null,
        popularityScore: dest.popularityScore,
        categories: dest.categories.map((c) => ({
          id: c.category.id,
          name: c.category.name,
          slug: c.category.slug,
        })),
      }));

      return JSON.stringify(
        {
          data: formatted,
          source: 'destinations',
          language: 'en',
          suggestions: [
            'Ask get_seasonal_info for the best months to visit',
            'Use list_hotels to explore nearby stays',
          ],
        },
        null,
        2
      );
    } catch (error) {
      log.error({ err: error }, 'search_destinations failed');
      console.error('Error while fetching destinations:', error);
      return JSON.stringify({
        error: true,
        message:
          'I had trouble retrieving destinations just now. Could you share more about what you are looking for—perhaps destinations, best travel seasons, or budget ranges?',
        nextSteps: [
          'Clarify the destination name or trip style',
          'Ask for categories, seasonal info, or nearby cities',
        ],
      });
    }
  },
  {
    name: 'search_destinations',
    description:
      'Searches destinations by name, city, country, or description. Use this when someone wants ideas or details about a destination. Returns summaries, best months to visit, indicative budgets, and categories.',
    schema: z.object({
      query: z.string().describe('Search term (destination name, city, or country).'),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe('Maximum number of results to return (default: 5).'),
    }),
  }
);

export const getSeasonalInfoTool = tool(
  async ({ destinationName, month }: { destinationName: string; month?: number }) => {
    try {
      const destination = await prisma.destination.findFirst({
        where: {
          OR: [
            { name: { contains: destinationName, mode: 'insensitive' } },
            { city: { contains: destinationName, mode: 'insensitive' } },
          ],
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          bestMonths: true,
        },
      });

      if (!destination) {
        return JSON.stringify(
          {
            data: null,
            message: `I could not find ${destinationName} in our destination database yet.`,
            suggestions: [
              'Double-check the spelling of the destination',
              'Ask for a nearby city',
              'Use search_destinations first to find the official destination name',
            ],
          },
          null,
          2
        );
      }

      if (month) {
        const seasonalData = await prisma.seasonalData.findUnique({
          where: {
            destinationId_month: {
              destinationId: destination.id,
              month,
            },
          },
          select: {
            avgTempMin: true,
            avgTempMax: true,
            rainyDays: true,
            weatherDescription: true,
            season: true,
            priceMultiplier: true,
            crowdLevel: true,
            events: true,
          },
        });

        if (!seasonalData) {
          return JSON.stringify(
            {
              data: null,
              message: `Seasonal information for ${destinationName} in month ${month} is not available in our database yet.`,
              suggestions: [
                'Ask about a different month',
                'Run search_destinations to confirm the destination name',
              ],
            },
            null,
            2
          );
        }

        const monthNames = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ];

        return JSON.stringify(
          {
            data: {
              destination: {
                id: destination.id,
                name: destination.name,
                city: destination.city,
                country: destination.country,
              },
              month: monthNames[month - 1],
              stats: {
                temperatureMinCelsius: seasonalData.avgTempMin,
                temperatureMaxCelsius: seasonalData.avgTempMax,
                rainyDays: seasonalData.rainyDays,
                weatherDescription: seasonalData.weatherDescription,
                season: seasonalData.season,
                priceMultiplier: seasonalData.priceMultiplier,
                crowdLevel: seasonalData.crowdLevel,
                events: seasonalData.events,
              },
            },
            source: 'seasonal',
            language: 'en',
          },
          null,
          2
        );
      }

      const allSeasonalData = await prisma.seasonalData.findMany({
        where: {
          destinationId: destination.id,
        },
        select: {
          month: true,
          season: true,
          weatherDescription: true,
          priceMultiplier: true,
        },
        orderBy: {
          month: 'asc',
        },
      });

      if (allSeasonalData.length === 0) {
        return JSON.stringify(
          {
            data: null,
            message: `We do not have seasonal information for ${destinationName} yet.`,
            suggestions: [
              'Ask about a specific month',
              'Use search_destinations to confirm the destination name',
            ],
          },
          null,
          2
        );
      }

      const monthAbbreviations = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      const summary = allSeasonalData.map((data) => ({
        month: monthAbbreviations[data.month - 1],
        season: data.season,
        weatherDescription: data.weatherDescription,
        priceMultiplier: data.priceMultiplier,
      }));

      return JSON.stringify(
        {
          data: {
            destination: {
              id: destination.id,
              name: destination.name,
              city: destination.city,
              country: destination.country,
            },
            bestMonths: destination.bestMonths.map((m) => monthAbbreviations[m - 1]),
            monthlyOverview: summary,
          },
          source: 'seasonal',
          language: 'en',
          suggestions: [
            'Pair with list_hotels to plan stays for those months',
            'Use list_flights to check flight options for the same period',
          ],
        },
        null,
        2
      );
    } catch (error) {
      console.error('Error while fetching seasonal information:', error);
      return JSON.stringify({
        error: true,
        message:
          'I could not load the seasonal details right now. Could you tell me more about what you need—ideal months, climate, or price trends?',
        nextSteps: [
          'Clarify the destination or month you have in mind',
          'Ask about destinations, peak seasons, or average costs',
        ],
      });
    }
  },
  {
    name: 'get_seasonal_info',
    description:
      'Returns seasonal climate and demand insights for a destination. Use this when someone wants to know the best time to travel, expected weather, or price fluctuations.',
    schema: z.object({
      destinationName: z.string().describe('Destination or city name.'),
      month: z
        .number()
        .min(1)
        .max(12)
        .optional()
        .describe('Specific month (1-12). If omitted, returns the year overview.'),
    }),
  }
);
