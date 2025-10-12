import type { ReactNode } from 'react';
import type { AgentStructuredPayload, ChatAction, DestinationOption, FlightItinerary, HotelOption } from '../../types';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

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
      <Card className="structured-card structured-card--flights">
        <div className="structured-card__header">
          <h3>Opções de voo</h3>
          {payload.message && <p className="structured-card__message">{payload.message}</p>}
        </div>
        <div className="structured-card__grid">
          {flights.map((flight) => (
            <article key={flight.itineraryId} className="structured-card__item">
              <header className="structured-card__item-header">
                <span className="structured-card__chip">{flight.airline ?? 'Companhia aérea'}</span>
                {typeof flight.stops === 'number' && (
                  <span className="structured-card__subtle">{flight.stops === 0 ? 'Direto' : `${flight.stops} parada(s)`}</span>
                )}
              </header>
              <div className="structured-card__block">
                <p className="structured-card__title">
                  {formatSegmentLabel(flight.summary?.origin?.city, flight.summary?.destination?.city)}
                </p>
                <p className="structured-card__details">
                  {formatDateRange(flight.summary?.departDate, flight.summary?.returnDate)}
                </p>
              </div>
              <div className="structured-card__price-row">
                <strong>{flight.totalLabel ?? flight.currency ?? ''}</strong>
                {flight.baggageIncluded ? <span className="structured-card__badge">Bagagem incluída</span> : null}
              </div>
              <div className="structured-card__actions">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onAction?.({ type: 'bookFlight', itineraryId: flight.itineraryId })}
                >
                  Reservar
                </Button>
              </div>
            </article>
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
      <Card className="structured-card structured-card--hotels">
        <div className="structured-card__header">
          <h3>Opções de hospedagem</h3>
          {payload.message && <p className="structured-card__message">{payload.message}</p>}
        </div>
        <div className="structured-card__grid">
          {hotels.map((hotel) => (
            <article key={hotel.hotelId} className="structured-card__item">
              <header className="structured-card__item-header">
                <span className="structured-card__chip">{hotel.city ?? 'Hotel'}</span>
                {typeof hotel.rating === 'number' && hotel.rating > 0 && (
                  <span className="structured-card__subtle">{hotel.rating.toFixed(1)} ★ ({hotel.reviewCount ?? 0})</span>
                )}
              </header>
              {renderHeroImage(hotel.heroImageUrl, hotel.name ?? hotel.city ?? hotel.hotelId)}
              <div className="structured-card__block">
                <p className="structured-card__title">{hotel.name}</p>
                <p className="structured-card__details">{hotel.summary?.checkin} → {hotel.summary?.checkout}</p>
              </div>
              <div className="structured-card__price-row">
                <strong>{hotel.totalLabel ?? hotel.nightlyLabel ?? ''}</strong>
                {hotel.breakfastIncluded ? <span className="structured-card__badge">Café incluído</span> : null}
                {hotel.refundable ? <span className="structured-card__badge">Cancelamento flexível</span> : null}
              </div>
              {renderGalleryThumbnails(hotel.galleryImageUrls, hotel.name ?? hotel.city ?? 'Hotel')}
              <div className="structured-card__actions">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onAction?.({ type: 'bookHotel', hotelId: hotel.hotelId })}
                >
                  Reservar
                </Button>
              </div>
            </article>
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
      <Card className="structured-card structured-card--destinations">
        <div className="structured-card__header">
          <h3>Ideias de destino</h3>
          {payload.message && <p className="structured-card__message">{payload.message}</p>}
        </div>
        <div className="structured-card__grid">
          {destinations.map((destination) => (
            <article key={destination.id} className="structured-card__item">
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

function parseFlightRecord(record: Record<string, unknown>): FlightItinerary | null {
  if (typeof record.itineraryId !== 'string' || record.itineraryId.length === 0) {
    return null;
  }

  const itinerary: FlightItinerary = {
    itineraryId: record.itineraryId,
  };

  if (typeof record.airline === 'string') {
    itinerary.airline = record.airline;
  }
  if (typeof record.totalPrice === 'number') {
    itinerary.totalPrice = record.totalPrice;
  }
  if (typeof record.currency === 'string') {
    itinerary.currency = record.currency;
  }
  if (typeof record.totalLabel === 'string') {
    itinerary.totalLabel = record.totalLabel;
  }
  if (typeof record.stops === 'number') {
    itinerary.stops = record.stops;
  }
  if (typeof record.baggageIncluded === 'boolean') {
    itinerary.baggageIncluded = record.baggageIncluded;
  }

  itinerary.summary = parseSummary(record.summary);
  return itinerary;
}

function parseHotelRecord(record: Record<string, unknown>): HotelOption | null {
  if (typeof record.hotelId !== 'string' || record.hotelId.length === 0) {
    return null;
  }

  const hotel: HotelOption = {
    hotelId: record.hotelId,
  };

  if (typeof record.name === 'string') {
    hotel.name = record.name;
  }
  if (typeof record.city === 'string') {
    hotel.city = record.city;
  }
  hotel.heroImageUrl = readString(record, 'heroImageUrl');
  hotel.galleryImageUrls = parseStringArray(record.galleryImageUrls);
  if (typeof record.rating === 'number') {
    hotel.rating = record.rating;
  }
  if (typeof record.reviewCount === 'number') {
    hotel.reviewCount = record.reviewCount;
  }
  if (typeof record.nightlyLabel === 'string') {
    hotel.nightlyLabel = record.nightlyLabel;
  }
  if (typeof record.totalLabel === 'string') {
    hotel.totalLabel = record.totalLabel;
  }
  if (typeof record.nightlyRate === 'number') {
    hotel.nightlyRate = record.nightlyRate;
  }
  if (typeof record.total === 'number') {
    hotel.total = record.total;
  }
  if (typeof record.currency === 'string') {
    hotel.currency = record.currency;
  }
  if (typeof record.breakfastIncluded === 'boolean') {
    hotel.breakfastIncluded = record.breakfastIncluded;
  }
  if (typeof record.refundable === 'boolean') {
    hotel.refundable = record.refundable;
  }

  hotel.summary = parseStaySummary(record.summary);
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
