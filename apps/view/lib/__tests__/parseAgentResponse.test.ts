import { parseAgentResponse } from '../parseAgentResponse';

describe('parseAgentResponse', () => {
  describe('plain text responses', () => {
    it('should parse plain text without JSON', () => {
      const input = 'Hello! How can I help you today?';
      const result = parseAgentResponse(input);

      expect(result.text).toBe('Hello! How can I help you today?');
      expect(result.payloads).toEqual([]);
    });

    it('should handle empty input', () => {
      const result = parseAgentResponse('');

      expect(result.text).toBe('');
      expect(result.payloads).toEqual([]);
    });

    it('should handle multiline text', () => {
      const input = 'Line 1\n\nLine 2\n\nLine 3';
      const result = parseAgentResponse(input);

      expect(result.text).toBe('Line 1\n\nLine 2\n\nLine 3');
      expect(result.payloads).toEqual([]);
    });
  });

  describe('JSON-only responses', () => {
    it('should extract simple JSON object with source field', () => {
      const input = JSON.stringify({
        data: [{ id: '1', name: 'Test Hotel' }],
        source: 'hotels',
        language: 'en',
      }, null, 2);

      const result = parseAgentResponse(input);

      expect(result.payloads).toHaveLength(1);
      expect(result.payloads[0].source).toBe('hotels');
      expect(result.payloads[0].data).toEqual([{ id: '1', name: 'Test Hotel' }]);
    });

    it('should extract flights JSON', () => {
      const input = JSON.stringify({
        data: [
          {
            itineraryId: 'flight-001',
            airline: 'Test Airlines',
            totalPrice: 1500,
          },
        ],
        source: 'flights',
      }, null, 2);

      const result = parseAgentResponse(input);

      expect(result.payloads).toHaveLength(1);
      expect(result.payloads[0].source).toBe('flights');
      expect(Array.isArray(result.payloads[0].data)).toBe(true);
    });

    it('should extract destinations JSON', () => {
      const input = JSON.stringify({
        data: [
          {
            id: 'dest-001',
            name: 'Paris',
            country: 'France',
          },
        ],
        source: 'destinations',
      }, null, 2);

      const result = parseAgentResponse(input);

      expect(result.payloads).toHaveLength(1);
      expect(result.payloads[0].source).toBe('destinations');
    });
  });

  describe('mixed text and JSON responses (BUG #1 scenario)', () => {
    it('should extract JSON from text with markdown before JSON', () => {
      const input = `Aqui estão algumas opções de hotéis em São Paulo:

1. **Hotel Unique**
   - Diária: BRL 850,00

2. **Ibis Paulista**
   - Diária: BRL 280,00

{
  "data": [
    {
      "hotelId": "hotel-sp-001",
      "name": "Hotel Unique",
      "city": "São Paulo"
    },
    {
      "hotelId": "hotel-sp-002",
      "name": "Ibis Paulista",
      "city": "São Paulo"
    }
  ],
  "source": "hotels",
  "language": "en"
}`;

      const result = parseAgentResponse(input);

      expect(result.text).toContain('Aqui estão algumas opções');
      expect(result.text).toContain('Hotel Unique');
      expect(result.payloads).toHaveLength(1);
      expect(result.payloads[0].source).toBe('hotels');
      expect(result.payloads[0].data).toHaveLength(2);
    });

    it('should extract JSON from text with markdown after JSON', () => {
      const input = `{
  "data": [
    { "hotelId": "hotel-001", "name": "Test Hotel" }
  ],
  "source": "hotels"
}

Se precisar de mais informações, é só avisar!`;

      const result = parseAgentResponse(input);

      expect(result.text).toContain('Se precisar de mais informações');
      expect(result.payloads).toHaveLength(1);
      expect(result.payloads[0].source).toBe('hotels');
    });

    it('should handle JSON embedded in middle of text', () => {
      const input = `Here are your options:

{
  "data": [{ "id": "1" }],
  "source": "hotels"
}

Let me know if you need anything else!`;

      const result = parseAgentResponse(input);

      expect(result.text).toContain('Here are your options');
      expect(result.text).toContain('Let me know');
      expect(result.payloads).toHaveLength(1);
      expect(result.payloads[0].source).toBe('hotels');
    });
  });

  describe('multiple JSON blocks', () => {
    it('should extract multiple JSON objects', () => {
      const input = `First result:

{
  "data": [{ "id": "1" }],
  "source": "hotels"
}

Second result:

{
  "data": [{ "id": "2" }],
  "source": "flights"
}`;

      const result = parseAgentResponse(input);

      expect(result.payloads).toHaveLength(2);
      expect(result.payloads[0].source).toBe('hotels');
      expect(result.payloads[1].source).toBe('flights');
    });
  });

  describe('malformed JSON', () => {
    it('should handle text that looks like JSON but is not valid', () => {
      const input = `Here is some data: { invalid json }`;
      const result = parseAgentResponse(input);

      expect(result.text).toContain('Here is some data');
      expect(result.payloads).toEqual([]);
    });

    it('should handle incomplete JSON', () => {
      const input = `Data: { "source": "hotels", "data":`;
      const result = parseAgentResponse(input);

      expect(result.text).toBeTruthy();
      // Should not crash, payloads might be empty
      expect(Array.isArray(result.payloads)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle JSON with suggestions array', () => {
      const input = JSON.stringify({
        data: [],
        source: 'hotels',
        message: 'No hotels found',
        suggestions: [
          'Try different dates',
          'Search nearby cities',
        ],
      }, null, 2);

      const result = parseAgentResponse(input);

      expect(result.payloads).toHaveLength(1);
      expect(result.payloads[0].suggestions).toEqual([
        'Try different dates',
        'Search nearby cities',
      ]);
    });

    it('should handle error payloads', () => {
      const input = JSON.stringify({
        error: true,
        message: 'Something went wrong',
        code: 'INTERNAL_ERROR',
        retryable: true,
      }, null, 2);

      const result = parseAgentResponse(input);

      expect(result.payloads).toHaveLength(1);
      expect(result.payloads[0].error).toBe(true);
      expect(result.payloads[0].message).toBe('Something went wrong');
      expect(result.payloads[0].code).toBe('INTERNAL_ERROR');
      expect(result.payloads[0].retryable).toBe(true);
    });

    it('should handle compact JSON (no whitespace)', () => {
      const input = '{"data":[{"id":"1"}],"source":"hotels"}';
      const result = parseAgentResponse(input);

      expect(result.payloads).toHaveLength(1);
      expect(result.payloads[0].source).toBe('hotels');
    });

    it('should handle JSON with nested objects', () => {
      const input = JSON.stringify({
        data: [
          {
            hotelId: 'h1',
            summary: {
              checkin: '2025-12-20',
              checkout: '2025-12-25',
              nights: 5,
            },
          },
        ],
        source: 'hotels',
      }, null, 2);

      const result = parseAgentResponse(input);

      expect(result.payloads).toHaveLength(1);
      expect(result.payloads[0].data).toBeDefined();
      const data = result.payloads[0].data as Array<any>;
      expect(data[0].summary).toEqual({
        checkin: '2025-12-20',
        checkout: '2025-12-25',
        nights: 5,
      });
    });
  });

  describe('real-world backend responses', () => {
    it('should handle actual hotel search response from backend', () => {
      const input = `Aqui estão algumas opções de hotéis em São Paulo para o período de 20 a 25 de dezembro de 2025:

1. **Hotel Unique**
   - **Endereço:** Av. Brigadeiro Luís Antônio, 4700
   - **Avaliação:** 4.7 (1823 avaliações)
   - **Diária:** BRL 850,00

{
  "data": [
    {
      "hotelId": "hotel-sp-001",
      "name": "Hotel Unique",
      "city": "São Paulo",
      "rating": 4.7,
      "nightlyLabel": "BRL 850.00",
      "heroImageUrl": "https://images.unsplash.com/photo-1501117716987-c8e1ecb2100d",
      "summary": {
        "checkin": "2025-12-20",
        "checkout": "2025-12-25",
        "nights": 5
      }
    }
  ],
  "source": "hotels",
  "language": "en",
  "suggestions": [
    "Use book_hotel to reserve a stay",
    "Call get_hotel_amenities to see facilities"
  ]
}`;

      const result = parseAgentResponse(input);

      // Should extract markdown text
      expect(result.text).toContain('Hotel Unique');
      expect(result.text).toContain('Av. Brigadeiro');

      // Should extract structured JSON
      expect(result.payloads).toHaveLength(1);
      expect(result.payloads[0].source).toBe('hotels');
      expect(result.payloads[0].language).toBe('en');
      expect(result.payloads[0].suggestions).toHaveLength(2);

      const data = result.payloads[0].data as Array<any>;
      expect(data).toHaveLength(1);
      expect(data[0].hotelId).toBe('hotel-sp-001');
      expect(data[0].name).toBe('Hotel Unique');
      expect(data[0].heroImageUrl).toContain('unsplash.com');
    });

    it('should handle flight search with no results', () => {
      const input = `Não encontramos voos de São Paulo para Rio de Janeiro para a data de 15 de dezembro de 2025.

{
  "data": [],
  "message": "No flights found from São Paulo to Rio de Janeiro for the selected dates.",
  "suggestions": [
    "Relax baggage or stops filters",
    "Try alternative travel dates",
    "Consider nearby airports both ends"
  ],
  "source": "flights",
  "language": "en"
}`;

      const result = parseAgentResponse(input);

      expect(result.text).toContain('Não encontramos voos');
      expect(result.payloads).toHaveLength(1);
      expect(result.payloads[0].source).toBe('flights');
      expect(result.payloads[0].data).toEqual([]);
      expect(result.payloads[0].message).toContain('No flights found');
      expect(result.payloads[0].suggestions).toHaveLength(3);
    });
  });
});
