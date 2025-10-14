import { useState, type ReactNode } from 'react';
import type {
  AgentStructuredPayload,
  ChatAction,
  DestinationOption,
  FlightItinerary,
  FlightSegment,
  HotelOption,
} from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StructuredPayloadRendererProps {
  payload: AgentStructuredPayload;
  onAction?: (action: ChatAction) => void;
}

export function StructuredPayloadRenderer({ payload, onAction }: Readonly<StructuredPayloadRendererProps>) {
  if (payload.error) {
    return (
      <Card className="structured-card structured-card--error">
        <div className="structured-card__header">
          <h3>Ops, algo deu errado</h3>
          {payload.message && <p className="structured-card__message">{payload.message}</p>}
        </div>
        {renderList('Próximos passos', payload.nextSteps)}
      </Card>
    );
  }

  if (payload.source === 'flights') {
    const flights = toFlightItineraries(payload);
    if (flights.length === 0) {
      return null;
    }
    return (
      <Card
        className="structured-card structured-card--flights"
        data-test-id="structured-card-flights"
      >
        <div className="structured-card__header">
          <h3>Opções de voo</h3>
          {payload.message && <p className="structured-card__message">{payload.message}</p>}
        </div>
        <div className="structured-card__grid">
          {flights.map((flight) => (
            <FlightCard key={flight.itineraryId} flight={flight} onAction={onAction} />
          ))}
        </div>
        {renderList('Sugestões', payload.suggestions)}
      </Card>
    );
  }

  if (payload.source === 'hotels') {
    const hotels = toHotelOptions(payload);
    if (hotels.length === 0) {
      return null;
    }
    return (
      <Card
        className="structured-card structured-card--hotels"
        data-test-id="structured-card-hotels"
      >
        <div className="structured-card__header">
          <h3>Opções de hospedagem</h3>
          {payload.message && <p className="structured-card__message">{payload.message}</p>}
        </div>
        <div className="structured-card__grid">
          {hotels.map((hotel) => (
            <HotelCard key={hotel.hotelId} hotel={hotel} onAction={onAction} />
          ))}
        </div>
        {renderList('Sugestões', payload.suggestions)}
      </Card>
    );
  }

  if (payload.source === 'destinations') {
    const destinations = toDestinationOptions(payload);
    if (destinations.length === 0) {
      return null;
    }
    return (
      <Card
        className="structured-card structured-card--destinations"
        data-test-id="structured-card-destinations"
      >
        <div className="structured-card__header">
          <h3>Ideias de destino</h3>
          {payload.message && <p className="structured-card__message">{payload.message}</p>}
        </div>
        <div className="structured-card__grid">
          {destinations.map((destination) => (
            <article
              key={destination.id}
              className="structured-card__item"
              data-test-id="destination-card"
              data-destination-id={destination.id}
            >
              <header className="structured-card__item-header">
                <span className="structured-card__chip">{destination.country ?? 'Destino'}</span>
                {destination.bestMonths && destination.bestMonths.length > 0 && (
                  <span className="structured-card__subtle">Melhor época: {destination.bestMonths.join(', ')}</span>
                )}
              </header>
              {renderHeroImage(destination.heroImageUrl, destination.name ?? destination.city ?? 'Destino')}
              <div className="structured-card__block">
                <p className="structured-card__title">{destination.name}</p>
                <p className="structured-card__details">{destination.city}</p>
                {destination.summary && <p className="structured-card__description">{destination.summary}</p>}
              </div>
              {renderGalleryThumbnails(destination.galleryImageUrls, destination.name ?? destination.city ?? 'Destino')}
              {destination.categories && destination.categories.length > 0 ? (
                <div className="structured-card__tags">
                  {destination.categories.slice(0, 4).map((category) => (
                    <Badge key={`${destination.id}-${category?.slug ?? category?.name}`} className="structured-card__tag">
                      {category?.name}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
        {renderList('Próximos passos', payload.suggestions)}
      </Card>
    );
  }

  if (payload.message) {
    return (
      <Card className="structured-card">
        <div className="structured-card__header">
          <h3>Detalhes</h3>
          <p className="structured-card__message">{payload.message}</p>
        </div>
        {renderList('Sugestões', payload.suggestions)}
      </Card>
    );
  }

  if (payload.raw) {
    return (
      <Card className="structured-card">
        <pre className="structured-card__code">{JSON.stringify(payload.raw, null, 2)}</pre>
      </Card>
    );
  }

  return null;
}

interface FlightCardProps {
  flight: FlightItinerary;
  onAction?: (action: ChatAction) => void;
}

function FlightCard({ flight, onAction }: Readonly<FlightCardProps>) {
  const [expanded, setExpanded] = useState(false);
  const hasSegments =
    (flight.outbound && flight.outbound.length > 0) || (flight.inbound && flight.inbound.length > 0);
  const canTriggerActions = typeof onAction === 'function';
  const statusLabel = formatStatusLabel(flight.status);
  const adultsLabel =
    typeof flight.summary?.adults === 'number' && flight.summary.adults > 0
      ? `${flight.summary.adults} adulto${flight.summary.adults > 1 ? 's' : ''}`
      : null;
  const metaItems = [flight.pnr ? `PNR: ${flight.pnr}` : null, statusLabel ? `Status: ${statusLabel}` : null, adultsLabel]
    .filter((item): item is string => Boolean(item));

  const handleBook = () => {
    if (canTriggerActions) {
      onAction?.({ type: 'bookFlight', itineraryId: flight.itineraryId });
    }
  };

  const handleCancel = () => {
    if (canTriggerActions && flight.pnr) {
      onAction?.({ type: 'cancelFlight', pnr: flight.pnr });
    }
  };

  return (
    <article className="structured-card__item" data-test-id="flight-card" data-itinerary-id={flight.itineraryId}>
      <header className="structured-card__item-header">
        <span className="structured-card__chip">{flight.airline ?? 'Companhia aérea'}</span>
        {typeof flight.stops === 'number' ? (
          <span className="structured-card__subtle">{formatStopsLabel(flight.stops)}</span>
        ) : null}
      </header>
      <div className="structured-card__block">
        <p className="structured-card__title">
          {formatSegmentLabel(flight.summary?.origin?.city, flight.summary?.destination?.city)}
        </p>
        <p className="structured-card__details">{formatDateRange(flight.summary?.departDate, flight.summary?.returnDate)}</p>
      </div>
      <div className="structured-card__price-row">
        <strong>{flight.totalLabel ?? flight.currency ?? ''}</strong>
        {flight.baggageIncluded ? <span className="structured-card__badge">Bagagem incluída</span> : null}
      </div>
      {metaItems.length > 0 ? (
        <div className="structured-card__meta">
          {metaItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}
      <div className="structured-card__actions">
        <div className="structured-card__actions-toggle">
          {hasSegments ? (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              data-test-id="flight-details-toggle"
            >
              {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
            </Button>
          ) : null}
        </div>
        <div className="structured-card__actions-buttons">
          {flight.pnr ? (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={handleCancel}
              disabled={!canTriggerActions}
              data-test-id="flight-cancel-button"
            >
              Cancelar
            </Button>
          ) : null}
          <Button
            variant="default"
            size="sm"
            type="button"
            onClick={handleBook}
            disabled={!canTriggerActions}
            data-test-id="flight-book-button"
          >
            Reservar
          </Button>
        </div>
      </div>
      {expanded && hasSegments ? (
      <div className="structured-card__segments" data-test-id="flight-segments">
          {renderSegmentGroup('Trecho de ida', flight.outbound)}
          {renderSegmentGroup('Trecho de volta', flight.inbound)}
        </div>
      ) : null}
    </article>
  );
}

interface HotelCardProps {
  hotel: HotelOption;
  onAction?: (action: ChatAction) => void;
}

function HotelCard({ hotel, onAction }: Readonly<HotelCardProps>) {
  const [expanded, setExpanded] = useState(false);
  const canTriggerActions = typeof onAction === 'function';
  const stayLabel = formatStayRange(hotel.summary);
  const occupancyLabel = buildHotelOccupancyLabel(hotel);
  const statusLabel = formatStatusLabel(hotel.status);
  const detailItems = buildHotelDetailItems(hotel);
  const hasDetails = detailItems.length > 0 || Boolean(hotel.specialRequests) || Boolean(hotel.cancellationPolicy);
  const metaItems = [
    hotel.reservationId ? `Reserva: ${hotel.reservationId}` : null,
    statusLabel ? `Status: ${statusLabel}` : null,
    occupancyLabel,
  ].filter((item): item is string => Boolean(item));

  const handleBook = () => {
    if (canTriggerActions) {
      onAction?.({ type: 'bookHotel', hotelId: hotel.hotelId });
    }
  };

  const handleCancel = () => {
    if (canTriggerActions && hotel.reservationId) {
      onAction?.({ type: 'cancelHotel', reservationId: hotel.reservationId });
    }
  };

  return (
    <article className="structured-card__item" data-test-id="hotel-card" data-hotel-id={hotel.hotelId}>
      <header className="structured-card__item-header">
        <span className="structured-card__chip">{hotel.city ?? 'Hotel'}</span>
        {typeof hotel.rating === 'number' && hotel.rating > 0 ? (
          <span className="structured-card__subtle">
            {hotel.rating.toFixed(1)} ★{typeof hotel.reviewCount === 'number' ? ` (${hotel.reviewCount})` : ''}
          </span>
        ) : null}
      </header>
      {renderHeroImage(hotel.heroImageUrl, hotel.name ?? hotel.city ?? hotel.hotelId)}
      <div className="structured-card__block">
        <p className="structured-card__title">{hotel.name}</p>
        <p className="structured-card__details">{stayLabel}</p>
      </div>
      <div className="structured-card__price-row">
        <strong>{hotel.totalLabel ?? hotel.nightlyLabel ?? hotel.currency ?? ''}</strong>
        {hotel.breakfastIncluded ? <span className="structured-card__badge">Café incluído</span> : null}
        {hotel.refundable ? <span className="structured-card__badge">Cancelamento flexível</span> : null}
      </div>
      {metaItems.length > 0 ? (
        <div className="structured-card__meta">
          {metaItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}
      {renderGalleryThumbnails(hotel.galleryImageUrls, hotel.name ?? hotel.city ?? 'Hotel')}
      <div className="structured-card__actions">
        <div className="structured-card__actions-toggle">
          {hasDetails ? (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              data-test-id="hotel-details-toggle"
            >
              {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
            </Button>
          ) : null}
        </div>
        <div className="structured-card__actions-buttons">
          {hotel.reservationId ? (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={handleCancel}
              disabled={!canTriggerActions}
              data-test-id="hotel-cancel-button"
            >
              Cancelar
            </Button>
          ) : null}
          <Button
            variant="default"
            size="sm"
            type="button"
            onClick={handleBook}
            disabled={!canTriggerActions}
            data-test-id="hotel-book-button"
          >
            Reservar
          </Button>
        </div>
      </div>
      {expanded && hasDetails ? (
        <div className="structured-card__details" data-test-id="hotel-details">
          {detailItems.length > 0 ? (
            <ul className="structured-card__detail-list">
              {detailItems.map((detail) => (
                <li key={detail.label} className="structured-card__detail">
                  <span className="structured-card__detail-label">{detail.label}</span>
                  <span className="structured-card__detail-value">{detail.value}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {hotel.specialRequests ? (
            <div className="structured-card__note">
              <strong>Observações</strong>
              <p>{hotel.specialRequests}</p>
            </div>
          ) : null}
          {hotel.cancellationPolicy ? (
            <div className="structured-card__note">
              <strong>Política de cancelamento</strong>
              <p>{hotel.cancellationPolicy}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function toFlightItineraries(payload: AgentStructuredPayload): FlightItinerary[] {
  if (!Array.isArray(payload.data)) {
    return [];
  }

  return payload.data
    .map((entry) => (isRecord(entry) ? parseFlightRecord(entry) : null))
    .filter((flight): flight is FlightItinerary => flight !== null);
}

function toHotelOptions(payload: AgentStructuredPayload): HotelOption[] {
  if (!Array.isArray(payload.data)) {
    return [];
  }

  return payload.data
    .map((entry) => (isRecord(entry) ? parseHotelRecord(entry) : null))
    .filter((hotel): hotel is HotelOption => hotel !== null);
}

function toDestinationOptions(payload: AgentStructuredPayload): DestinationOption[] {
  if (!Array.isArray(payload.data)) {
    return [];
  }

  return payload.data
    .map((entry) => (isRecord(entry) ? parseDestinationRecord(entry) : null))
    .filter((destination): destination is DestinationOption => destination !== null);
}

function parseSummary(summary: unknown): FlightItinerary['summary'] {
  if (!summary || typeof summary !== 'object') {
    return null;
  }
  const record = summary as Record<string, unknown>;
  return {
    origin: parseLocation(record.origin),
    destination: parseLocation(record.destination),
    departDate: typeof record.departDate === 'string' ? record.departDate : null,
    returnDate: typeof record.returnDate === 'string' ? record.returnDate : null,
    adults: typeof record.adults === 'number' ? record.adults : null,
  };
}

function parseStaySummary(summary: unknown): HotelOption['summary'] {
  if (!summary || typeof summary !== 'object') {
    return null;
  }
  const record = summary as Record<string, unknown>;
  return {
    checkin: typeof record.checkin === 'string' ? record.checkin : null,
    checkout: typeof record.checkout === 'string' ? record.checkout : null,
    rooms: typeof record.rooms === 'number' ? record.rooms : null,
    nights: typeof record.nights === 'number' ? record.nights : null,
  };
}

function mergeStaySummary(
  base: HotelOption['summary'],
  fallback: Partial<NonNullable<HotelOption['summary']>>,
): HotelOption['summary'] {
  if (!base && !fallback) {
    return null;
  }

  return {
    checkin: base?.checkin ?? fallback.checkin ?? null,
    checkout: base?.checkout ?? fallback.checkout ?? null,
    rooms: base?.rooms ?? fallback.rooms ?? null,
    nights: base?.nights ?? fallback.nights ?? null,
  };
}

type FlightSummary = NonNullable<FlightItinerary['summary']>;
type FlightLocation = NonNullable<FlightSummary['origin']>;

function parseLocation(input: unknown): FlightLocation | null {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const record = input as Record<string, unknown>;
  return {
    code: typeof record.code === 'string' ? record.code : null,
    city: typeof record.city === 'string' ? record.city : null,
    airport: typeof record.airport === 'string' ? record.airport : null,
  };
}

function parseLocationFlexible(input: unknown): FlightLocation | null {
  if (typeof input === 'string' && input.trim().length > 0) {
    return {
      code: input.trim().toUpperCase(),
      city: null,
      airport: null,
    };
  }
  return parseLocation(input);
}

function mergeFlightSummary(
  base: FlightItinerary['summary'],
  fallback: Partial<NonNullable<FlightItinerary['summary']>>,
): FlightItinerary['summary'] {
  if (!base && !fallback) {
    return null;
  }

  return {
    origin: base?.origin ?? fallback.origin ?? null,
    destination: base?.destination ?? fallback.destination ?? null,
    departDate: base?.departDate ?? fallback.departDate ?? null,
    returnDate: base?.returnDate ?? fallback.returnDate ?? null,
    adults: base?.adults ?? fallback.adults ?? null,
  };
}

function parseFlightSegments(candidate: unknown): FlightSegment[] | null {
  if (!Array.isArray(candidate)) {
    return null;
  }

  const segments: FlightSegment[] = [];
  for (const entry of candidate) {
    if (!isRecord(entry)) {
      continue;
    }
    const segment: FlightSegment = {
      airline: readString(entry, 'airline'),
      flightNumber: readString(entry, 'flightNumber'),
      duration: readString(entry, 'duration'),
      departure: parseSegmentEndpoint(entry.departure),
      arrival: parseSegmentEndpoint(entry.arrival),
    };

    if (
      segment.airline ||
      segment.flightNumber ||
      segment.duration ||
      segment.departure ||
      segment.arrival
    ) {
      segments.push(segment);
    }
  }

  return segments.length > 0 ? segments : null;
}

function parseSegmentEndpoint(candidate: unknown): FlightSegment['departure'] {
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return {
      airport: candidate.trim().toUpperCase(),
    };
  }
  if (!isRecord(candidate)) {
    return null;
  }

  return {
    airport: readString(candidate, 'airport'),
    time: readString(candidate, 'time'),
    date: readString(candidate, 'date'),
  };
}

function renderList(title: string, items?: string[]): ReactNode {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="structured-card__list">
      <p className="structured-card__list-title">{title}</p>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function renderHeroImage(imageUrl?: string | null, altText?: string | null) {
  if (!imageUrl) {
    return null;
  }
  return (
    <div className="structured-card__media">
      <img src={imageUrl} alt={altText ?? 'Imagem ilustrativa'} loading="lazy" />
    </div>
  );
}

function renderGalleryThumbnails(images?: string[] | null, labelContext?: string | null) {
  if (!images || images.length === 0) {
    return null;
  }
  const thumbnails = images.slice(0, 3);
  const contextLabel = labelContext ?? 'local';
  return (
    <ul className="structured-card__gallery" aria-label={`Mais fotos de ${contextLabel}`}>
      {thumbnails.map((url, index) => (
        <li key={`${url}-${index}`} className="structured-card__thumbnail">
          <img src={url} alt={`${contextLabel} - imagem ${index + 1}`} loading="lazy" />
        </li>
      ))}
    </ul>
  );
}

function formatStopsLabel(stops: number): string {
  if (stops <= 0) {
    return 'Direto';
  }
  if (stops === 1) {
    return '1 parada';
  }
  return `${stops} paradas`;
}

function renderSegmentGroup(label: string, segments?: FlightSegment[] | null) {
  if (!segments || segments.length === 0) {
    return null;
  }

  return (
    <section className="structured-card__segment-group" data-test-id="flight-segment-group">
      <p className="structured-card__segment-title">{label}</p>
      <ul className="structured-card__segment-list">
        {segments.map((segment, index) => (
          <li
            key={`${segment.flightNumber ?? segment.airline ?? 'segment'}-${index}`}
            className="structured-card__segment"
          >
            <div className="structured-card__segment-header">
              <span className="structured-card__segment-flight">
                {(segment.airline ?? 'Voo').trim()} {segment.flightNumber ?? ''}
              </span>
              {segment.duration ? <span className="structured-card__segment-duration">{segment.duration}</span> : null}
            </div>
            <div className="structured-card__segment-body">
              <div className="structured-card__segment-point">
                <span className="structured-card__segment-airport">{formatAirportCode(segment.departure)}</span>
                <span className="structured-card__segment-time">{formatTimePoint(segment.departure)}</span>
              </div>
              <span className="structured-card__segment-separator" aria-hidden="true">
                →
              </span>
              <div className="structured-card__segment-point structured-card__segment-point--arrival">
                <span className="structured-card__segment-airport">{formatAirportCode(segment.arrival)}</span>
                <span className="structured-card__segment-time">{formatTimePoint(segment.arrival)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatAirportCode(point?: FlightSegment['departure']): string {
  if (point?.airport) {
    return point.airport;
  }
  return '—';
}

function formatTimePoint(point?: FlightSegment['departure']): string {
  if (!point) {
    return 'Horário a confirmar';
  }
  const segments: string[] = [];
  if (point.time) {
    segments.push(point.time);
  }
  const formattedDate = formatDisplayDate(point.date);
  if (formattedDate) {
    segments.push(formattedDate);
  }
  return segments.length > 0 ? segments.join(' · ') : 'Horário a confirmar';
}

function formatStayRange(summary?: HotelOption['summary'] | null): string {
  if (!summary) {
    return 'Datas a confirmar';
  }
  const checkin = formatDisplayDate(summary.checkin);
  const checkout = formatDisplayDate(summary.checkout);
  if (checkin && checkout) {
    return `${checkin} · ${checkout}`;
  }
  if (checkin) {
    return checkin;
  }
  if (checkout) {
    return checkout;
  }
  return 'Datas a confirmar';
}

function buildHotelOccupancyLabel(hotel: HotelOption): string | null {
  const pieces: string[] = [];
  if (typeof hotel.rooms === 'number' && hotel.rooms > 0) {
    pieces.push(formatCount(hotel.rooms, 'quarto', 'quartos'));
  }
  if (typeof hotel.nights === 'number' && hotel.nights > 0) {
    pieces.push(formatCount(hotel.nights, 'noite', 'noites'));
  }
  const guestParts: string[] = [];
  if (typeof hotel.adults === 'number' && hotel.adults > 0) {
    guestParts.push(formatCount(hotel.adults, 'adulto', 'adultos'));
  }
  if (typeof hotel.children === 'number' && hotel.children > 0) {
    guestParts.push(formatCount(hotel.children, 'criança', 'crianças'));
  }
  if (guestParts.length > 0) {
    pieces.push(guestParts.join(' e '));
  }
  return pieces.length > 0 ? pieces.join(' · ') : null;
}

function buildHotelDetailItems(hotel: HotelOption): Array<{ label: string; value: string }> {
  const items: Array<{ label: string; value: string }> = [];
  const summary = hotel.summary;
  const checkin = formatDisplayDate(summary?.checkin);
  if (checkin) {
    items.push({ label: 'Check-in', value: checkin });
  }
  const checkout = formatDisplayDate(summary?.checkout);
  if (checkout) {
    items.push({ label: 'Check-out', value: checkout });
  }
  if (typeof summary?.rooms === 'number' && summary.rooms > 0) {
    items.push({ label: 'Quartos', value: formatCount(summary.rooms, 'quarto', 'quartos') });
  }
  if (typeof summary?.nights === 'number' && summary.nights > 0) {
    items.push({ label: 'Noites', value: formatCount(summary.nights, 'noite', 'noites') });
  }
  const guests: string[] = [];
  if (typeof hotel.adults === 'number' && hotel.adults > 0) {
    guests.push(formatCount(hotel.adults, 'adulto', 'adultos'));
  }
  if (typeof hotel.children === 'number' && hotel.children > 0) {
    guests.push(formatCount(hotel.children, 'criança', 'crianças'));
  }
  if (guests.length > 0) {
    items.push({ label: 'Hóspedes', value: guests.join(' · ') });
  }
  return items;
}

function formatDisplayDate(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  return value;
}

function formatCount(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatStatusLabel(status?: string | null): string | null {
  if (!status) {
    return null;
  }
  const normalized = status.trim().toLowerCase();
  const dictionary: Record<string, string> = {
    ticketed: 'Ticketed',
    booked: 'Reservado',
    canceled: 'Cancelado',
    cancelled: 'Cancelado',
  };
  if (dictionary[normalized]) {
    return dictionary[normalized];
  }
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function parseFlightRecord(record: Record<string, unknown>): FlightItinerary | null {
  const itineraryId = readString(record, 'itineraryId');
  if (!itineraryId) {
    return null;
  }

  const itinerary: FlightItinerary = {
    itineraryId,
    airline: readString(record, 'airline'),
    totalPrice: typeof record.totalPrice === 'number' ? record.totalPrice : null,
    currency: readString(record, 'currency'),
    totalLabel: readString(record, 'totalLabel'),
    stops: typeof record.stops === 'number' ? record.stops : null,
    baggageIncluded: typeof record.baggageIncluded === 'boolean' ? record.baggageIncluded : null,
    status: readString(record, 'status'),
    pnr: readString(record, 'pnr'),
  };

  itinerary.outbound = parseFlightSegments(record.outbound ?? record.outboundSegments);
  itinerary.inbound = parseFlightSegments(record.inbound ?? record.inboundSegments);

  const summary = parseSummary(record.summary);
  const fallbackSummary = {
    origin: parseLocationFlexible(record.origin),
    destination: parseLocationFlexible(record.destination),
    departDate: readString(record, 'departDate'),
    returnDate: readString(record, 'returnDate'),
    adults: typeof record.adults === 'number' ? record.adults : null,
  };
  itinerary.summary = mergeFlightSummary(summary, fallbackSummary);

  return itinerary;
}

function parseHotelRecord(record: Record<string, unknown>): HotelOption | null {
  const hotelId = readString(record, 'hotelId');
  if (!hotelId) {
    return null;
  }

  const hotel: HotelOption = {
    hotelId,
    name: readString(record, 'name'),
    city: readString(record, 'city'),
    address: readString(record, 'address'),
    heroImageUrl: readString(record, 'heroImageUrl'),
    galleryImageUrls: parseStringArray(record.galleryImageUrls),
    rating: typeof record.rating === 'number' ? record.rating : null,
    reviewCount: typeof record.reviewCount === 'number' ? record.reviewCount : null,
    nightlyLabel: readString(record, 'nightlyLabel'),
    totalLabel: readString(record, 'totalLabel'),
    nightlyRate: typeof record.nightlyRate === 'number' ? record.nightlyRate : null,
    total: typeof record.total === 'number' ? record.total : null,
    currency: readString(record, 'currency'),
    breakfastIncluded: typeof record.breakfastIncluded === 'boolean' ? record.breakfastIncluded : null,
    refundable: typeof record.refundable === 'boolean' ? record.refundable : null,
    cancellationPolicy: readString(record, 'cancellationPolicy'),
    reservationId: readString(record, 'reservationId'),
    status: readString(record, 'status'),
    specialRequests: readString(record, 'specialRequests'),
    adults: typeof record.adults === 'number' ? record.adults : null,
    children: typeof record.children === 'number' ? record.children : null,
    rooms: typeof record.rooms === 'number' ? record.rooms : null,
    nights: typeof record.nights === 'number' ? record.nights : null,
  };

  const summary = parseStaySummary(record.summary);
  const fallbackSummary = {
    checkin: readString(record, 'checkin'),
    checkout: readString(record, 'checkout'),
    rooms: typeof record.rooms === 'number' ? record.rooms : null,
    nights: typeof record.nights === 'number' ? record.nights : null,
  };
  hotel.summary = mergeStaySummary(summary, fallbackSummary);

  if (!hotel.rooms && hotel.summary?.rooms) {
    hotel.rooms = hotel.summary.rooms;
  }
  if (!hotel.nights && hotel.summary?.nights) {
    hotel.nights = hotel.summary.nights;
  }

  return hotel;
}

function parseDestinationRecord(record: Record<string, unknown>): DestinationOption | null {
  const id = readString(record, 'id');
  if (!id) {
    return null;
  }

  const destination: DestinationOption = { id };
  destination.name = readString(record, 'name');
  destination.city = readString(record, 'city');
  destination.country = readString(record, 'country');
  destination.summary = readString(record, 'summary');
  destination.heroImageUrl = readString(record, 'heroImageUrl');
  destination.galleryImageUrls = parseStringArray(record.galleryImageUrls);

  const months = parseStringArray(record.bestMonths);
  destination.bestMonths = months;

  destination.categories = parseDestinationCategories(record.categories);

  return destination;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function parseStringArray(candidate: unknown): string[] | null {
  if (!Array.isArray(candidate)) {
    return null;
  }
  const values = candidate.filter((item): item is string => typeof item === 'string');
  return values.length > 0 ? values : null;
}

function parseDestinationCategories(candidate: unknown): DestinationOption['categories'] {
  if (!Array.isArray(candidate)) {
    return null;
  }

  const categories: NonNullable<DestinationOption['categories']> = [];
  for (const entry of candidate) {
    if (!isRecord(entry)) {
      continue;
    }
    const name = readString(entry, 'name');
    const slug = readString(entry, 'slug');
    const categoryId = readString(entry, 'id');
    if (name || slug || categoryId) {
      categories.push({ id: categoryId, name, slug });
    }
  }

  return categories.length > 0 ? categories : null;
}

function formatSegmentLabel(origin?: string | null, destination?: string | null): string {
  if (origin && destination) {
    return `${origin} → ${destination}`;
  }
  if (origin) {
    return origin;
  }
  if (destination) {
    return destination;
  }
  return 'Itinerário';
}

function formatDateRange(departDate?: string | null, returnDate?: string | null): string {
  if (departDate && returnDate) {
    return `${departDate} · ${returnDate}`;
  }
  if (departDate) {
    return departDate;
  }
  return 'Datas a confirmar';
}
