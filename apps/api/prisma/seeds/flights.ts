import { PrismaClient } from '../../src/generated/prisma';
import { addDays } from 'date-fns';

export async function seedFlights(prisma: PrismaClient) {
  console.log('✈️  Seeding flight itineraries...');

  const today = new Date();
  const futureDate = addDays(today, 30);
  const returnDate = addDays(futureDate, 7);
  const cnfToSfoDepart = new Date('2025-10-01T11:30:00.000Z');
  const cnfToSfoReturn = new Date('2025-10-10T18:05:00.000Z');

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
