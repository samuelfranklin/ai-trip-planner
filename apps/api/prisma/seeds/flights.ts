import { PrismaClient } from '../../src/generated/prisma';
import { addDays } from 'date-fns';

export async function seedFlights(prisma: PrismaClient) {
  console.log('✈️  Seeding flight itineraries...');

  const today = new Date();
  const futureDate = addDays(today, 30);
  const returnDate = addDays(futureDate, 7);
  const cnfToSfoDepart = new Date('2025-10-01T11:30:00.000Z');
  const cnfToSfoReturn = new Date('2025-10-10T18:05:00.000Z');
  const regionalDepart = addDays(today, 40);
  const regionalReturn = addDays(regionalDepart, 5);
  const beachDepart = addDays(today, 50);
  const beachReturn = addDays(beachDepart, 7);
  const adventureDepart = addDays(today, 55);
  const adventureReturn = addDays(adventureDepart, 7);
  const longHaulDepart = addDays(today, 70);
  const longHaulReturn = addDays(longHaulDepart, 10);
  const ultraLongDepart = addDays(today, 90);
  const ultraLongReturn = addDays(ultraLongDepart, 14);
  const islandEscapeDepart = addDays(today, 100);
  const islandEscapeReturn = addDays(islandEscapeDepart, 12);

  const flights = [
    // Voos Domésticos Brasil
    {
      itineraryId: 'FLT-GRU-GIG-001',
      origin: 'GRU',
      destination: 'GIG',
      departDate: futureDate,
      returnDate: returnDate,
      airline: 'LATAM Airlines',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 850.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '08:00', date: futureDate.toISOString() },
          arrival: { airport: 'GIG', time: '09:15', date: futureDate.toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA3090',
          duration: 75,
          aircraft: 'Airbus A320'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'GIG', time: '18:30', date: returnDate.toISOString() },
          arrival: { airport: 'GRU', time: '19:45', date: returnDate.toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA3105',
          duration: 75,
          aircraft: 'Airbus A320'
        }
      ],
      popularityScore: 95,
      comfortScore: 8,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-GRU-SSA-001',
      origin: 'GRU',
      destination: 'SSA',
      departDate: futureDate,
      returnDate: returnDate,
      airline: 'Gol Linhas Aéreas',
      stops: 0,
      baggageIncluded: false,
      totalPrice: 720.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '10:30', date: futureDate.toISOString() },
          arrival: { airport: 'SSA', time: '13:15', date: futureDate.toISOString() },
          airline: 'Gol Linhas Aéreas',
          flightNumber: 'G31524',
          duration: 165,
          aircraft: 'Boeing 737'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'SSA', time: '14:00', date: returnDate.toISOString() },
          arrival: { airport: 'GRU', time: '16:45', date: returnDate.toISOString() },
          airline: 'Gol Linhas Aéreas',
          flightNumber: 'G31529',
          duration: 165,
          aircraft: 'Boeing 737'
        }
      ],
      popularityScore: 88,
      comfortScore: 7,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-GRU-REC-001',
      origin: 'GRU',
      destination: 'REC',
      departDate: futureDate,
      returnDate: returnDate,
      airline: 'Azul Linhas Aéreas',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 980.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '07:15', date: futureDate.toISOString() },
          arrival: { airport: 'REC', time: '10:30', date: futureDate.toISOString() },
          airline: 'Azul Linhas Aéreas',
          flightNumber: 'AD2745',
          duration: 195,
          aircraft: 'Airbus A320neo'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'REC', time: '19:00', date: returnDate.toISOString() },
          arrival: { airport: 'GRU', time: '22:15', date: returnDate.toISOString() },
          airline: 'Azul Linhas Aéreas',
          flightNumber: 'AD2750',
          duration: 195,
          aircraft: 'Airbus A320neo'
        }
      ],
      popularityScore: 85,
      comfortScore: 8,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-GRU-FOR-001',
      origin: 'GRU',
      destination: 'FOR',
      departDate: futureDate,
      returnDate: returnDate,
      airline: 'LATAM Airlines',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 1050.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '09:00', date: futureDate.toISOString() },
          arrival: { airport: 'FOR', time: '12:30', date: futureDate.toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA3234',
          duration: 210,
          aircraft: 'Boeing 767'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'FOR', time: '16:00', date: returnDate.toISOString() },
          arrival: { airport: 'GRU', time: '19:30', date: returnDate.toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA3239',
          duration: 210,
          aircraft: 'Boeing 767'
        }
      ],
      popularityScore: 82,
      comfortScore: 8,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-GRU-FLN-001',
      origin: 'GRU',
      destination: 'FLN',
      departDate: futureDate,
      returnDate: returnDate,
      airline: 'Gol Linhas Aéreas',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 620.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '13:00', date: futureDate.toISOString() },
          arrival: { airport: 'FLN', time: '14:30', date: futureDate.toISOString() },
          airline: 'Gol Linhas Aéreas',
          flightNumber: 'G31789',
          duration: 90,
          aircraft: 'Boeing 737'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'FLN', time: '15:30', date: returnDate.toISOString() },
          arrival: { airport: 'GRU', time: '17:00', date: returnDate.toISOString() },
          airline: 'Gol Linhas Aéreas',
          flightNumber: 'G31794',
          duration: 90,
          aircraft: 'Boeing 737'
        }
      ],
      popularityScore: 86,
      comfortScore: 7,
      layoverQuality: 'excellent',
    },

    // Voos Internacionais - América do Sul
    {
      itineraryId: 'FLT-GRU-EZE-001',
      origin: 'GRU',
      destination: 'EZE',
      departDate: futureDate,
      returnDate: returnDate,
      airline: 'Aerolíneas Argentinas',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 1450.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '11:00', date: futureDate.toISOString() },
          arrival: { airport: 'EZE', time: '14:30', date: futureDate.toISOString() },
          airline: 'Aerolíneas Argentinas',
          flightNumber: 'AR1230',
          duration: 210,
          aircraft: 'Airbus A330'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'EZE', time: '16:00', date: returnDate.toISOString() },
          arrival: { airport: 'GRU', time: '19:30', date: returnDate.toISOString() },
          airline: 'Aerolíneas Argentinas',
          flightNumber: 'AR1235',
          duration: 210,
          aircraft: 'Airbus A330'
        }
      ],
      popularityScore: 93,
      comfortScore: 8,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-GRU-SCL-001',
      origin: 'GRU',
      destination: 'SCL',
      departDate: futureDate,
      returnDate: returnDate,
      airline: 'LATAM Airlines',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 1680.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '23:30', date: futureDate.toISOString() },
          arrival: { airport: 'SCL', time: '04:45', date: addDays(futureDate, 1).toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA801',
          duration: 315,
          aircraft: 'Boeing 787'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'SCL', time: '12:30', date: returnDate.toISOString() },
          arrival: { airport: 'GRU', time: '17:45', date: returnDate.toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA800',
          duration: 315,
          aircraft: 'Boeing 787'
        }
      ],
      popularityScore: 91,
      comfortScore: 9,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-GRU-LIM-001',
      origin: 'GRU',
      destination: 'LIM',
      departDate: futureDate,
      returnDate: returnDate,
      airline: 'LATAM Airlines',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 1820.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '22:15', date: futureDate.toISOString() },
          arrival: { airport: 'LIM', time: '02:30', date: addDays(futureDate, 1).toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA2465',
          duration: 315,
          aircraft: 'Airbus A320'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'LIM', time: '04:00', date: returnDate.toISOString() },
          arrival: { airport: 'GRU', time: '10:15', date: returnDate.toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA2460',
          duration: 315,
          aircraft: 'Airbus A320'
        }
      ],
      popularityScore: 84,
      comfortScore: 8,
      layoverQuality: 'good',
    },

    // Voos Especiais - Desafio CNF -> SFO (round-trip)
    {
      itineraryId: 'FLT-CNF-SFO-20251001-001',
      origin: 'CNF',
      destination: 'SFO',
      departDate: cnfToSfoDepart,
      returnDate: cnfToSfoReturn,
      airline: 'United Airlines',
      stops: 1,
      baggageIncluded: true,
      totalPrice: 4850.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'CNF', time: '08:30', date: '2025-10-01T11:30:00.000Z' },
          arrival: { airport: 'IAH', time: '13:00', date: '2025-10-01T18:00:00.000Z' },
          airline: 'United Airlines',
          flightNumber: 'UA874',
          duration: 330,
          aircraft: 'Boeing 767-300',
        },
        {
          departure: { airport: 'IAH', time: '15:05', date: '2025-10-01T20:05:00.000Z' },
          arrival: { airport: 'SFO', time: '17:40', date: '2025-10-02T00:40:00.000Z' },
          airline: 'United Airlines',
          flightNumber: 'UA2093',
          duration: 275,
          aircraft: 'Boeing 737 MAX 9',
        },
      ],
      inboundSegments: [
        {
          departure: { airport: 'SFO', time: '09:25', date: '2025-10-10T16:25:00.000Z' },
          arrival: { airport: 'IAH', time: '15:35', date: '2025-10-10T21:35:00.000Z' },
          airline: 'United Airlines',
          flightNumber: 'UA2368',
          duration: 250,
          aircraft: 'Boeing 737 MAX 9',
        },
        {
          departure: { airport: 'IAH', time: '18:05', date: '2025-10-10T23:05:00.000Z' },
          arrival: { airport: 'CNF', time: '05:45', date: '2025-10-11T08:45:00.000Z' },
          airline: 'United Airlines',
          flightNumber: 'UA875',
          duration: 520,
          aircraft: 'Boeing 767-300',
        },
      ],
      popularityScore: 92,
      comfortScore: 8,
      layoverQuality: 'good',
    },
    {
      itineraryId: 'FLT-CNF-SFO-20251001-002',
      origin: 'CNF',
      destination: 'SFO',
      departDate: cnfToSfoDepart,
      returnDate: cnfToSfoReturn,
      airline: 'LATAM + Delta',
      stops: 2,
      baggageIncluded: true,
      totalPrice: 4580.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'CNF', time: '07:15', date: '2025-10-01T10:15:00.000Z' },
          arrival: { airport: 'GRU', time: '08:25', date: '2025-10-01T11:25:00.000Z' },
          airline: 'LATAM Airlines',
          flightNumber: 'LA3445',
          duration: 70,
          aircraft: 'Airbus A321',
        },
        {
          departure: { airport: 'GRU', time: '10:45', date: '2025-10-01T13:45:00.000Z' },
          arrival: { airport: 'ATL', time: '18:05', date: '2025-10-01T22:05:00.000Z' },
          airline: 'Delta Air Lines',
          flightNumber: 'DL104',
          duration: 500,
          aircraft: 'Airbus A330-900neo',
        },
        {
          departure: { airport: 'ATL', time: '20:55', date: '2025-10-02T00:55:00.000Z' },
          arrival: { airport: 'SFO', time: '23:15', date: '2025-10-02T06:15:00.000Z' },
          airline: 'Delta Air Lines',
          flightNumber: 'DL2882',
          duration: 320,
          aircraft: 'Airbus A321neo',
        },
      ],
      inboundSegments: [
        {
          departure: { airport: 'SFO', time: '12:20', date: '2025-10-10T19:20:00.000Z' },
          arrival: { airport: 'ATL', time: '19:55', date: '2025-10-11T00:55:00.000Z' },
          airline: 'Delta Air Lines',
          flightNumber: 'DL1473',
          duration: 335,
          aircraft: 'Airbus A321neo',
        },
        {
          departure: { airport: 'ATL', time: '22:45', date: '2025-10-11T03:45:00.000Z' },
          arrival: { airport: 'GRU', time: '07:55', date: '2025-10-11T10:55:00.000Z' },
          airline: 'Delta Air Lines',
          flightNumber: 'DL105',
          duration: 610,
          aircraft: 'Airbus A330-900neo',
        },
        {
          departure: { airport: 'GRU', time: '10:40', date: '2025-10-11T13:40:00.000Z' },
          arrival: { airport: 'CNF', time: '11:55', date: '2025-10-11T14:55:00.000Z' },
          airline: 'LATAM Airlines',
          flightNumber: 'LA3450',
          duration: 75,
          aircraft: 'Airbus A321',
        },
      ],
      popularityScore: 88,
      comfortScore: 7,
      layoverQuality: 'acceptable',
    },

    // Voos Internacionais - Europa
    {
      itineraryId: 'FLT-GRU-LIS-001',
      origin: 'GRU',
      destination: 'LIS',
      departDate: futureDate,
      returnDate: returnDate,
      airline: 'TAP Air Portugal',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 3200.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '23:45', date: futureDate.toISOString() },
          arrival: { airport: 'LIS', time: '13:15', date: addDays(futureDate, 1).toISOString() },
          airline: 'TAP Air Portugal',
          flightNumber: 'TP90',
          duration: 570,
          aircraft: 'Airbus A330neo'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'LIS', time: '18:30', date: returnDate.toISOString() },
          arrival: { airport: 'GRU', time: '23:45', date: returnDate.toISOString() },
          airline: 'TAP Air Portugal',
          flightNumber: 'TP91',
          duration: 555,
          aircraft: 'Airbus A330neo'
        }
      ],
      popularityScore: 89,
      comfortScore: 9,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-GRU-CDG-001',
      origin: 'GRU',
      destination: 'CDG',
      departDate: futureDate,
      returnDate: returnDate,
      airline: 'Air France',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 4800.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '19:30', date: futureDate.toISOString() },
          arrival: { airport: 'CDG', time: '10:45', date: addDays(futureDate, 1).toISOString() },
          airline: 'Air France',
          flightNumber: 'AF456',
          duration: 675,
          aircraft: 'Boeing 777-300ER'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'CDG', time: '13:00', date: returnDate.toISOString() },
          arrival: { airport: 'GRU', time: '20:15', date: returnDate.toISOString() },
          airline: 'Air France',
          flightNumber: 'AF457',
          duration: 675,
          aircraft: 'Boeing 777-300ER'
        }
      ],
      popularityScore: 95,
      comfortScore: 9,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-GRU-FCO-001',
      origin: 'GRU',
      destination: 'FCO',
      departDate: futureDate,
      returnDate: returnDate,
      airline: 'ITA Airways',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 4200.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '20:00', date: futureDate.toISOString() },
          arrival: { airport: 'FCO', time: '12:30', date: addDays(futureDate, 1).toISOString() },
          airline: 'ITA Airways',
          flightNumber: 'AZ680',
          duration: 690,
          aircraft: 'Airbus A350'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'FCO', time: '14:00', date: returnDate.toISOString() },
          arrival: { airport: 'GRU', time: '22:30', date: returnDate.toISOString() },
          airline: 'ITA Airways',
          flightNumber: 'AZ681',
          duration: 690,
          aircraft: 'Airbus A350'
        }
      ],
      popularityScore: 86,
      comfortScore: 9,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-GRU-MAD-001',
      origin: 'GRU',
      destination: 'MAD',
      departDate: futureDate,
      returnDate: returnDate,
      airline: 'Iberia',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 4500.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '22:00', date: futureDate.toISOString() },
          arrival: { airport: 'MAD', time: '13:30', date: addDays(futureDate, 1).toISOString() },
          airline: 'Iberia',
          flightNumber: 'IB6831',
          duration: 630,
          aircraft: 'Airbus A350-900'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'MAD', time: '16:00', date: returnDate.toISOString() },
          arrival: { airport: 'GRU', time: '21:30', date: returnDate.toISOString() },
          airline: 'Iberia',
          flightNumber: 'IB6830',
          duration: 630,
          aircraft: 'Airbus A350-900'
        }
      ],
      popularityScore: 85,
      comfortScore: 9,
      layoverQuality: 'excellent',
    },

    // Voos Internacionais - América do Norte
    {
      itineraryId: 'FLT-GRU-MIA-001',
      origin: 'GRU',
      destination: 'MIA',
      departDate: futureDate,
      returnDate: returnDate,
      airline: 'American Airlines',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 3800.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '22:30', date: futureDate.toISOString() },
          arrival: { airport: 'MIA', time: '06:15', date: addDays(futureDate, 1).toISOString() },
          airline: 'American Airlines',
          flightNumber: 'AA906',
          duration: 585,
          aircraft: 'Boeing 777-300ER'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'MIA', time: '19:45', date: returnDate.toISOString() },
          arrival: { airport: 'GRU', time: '07:30', date: addDays(returnDate, 1).toISOString() },
          airline: 'American Airlines',
          flightNumber: 'AA907',
          duration: 585,
          aircraft: 'Boeing 777-300ER'
        }
      ],
      popularityScore: 92,
      comfortScore: 8,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-GRU-MCO-001',
      origin: 'GRU',
      destination: 'MCO',
      departDate: futureDate,
      returnDate: returnDate,
      airline: 'LATAM Airlines',
      stops: 1,
      baggageIncluded: true,
      totalPrice: 3600.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '08:00', date: futureDate.toISOString() },
          arrival: { airport: 'MIA', time: '15:45', date: futureDate.toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA8065',
          duration: 585,
          aircraft: 'Boeing 767'
        },
        {
          departure: { airport: 'MIA', time: '18:30', date: futureDate.toISOString() },
          arrival: { airport: 'MCO', time: '19:30', date: futureDate.toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA5612',
          duration: 60,
          aircraft: 'Airbus A320'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'MCO', time: '14:00', date: returnDate.toISOString() },
          arrival: { airport: 'MIA', time: '15:00', date: returnDate.toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA5615',
          duration: 60,
          aircraft: 'Airbus A320'
        },
        {
          departure: { airport: 'MIA', time: '17:30', date: returnDate.toISOString() },
          arrival: { airport: 'GRU', time: '05:15', date: addDays(returnDate, 1).toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA8066',
          duration: 585,
          aircraft: 'Boeing 767'
        }
      ],
      popularityScore: 90,
      comfortScore: 7,
      layoverQuality: 'good',
    },

    // Voos Internacionais - Caribe
    {
      itineraryId: 'FLT-GRU-PUJ-001',
      origin: 'GRU',
      destination: 'PUJ',
      departDate: futureDate,
      returnDate: returnDate,
      airline: 'Copa Airlines',
      stops: 1,
      baggageIncluded: true,
      totalPrice: 3400.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '09:30', date: futureDate.toISOString() },
          arrival: { airport: 'PTY', time: '14:45', date: futureDate.toISOString() },
          airline: 'Copa Airlines',
          flightNumber: 'CM702',
          duration: 435,
          aircraft: 'Boeing 737-800'
        },
        {
          departure: { airport: 'PTY', time: '17:00', date: futureDate.toISOString() },
          arrival: { airport: 'PUJ', time: '20:15', date: futureDate.toISOString() },
          airline: 'Copa Airlines',
          flightNumber: 'CM356',
          duration: 195,
          aircraft: 'Boeing 737-800'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'PUJ', time: '10:00', date: returnDate.toISOString() },
          arrival: { airport: 'PTY', time: '13:15', date: returnDate.toISOString() },
          airline: 'Copa Airlines',
          flightNumber: 'CM357',
          duration: 195,
          aircraft: 'Boeing 737-800'
        },
        {
          departure: { airport: 'PTY', time: '16:00', date: returnDate.toISOString() },
          arrival: { airport: 'GRU', time: '23:15', date: returnDate.toISOString() },
          airline: 'Copa Airlines',
          flightNumber: 'CM703',
          duration: 435,
          aircraft: 'Boeing 737-800'
        }
      ],
      popularityScore: 78,
      comfortScore: 7,
      layoverQuality: 'acceptable',
    },
    // Novas rotas expandidas
    {
      itineraryId: 'FLT-GRU-POA-2024A',
      origin: 'GRU',
      destination: 'POA',
      departDate: regionalDepart,
      returnDate: regionalReturn,
      airline: 'LATAM Airlines',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 580.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '09:45', date: regionalDepart.toISOString() },
          arrival: { airport: 'POA', time: '11:30', date: regionalDepart.toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA3320',
          duration: 105,
          aircraft: 'Airbus A320'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'POA', time: '18:10', date: regionalReturn.toISOString() },
          arrival: { airport: 'GRU', time: '20:00', date: regionalReturn.toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA3331',
          duration: 110,
          aircraft: 'Airbus A320'
        }
      ],
      popularityScore: 87,
      comfortScore: 7,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-FOR-JJD-2024A',
      origin: 'FOR',
      destination: 'JJD',
      departDate: regionalDepart,
      returnDate: regionalReturn,
      airline: 'Azul Linhas Aéreas',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 480.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'FOR', time: '12:10', date: regionalDepart.toISOString() },
          arrival: { airport: 'JJD', time: '13:10', date: regionalDepart.toISOString() },
          airline: 'Azul Linhas Aéreas',
          flightNumber: 'AD4568',
          duration: 60,
          aircraft: 'ATR 72'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'JJD', time: '15:40', date: regionalReturn.toISOString() },
          arrival: { airport: 'FOR', time: '16:40', date: regionalReturn.toISOString() },
          airline: 'Azul Linhas Aéreas',
          flightNumber: 'AD4569',
          duration: 60,
          aircraft: 'ATR 72'
        }
      ],
      popularityScore: 79,
      comfortScore: 7,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-REC-FEN-2024A',
      origin: 'REC',
      destination: 'FEN',
      departDate: regionalDepart,
      returnDate: regionalReturn,
      airline: 'Azul Linhas Aéreas',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 1280.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'REC', time: '13:20', date: regionalDepart.toISOString() },
          arrival: { airport: 'FEN', time: '14:35', date: regionalDepart.toISOString() },
          airline: 'Azul Linhas Aéreas',
          flightNumber: 'AD5400',
          duration: 75,
          aircraft: 'ATR 72'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'FEN', time: '11:10', date: regionalReturn.toISOString() },
          arrival: { airport: 'REC', time: '12:25', date: regionalReturn.toISOString() },
          airline: 'Azul Linhas Aéreas',
          flightNumber: 'AD5401',
          duration: 75,
          aircraft: 'ATR 72'
        }
      ],
      popularityScore: 88,
      comfortScore: 8,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-CGH-BYO-2024A',
      origin: 'CGH',
      destination: 'BYO',
      departDate: adventureDepart,
      returnDate: adventureReturn,
      airline: 'Azul Linhas Aéreas',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 1190.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'CGH', time: '10:05', date: adventureDepart.toISOString() },
          arrival: { airport: 'BYO', time: '12:35', date: adventureDepart.toISOString() },
          airline: 'Azul Linhas Aéreas',
          flightNumber: 'AD4850',
          duration: 150,
          aircraft: 'ATR 72'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'BYO', time: '14:05', date: adventureReturn.toISOString() },
          arrival: { airport: 'CGH', time: '16:35', date: adventureReturn.toISOString() },
          airline: 'Azul Linhas Aéreas',
          flightNumber: 'AD4851',
          duration: 150,
          aircraft: 'ATR 72'
        }
      ],
      popularityScore: 76,
      comfortScore: 7,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-GRU-MAO-2024A',
      origin: 'GRU',
      destination: 'MAO',
      departDate: adventureDepart,
      returnDate: adventureReturn,
      airline: 'LATAM Airlines',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 1250.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '08:30', date: adventureDepart.toISOString() },
          arrival: { airport: 'MAO', time: '11:40', date: adventureDepart.toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA3760',
          duration: 250,
          aircraft: 'Airbus A321'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'MAO', time: '14:20', date: adventureReturn.toISOString() },
          arrival: { airport: 'GRU', time: '19:25', date: adventureReturn.toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA3765',
          duration: 245,
          aircraft: 'Airbus A321'
        }
      ],
      popularityScore: 83,
      comfortScore: 7,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-GRU-SLZ-2024A',
      origin: 'GRU',
      destination: 'SLZ',
      departDate: adventureDepart,
      returnDate: adventureReturn,
      airline: 'Gol Linhas Aéreas',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 980.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '11:15', date: adventureDepart.toISOString() },
          arrival: { airport: 'SLZ', time: '14:15', date: adventureDepart.toISOString() },
          airline: 'Gol Linhas Aéreas',
          flightNumber: 'G31854',
          duration: 180,
          aircraft: 'Boeing 737 MAX 8'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'SLZ', time: '16:05', date: adventureReturn.toISOString() },
          arrival: { airport: 'GRU', time: '19:05', date: adventureReturn.toISOString() },
          airline: 'Gol Linhas Aéreas',
          flightNumber: 'G31855',
          duration: 180,
          aircraft: 'Boeing 737 MAX 8'
        }
      ],
      popularityScore: 80,
      comfortScore: 7,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-GRU-CUN-2024A',
      origin: 'GRU',
      destination: 'CUN',
      departDate: beachDepart,
      returnDate: beachReturn,
      airline: 'LATAM Airlines',
      stops: 1,
      baggageIncluded: true,
      totalPrice: 2850.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '22:30', date: beachDepart.toISOString() },
          arrival: { airport: 'LIM', time: '02:45', date: addDays(beachDepart, 1).toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA2465',
          duration: 315,
          aircraft: 'Airbus A320neo'
        },
        {
          departure: { airport: 'LIM', time: '04:15', date: addDays(beachDepart, 1).toISOString() },
          arrival: { airport: 'CUN', time: '09:10', date: addDays(beachDepart, 1).toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA6406',
          duration: 295,
          aircraft: 'Airbus A319'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'CUN', time: '11:40', date: beachReturn.toISOString() },
          arrival: { airport: 'LIM', time: '16:35', date: beachReturn.toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA6407',
          duration: 295,
          aircraft: 'Airbus A319'
        },
        {
          departure: { airport: 'LIM', time: '22:15', date: beachReturn.toISOString() },
          arrival: { airport: 'GRU', time: '04:50', date: addDays(beachReturn, 1).toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA2464',
          duration: 335,
          aircraft: 'Airbus A320neo'
        }
      ],
      popularityScore: 90,
      comfortScore: 8,
      layoverQuality: 'good',
    },
    {
      itineraryId: 'FLT-GRU-LAX-2024A',
      origin: 'GRU',
      destination: 'LAX',
      departDate: longHaulDepart,
      returnDate: longHaulReturn,
      airline: 'LATAM Airlines',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 4200.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '23:55', date: longHaulDepart.toISOString() },
          arrival: { airport: 'LAX', time: '08:20', date: addDays(longHaulDepart, 1).toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA8084',
          duration: 785,
          aircraft: 'Boeing 777-300ER'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'LAX', time: '13:10', date: longHaulReturn.toISOString() },
          arrival: { airport: 'GRU', time: '05:55', date: addDays(longHaulReturn, 1).toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA8085',
          duration: 650,
          aircraft: 'Boeing 777-300ER'
        }
      ],
      popularityScore: 94,
      comfortScore: 9,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-GRU-YVR-2024A',
      origin: 'GRU',
      destination: 'YVR',
      departDate: longHaulDepart,
      returnDate: longHaulReturn,
      airline: 'LATAM + Air Canada',
      stops: 1,
      baggageIncluded: true,
      totalPrice: 4680.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '20:25', date: longHaulDepart.toISOString() },
          arrival: { airport: 'LAX', time: '04:55', date: addDays(longHaulDepart, 1).toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA8024',
          duration: 750,
          aircraft: 'Boeing 787-9'
        },
        {
          departure: { airport: 'LAX', time: '07:10', date: addDays(longHaulDepart, 1).toISOString() },
          arrival: { airport: 'YVR', time: '09:55', date: addDays(longHaulDepart, 1).toISOString() },
          airline: 'Air Canada',
          flightNumber: 'AC555',
          duration: 165,
          aircraft: 'Airbus A321'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'YVR', time: '12:30', date: longHaulReturn.toISOString() },
          arrival: { airport: 'LAX', time: '15:05', date: longHaulReturn.toISOString() },
          airline: 'Air Canada',
          flightNumber: 'AC554',
          duration: 155,
          aircraft: 'Airbus A321'
        },
        {
          departure: { airport: 'LAX', time: '21:30', date: longHaulReturn.toISOString() },
          arrival: { airport: 'GRU', time: '11:55', date: addDays(longHaulReturn, 1).toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA8025',
          duration: 685,
          aircraft: 'Boeing 787-9'
        }
      ],
      popularityScore: 88,
      comfortScore: 8,
      layoverQuality: 'good',
    },
    {
      itineraryId: 'FLT-GRU-NRT-2024A',
      origin: 'GRU',
      destination: 'NRT',
      departDate: ultraLongDepart,
      returnDate: ultraLongReturn,
      airline: 'LATAM + ANA',
      stops: 1,
      baggageIncluded: true,
      totalPrice: 5980.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '22:15', date: ultraLongDepart.toISOString() },
          arrival: { airport: 'LAX', time: '07:10', date: addDays(ultraLongDepart, 1).toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA8072',
          duration: 775,
          aircraft: 'Boeing 777-300ER'
        },
        {
          departure: { airport: 'LAX', time: '12:20', date: addDays(ultraLongDepart, 1).toISOString() },
          arrival: { airport: 'NRT', time: '16:40', date: addDays(ultraLongDepart, 2).toISOString() },
          airline: 'All Nippon Airways',
          flightNumber: 'NH5',
          duration: 660,
          aircraft: 'Boeing 777-300ER'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'NRT', time: '19:05', date: ultraLongReturn.toISOString() },
          arrival: { airport: 'LAX', time: '13:10', date: addDays(ultraLongReturn, -1).toISOString() },
          airline: 'All Nippon Airways',
          flightNumber: 'NH6',
          duration: 650,
          aircraft: 'Boeing 777-300ER'
        },
        {
          departure: { airport: 'LAX', time: '20:45', date: addDays(ultraLongReturn, -1).toISOString() },
          arrival: { airport: 'GRU', time: '12:15', date: ultraLongReturn.toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA8073',
          duration: 690,
          aircraft: 'Boeing 777-300ER'
        }
      ],
      popularityScore: 86,
      comfortScore: 8,
      layoverQuality: 'good',
    },
    {
      itineraryId: 'FLT-GRU-DXB-2024A',
      origin: 'GRU',
      destination: 'DXB',
      departDate: ultraLongDepart,
      returnDate: ultraLongReturn,
      airline: 'Emirates',
      stops: 0,
      baggageIncluded: true,
      totalPrice: 5480.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '01:35', date: ultraLongDepart.toISOString() },
          arrival: { airport: 'DXB', time: '22:15', date: ultraLongDepart.toISOString() },
          airline: 'Emirates',
          flightNumber: 'EK262',
          duration: 770,
          aircraft: 'Boeing 777-300ER'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'DXB', time: '09:05', date: ultraLongReturn.toISOString() },
          arrival: { airport: 'GRU', time: '17:00', date: ultraLongReturn.toISOString() },
          airline: 'Emirates',
          flightNumber: 'EK261',
          duration: 815,
          aircraft: 'Boeing 777-300ER'
        }
      ],
      popularityScore: 93,
      comfortScore: 9,
      layoverQuality: 'excellent',
    },
    {
      itineraryId: 'FLT-GRU-DPS-2024A',
      origin: 'GRU',
      destination: 'DPS',
      departDate: islandEscapeDepart,
      returnDate: islandEscapeReturn,
      airline: 'Emirates',
      stops: 1,
      baggageIncluded: true,
      totalPrice: 6120.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '01:35', date: islandEscapeDepart.toISOString() },
          arrival: { airport: 'DXB', time: '22:15', date: islandEscapeDepart.toISOString() },
          airline: 'Emirates',
          flightNumber: 'EK262',
          duration: 770,
          aircraft: 'Boeing 777-300ER'
        },
        {
          departure: { airport: 'DXB', time: '02:10', date: addDays(islandEscapeDepart, 1).toISOString() },
          arrival: { airport: 'DPS', time: '15:25', date: addDays(islandEscapeDepart, 1).toISOString() },
          airline: 'Emirates',
          flightNumber: 'EK398',
          duration: 555,
          aircraft: 'Boeing 777-300ER'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'DPS', time: '19:10', date: islandEscapeReturn.toISOString() },
          arrival: { airport: 'DXB', time: '00:30', date: addDays(islandEscapeReturn, 1).toISOString() },
          airline: 'Emirates',
          flightNumber: 'EK399',
          duration: 540,
          aircraft: 'Boeing 777-300ER'
        },
        {
          departure: { airport: 'DXB', time: '08:05', date: addDays(islandEscapeReturn, 1).toISOString() },
          arrival: { airport: 'GRU', time: '15:55', date: addDays(islandEscapeReturn, 1).toISOString() },
          airline: 'Emirates',
          flightNumber: 'EK261',
          duration: 830,
          aircraft: 'Boeing 777-300ER'
        }
      ],
      popularityScore: 85,
      comfortScore: 8,
      layoverQuality: 'good',
    },
    {
      itineraryId: 'FLT-GRU-CPT-2024A',
      origin: 'GRU',
      destination: 'CPT',
      departDate: longHaulDepart,
      returnDate: longHaulReturn,
      airline: 'TAP Air Portugal',
      stops: 1,
      baggageIncluded: true,
      totalPrice: 3980.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '17:25', date: longHaulDepart.toISOString() },
          arrival: { airport: 'LIS', time: '07:00', date: addDays(longHaulDepart, 1).toISOString() },
          airline: 'TAP Air Portugal',
          flightNumber: 'TP104',
          duration: 555,
          aircraft: 'Airbus A330neo'
        },
        {
          departure: { airport: 'LIS', time: '09:30', date: addDays(longHaulDepart, 1).toISOString() },
          arrival: { airport: 'CPT', time: '21:05', date: addDays(longHaulDepart, 1).toISOString() },
          airline: 'TAP Air Portugal',
          flightNumber: 'TP263',
          duration: 515,
          aircraft: 'Airbus A330neo'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'CPT', time: '23:10', date: longHaulReturn.toISOString() },
          arrival: { airport: 'LIS', time: '09:45', date: addDays(longHaulReturn, 1).toISOString() },
          airline: 'TAP Air Portugal',
          flightNumber: 'TP264',
          duration: 535,
          aircraft: 'Airbus A330neo'
        },
        {
          departure: { airport: 'LIS', time: '12:05', date: addDays(longHaulReturn, 1).toISOString() },
          arrival: { airport: 'GRU', time: '19:35', date: addDays(longHaulReturn, 1).toISOString() },
          airline: 'TAP Air Portugal',
          flightNumber: 'TP103',
          duration: 570,
          aircraft: 'Airbus A330neo'
        }
      ],
      popularityScore: 84,
      comfortScore: 8,
      layoverQuality: 'good',
    },
    {
      itineraryId: 'FLT-GRU-SYD-2024A',
      origin: 'GRU',
      destination: 'SYD',
      departDate: ultraLongDepart,
      returnDate: ultraLongReturn,
      airline: 'LATAM + Qantas',
      stops: 1,
      baggageIncluded: true,
      totalPrice: 6580.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '22:45', date: ultraLongDepart.toISOString() },
          arrival: { airport: 'SCL', time: '02:05', date: addDays(ultraLongDepart, 1).toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA750',
          duration: 260,
          aircraft: 'Boeing 787-9'
        },
        {
          departure: { airport: 'SCL', time: '12:30', date: addDays(ultraLongDepart, 1).toISOString() },
          arrival: { airport: 'SYD', time: '17:05', date: addDays(ultraLongDepart, 2).toISOString() },
          airline: 'Qantas Airways',
          flightNumber: 'QF28',
          duration: 810,
          aircraft: 'Boeing 787-9'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'SYD', time: '21:35', date: ultraLongReturn.toISOString() },
          arrival: { airport: 'SCL', time: '18:15', date: addDays(ultraLongReturn, -1).toISOString() },
          airline: 'Qantas Airways',
          flightNumber: 'QF27',
          duration: 780,
          aircraft: 'Boeing 787-9'
        },
        {
          departure: { airport: 'SCL', time: '22:30', date: addDays(ultraLongReturn, -1).toISOString() },
          arrival: { airport: 'GRU', time: '03:40', date: ultraLongReturn.toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA751',
          duration: 260,
          aircraft: 'Boeing 787-9'
        }
      ],
      popularityScore: 89,
      comfortScore: 8,
      layoverQuality: 'good',
    },
    {
      itineraryId: 'FLT-GRU-ZQN-2024A',
      origin: 'GRU',
      destination: 'ZQN',
      departDate: ultraLongDepart,
      returnDate: ultraLongReturn,
      airline: 'LATAM + Qantas',
      stops: 2,
      baggageIncluded: true,
      totalPrice: 6980.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '21:15', date: ultraLongDepart.toISOString() },
          arrival: { airport: 'SCL', time: '00:30', date: addDays(ultraLongDepart, 1).toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA754',
          duration: 255,
          aircraft: 'Boeing 787-9'
        },
        {
          departure: { airport: 'SCL', time: '11:55', date: addDays(ultraLongDepart, 1).toISOString() },
          arrival: { airport: 'SYD', time: '16:20', date: addDays(ultraLongDepart, 2).toISOString() },
          airline: 'Qantas Airways',
          flightNumber: 'QF28',
          duration: 805,
          aircraft: 'Boeing 787-9'
        },
        {
          departure: { airport: 'SYD', time: '19:35', date: addDays(ultraLongDepart, 2).toISOString() },
          arrival: { airport: 'ZQN', time: '00:45', date: addDays(ultraLongDepart, 3).toISOString() },
          airline: 'Qantas Airways',
          flightNumber: 'QF121',
          duration: 190,
          aircraft: 'Airbus A330-200'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'ZQN', time: '13:10', date: ultraLongReturn.toISOString() },
          arrival: { airport: 'SYD', time: '14:45', date: ultraLongReturn.toISOString() },
          airline: 'Qantas Airways',
          flightNumber: 'QF122',
          duration: 155,
          aircraft: 'Boeing 737-800'
        },
        {
          departure: { airport: 'SYD', time: '17:20', date: ultraLongReturn.toISOString() },
          arrival: { airport: 'SCL', time: '13:05', date: addDays(ultraLongReturn, -1).toISOString() },
          airline: 'Qantas Airways',
          flightNumber: 'QF27',
          duration: 780,
          aircraft: 'Boeing 787-9'
        },
        {
          departure: { airport: 'SCL', time: '17:40', date: addDays(ultraLongReturn, -1).toISOString() },
          arrival: { airport: 'GRU', time: '22:45', date: addDays(ultraLongReturn, -1).toISOString() },
          airline: 'LATAM Airlines',
          flightNumber: 'LA753',
          duration: 255,
          aircraft: 'Boeing 787-9'
        }
      ],
      popularityScore: 82,
      comfortScore: 8,
      layoverQuality: 'acceptable',
    },
    {
      itineraryId: 'FLT-GRU-RAK-2024A',
      origin: 'GRU',
      destination: 'RAK',
      departDate: longHaulDepart,
      returnDate: longHaulReturn,
      airline: 'Iberia + Royal Air Maroc',
      stops: 1,
      baggageIncluded: true,
      totalPrice: 3720.00,
      currency: 'BRL',
      outboundSegments: [
        {
          departure: { airport: 'GRU', time: '14:10', date: longHaulDepart.toISOString() },
          arrival: { airport: 'MAD', time: '05:25', date: addDays(longHaulDepart, 1).toISOString() },
          airline: 'Iberia',
          flightNumber: 'IB6824',
          duration: 615,
          aircraft: 'Airbus A350-900'
        },
        {
          departure: { airport: 'MAD', time: '08:45', date: addDays(longHaulDepart, 1).toISOString() },
          arrival: { airport: 'RAK', time: '09:55', date: addDays(longHaulDepart, 1).toISOString() },
          airline: 'Royal Air Maroc',
          flightNumber: 'AT971',
          duration: 130,
          aircraft: 'Boeing 737-800'
        }
      ],
      inboundSegments: [
        {
          departure: { airport: 'RAK', time: '18:40', date: longHaulReturn.toISOString() },
          arrival: { airport: 'MAD', time: '21:50', date: longHaulReturn.toISOString() },
          airline: 'Royal Air Maroc',
          flightNumber: 'AT970',
          duration: 130,
          aircraft: 'Boeing 737-800'
        },
        {
          departure: { airport: 'MAD', time: '23:55', date: longHaulReturn.toISOString() },
          arrival: { airport: 'GRU', time: '06:50', date: addDays(longHaulReturn, 1).toISOString() },
          airline: 'Iberia',
          flightNumber: 'IB6823',
          duration: 655,
          aircraft: 'Airbus A350-900'
        }
      ],
      popularityScore: 81,
      comfortScore: 8,
      layoverQuality: 'good',
    },
  ];

  for (const flight of flights) {
    await prisma.flightItinerary.upsert({
      where: { itineraryId: flight.itineraryId },
      update: flight,
      create: flight,
    });
  }

  console.log(`✅ Created ${flights.length} flight itineraries`);
}
