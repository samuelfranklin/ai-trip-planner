import '@testing-library/jest-dom';
import { render, screen, configure } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AgentStructuredPayload, ChatAction } from '../../../types';
import { StructuredPayloadRenderer } from '../structured-payload';

configure({ testIdAttribute: 'data-test-id' });

function renderWithPayload(payload: AgentStructuredPayload, onAction: (action: ChatAction) => void) {
  render(<StructuredPayloadRenderer payload={payload} onAction={onAction} />);
}

describe('StructuredPayloadRenderer - flights', () => {
  it('renders flight cards with action buttons and toggles details', async () => {
    const user = userEvent.setup();
    const handler = jest.fn();

    const payload: AgentStructuredPayload = {
      raw: null,
      source: 'flights',
      data: [
        {
          itineraryId: 'FLT-1',
          airline: 'Azul',
          totalLabel: 'R$ 1.200,00',
          currency: 'BRL',
          stops: 0,
          baggageIncluded: true,
          status: 'TICKETED',
          pnr: 'ABC123',
          summary: {
            origin: { city: 'Belo Horizonte' },
            destination: { city: 'Rio de Janeiro' },
            departDate: '2025-12-28',
            returnDate: '2026-01-03',
            adults: 2,
          },
          outbound: [
            {
              airline: 'Azul',
              flightNumber: 'AD1234',
              duration: '1h10',
              departure: { airport: 'CNF', time: '08:00', date: '2025-12-28' },
              arrival: { airport: 'GIG', time: '09:10', date: '2025-12-28' },
            },
          ],
          inbound: [
            {
              airline: 'Azul',
              flightNumber: 'AD4321',
              duration: '1h15',
              departure: { airport: 'GIG', time: '18:00', date: '2026-01-03' },
              arrival: { airport: 'CNF', time: '19:15', date: '2026-01-03' },
            },
          ],
        },
      ],
    };

    renderWithPayload(payload, handler);

    const card = screen.getByTestId('flight-card');
    expect(card).toHaveAttribute('data-itinerary-id', 'FLT-1');
    expect(screen.getByText('Azul')).toBeInTheDocument();
    expect(screen.getByText('Belo Horizonte → Rio de Janeiro')).toBeInTheDocument();
    expect(screen.getByText('2025-12-28 · 2026-01-03')).toBeInTheDocument();
    expect(screen.getByText('PNR: ABC123')).toBeInTheDocument();

    const viewButton = screen.getByTestId('flight-details-toggle');
    await user.click(viewButton);
    expect(screen.getAllByTestId('flight-segment-group')).toHaveLength(2);

    const reserveButton = screen.getByTestId('flight-book-button');
    await user.click(reserveButton);
    expect(handler).toHaveBeenCalledWith({ type: 'bookFlight', itineraryId: 'FLT-1' });

    const cancelButton = screen.getByTestId('flight-cancel-button');
    await user.click(cancelButton);
    expect(handler).toHaveBeenCalledWith({ type: 'cancelFlight', pnr: 'ABC123' });
  });
});

describe('StructuredPayloadRenderer - hotels', () => {
  it('renders hotel cards with occupancy details and trigger actions', async () => {
    const user = userEvent.setup();
    const handler = jest.fn();

    const payload: AgentStructuredPayload = {
      raw: null,
      source: 'hotels',
      data: [
        {
          hotelId: 'HTL-1',
          name: 'Copacabana Palace',
          city: 'Rio de Janeiro',
          totalLabel: 'R$ 10.800,00',
          breakfastIncluded: true,
          refundable: true,
          reservationId: 'RES-900',
          status: 'BOOKED',
          summary: {
            checkin: '2025-12-28',
            checkout: '2026-01-03',
            rooms: 1,
            nights: 6,
          },
          adults: 2,
          children: 1,
          specialRequests: 'Vista parcial para o mar.',
          cancellationPolicy: 'Cancelamento gratuito até 48h antes.',
          galleryImageUrls: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
        },
      ],
    };

    renderWithPayload(payload, handler);

    const card = screen.getByTestId('hotel-card');
    expect(card).toHaveAttribute('data-hotel-id', 'HTL-1');
    expect(screen.getByText('Copacabana Palace')).toBeInTheDocument();
    expect(screen.getByText('28/12/2025 · 03/01/2026')).toBeInTheDocument();
    expect(screen.getByText('Reserva: RES-900')).toBeInTheDocument();
    expect(screen.getByText('1 quarto · 6 noites · 2 adultos e 1 criança')).toBeInTheDocument();

    const viewButton = screen.getByTestId('hotel-details-toggle');
    await user.click(viewButton);
    expect(screen.getByTestId('hotel-details')).toBeInTheDocument();
    expect(screen.getByText('Política de cancelamento')).toBeInTheDocument();

    const reserveButton = screen.getByTestId('hotel-book-button');
    await user.click(reserveButton);
    expect(handler).toHaveBeenCalledWith({ type: 'bookHotel', hotelId: 'HTL-1' });

    const cancelButton = screen.getByTestId('hotel-cancel-button');
    await user.click(cancelButton);
    expect(handler).toHaveBeenCalledWith({ type: 'cancelHotel', reservationId: 'RES-900' });
  });
});
