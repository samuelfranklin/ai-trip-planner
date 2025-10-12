-- CreateEnum
CREATE TYPE "FlightBookingStatus" AS ENUM ('TICKETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "HotelBookingStatus" AS ENUM ('BOOKED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('PREFERENCE', 'FACT', 'CONSTRAINT', 'CONTEXT');

-- CreateEnum
CREATE TYPE "MemorySource" AS ENUM ('EXPLICIT', 'INFERRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "preferredClass" VARCHAR(20),
    "budgetMin" DECIMAL(10,2),
    "budgetMax" DECIMAL(10,2),
    "preferredLanguage" VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "travelFrequency" VARCHAR(20),
    "travelPurpose" TEXT[],
    "budgetLevel" VARCHAR(20),
    "dietaryRestrictions" TEXT[],
    "mobilityNeeds" VARCHAR(255),
    "languagesSpoken" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_interests" (
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "weight" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_interests_pkey" PRIMARY KEY ("userId","categoryId")
);

-- CreateTable
CREATE TABLE "conversation_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "intent" VARCHAR(100),
    "currentStep" VARCHAR(100),
    "context" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "conversation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "intent" VARCHAR(100),
    "entities" JSONB,
    "sentiment" VARCHAR(20),
    "toolCalls" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_memories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memoryType" "MemoryType" NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL,
    "extractedFrom" VARCHAR(255),
    "source" "MemorySource" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timesReferenced" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "conversationId" TEXT,
    "searchType" VARCHAR(50) NOT NULL,
    "parameters" JSONB NOT NULL,
    "results" JSONB,
    "resultsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airports" (
    "id" TEXT NOT NULL,
    "iataCode" VARCHAR(3) NOT NULL,
    "icaoCode" VARCHAR(4),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100),
    "country" VARCHAR(100) NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "region" VARCHAR(50) NOT NULL,
    "continent" VARCHAR(20) NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "timezone" VARCHAR(50),
    "isInternational" BOOLEAN NOT NULL DEFAULT false,
    "popularityScore" INTEGER DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "alternativeAirports" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "airports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_itineraries" (
    "id" TEXT NOT NULL,
    "itineraryId" VARCHAR(100) NOT NULL,
    "origin" VARCHAR(3) NOT NULL,
    "destination" VARCHAR(3) NOT NULL,
    "departDate" DATE NOT NULL,
    "returnDate" DATE,
    "airline" VARCHAR(100) NOT NULL,
    "stops" INTEGER NOT NULL DEFAULT 0,
    "baggageIncluded" BOOLEAN NOT NULL DEFAULT false,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BRL',
    "outboundSegments" JSONB NOT NULL,
    "inboundSegments" JSONB,
    "popularityScore" INTEGER DEFAULT 0,
    "comfortScore" INTEGER,
    "layoverQuality" VARCHAR(20),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flight_itineraries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" VARCHAR(500),
    "bestMonths" INTEGER[],
    "averageBudget" DECIMAL(10,2),
    "popularityScore" INTEGER NOT NULL DEFAULT 0,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "timezone" VARCHAR(50),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destination_categories" (
    "destinationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "destination_categories_pkey" PRIMARY KEY ("destinationId","categoryId")
);

-- CreateTable
CREATE TABLE "points_of_interest" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" VARCHAR(500),
    "address" VARCHAR(500),
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "rating" DECIMAL(3,2),
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "website" VARCHAR(255),
    "phoneNumber" VARCHAR(50),
    "openingHours" JSONB,
    "ticketPrice" DECIMAL(10,2),
    "currency" VARCHAR(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "points_of_interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poi_categories" (
    "poiId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "poi_categories_pkey" PRIMARY KEY ("poiId","categoryId")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL,
    "hotelId" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "address" VARCHAR(500),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "distanceToCenter" DECIMAL(5,2),
    "distanceToAirport" DECIMAL(5,2),
    "rating" DECIMAL(3,2) NOT NULL,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "nightlyRate" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BRL',
    "breakfastIncluded" BOOLEAN NOT NULL DEFAULT false,
    "refundable" BOOLEAN NOT NULL DEFAULT true,
    "cancellationPolicy" TEXT,
    "highlights" TEXT[],
    "details" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_categories" (
    "hotelId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "hotel_categories_pkey" PRIMARY KEY ("hotelId","categoryId")
);

-- CreateTable
CREATE TABLE "flight_bookings" (
    "id" TEXT NOT NULL,
    "pnr" VARCHAR(10) NOT NULL,
    "status" "FlightBookingStatus" NOT NULL DEFAULT 'TICKETED',
    "total" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BRL',
    "passengerName" VARCHAR(255) NOT NULL,
    "passengerEmail" VARCHAR(255) NOT NULL,
    "itineraryId" VARCHAR(100) NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "flight_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_bookings" (
    "id" TEXT NOT NULL,
    "reservationId" VARCHAR(20) NOT NULL,
    "status" "HotelBookingStatus" NOT NULL DEFAULT 'BOOKED',
    "total" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BRL',
    "guestName" VARCHAR(255) NOT NULL,
    "guestEmail" VARCHAR(255) NOT NULL,
    "hotelId" VARCHAR(100) NOT NULL,
    "checkin" DATE NOT NULL,
    "checkout" DATE NOT NULL,
    "rooms" INTEGER NOT NULL DEFAULT 1,
    "nights" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),
    "userId" TEXT,

    CONSTRAINT "hotel_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_price_history" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "baggageIncluded" BOOLEAN NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flight_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_price_history" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "nightlyRate" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "forDate" DATE,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasonal_data" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "avgTempMin" DECIMAL(5,2),
    "avgTempMax" DECIMAL(5,2),
    "rainyDays" INTEGER,
    "weatherDescription" VARCHAR(255),
    "season" VARCHAR(20) NOT NULL,
    "priceMultiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "crowdLevel" VARCHAR(20),
    "events" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasonal_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base" (
    "id" TEXT NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "topic" VARCHAR(100) NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "keywords" TEXT[],
    "questionPtBr" TEXT NOT NULL,
    "answerPtBr" TEXT NOT NULL,
    "questionEnUs" TEXT NOT NULL,
    "answerEnUs" TEXT NOT NULL,
    "popularityScore" INTEGER NOT NULL DEFAULT 0,
    "timesViewed" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" VARCHAR(50) NOT NULL,
    "targetId" VARCHAR(255) NOT NULL,
    "targetName" VARCHAR(255) NOT NULL,
    "reason" TEXT NOT NULL,
    "score" DECIMAL(3,2) NOT NULL,
    "basedOn" VARCHAR(50) NOT NULL,
    "factors" JSONB NOT NULL,
    "wasShown" BOOLEAN NOT NULL DEFAULT false,
    "wasClicked" BOOLEAN NOT NULL DEFAULT false,
    "wasBooked" BOOLEAN NOT NULL DEFAULT false,
    "shownAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bookedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggested_questions" (
    "id" TEXT NOT NULL,
    "triggerContext" VARCHAR(100) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "category" VARCHAR(50) NOT NULL,
    "textPtBr" VARCHAR(255) NOT NULL,
    "textEnUs" VARCHAR(255) NOT NULL,
    "action" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggested_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_type_isActive_idx" ON "categories"("type", "isActive");

-- CreateIndex
CREATE INDEX "conversation_sessions_userId_status_idx" ON "conversation_sessions"("userId", "status");

-- CreateIndex
CREATE INDEX "conversation_sessions_lastActivityAt_idx" ON "conversation_sessions"("lastActivityAt" DESC);

-- CreateIndex
CREATE INDEX "conversation_messages_sessionId_createdAt_idx" ON "conversation_messages"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_memories_userId_memoryType_idx" ON "agent_memories"("userId", "memoryType");

-- CreateIndex
CREATE INDEX "agent_memories_userId_isActive_idx" ON "agent_memories"("userId", "isActive");

-- CreateIndex
CREATE INDEX "search_history_userId_createdAt_idx" ON "search_history"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "search_history_searchType_idx" ON "search_history"("searchType");

-- CreateIndex
CREATE UNIQUE INDEX "airports_iataCode_key" ON "airports"("iataCode");

-- CreateIndex
CREATE INDEX "airports_iataCode_idx" ON "airports"("iataCode");

-- CreateIndex
CREATE INDEX "airports_city_country_idx" ON "airports"("city", "country");

-- CreateIndex
CREATE INDEX "airports_country_isActive_idx" ON "airports"("country", "isActive");

-- CreateIndex
CREATE INDEX "airports_region_isActive_idx" ON "airports"("region", "isActive");

-- CreateIndex
CREATE INDEX "airports_continent_isActive_idx" ON "airports"("continent", "isActive");

-- CreateIndex
CREATE INDEX "airports_isInternational_isActive_idx" ON "airports"("isInternational", "isActive");

-- CreateIndex
CREATE INDEX "airports_popularityScore_idx" ON "airports"("popularityScore" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "flight_itineraries_itineraryId_key" ON "flight_itineraries"("itineraryId");

-- CreateIndex
CREATE INDEX "flight_itineraries_itineraryId_idx" ON "flight_itineraries"("itineraryId");

-- CreateIndex
CREATE INDEX "flight_itineraries_origin_destination_departDate_idx" ON "flight_itineraries"("origin", "destination", "departDate");

-- CreateIndex
CREATE INDEX "flight_itineraries_isActive_departDate_idx" ON "flight_itineraries"("isActive", "departDate");

-- CreateIndex
CREATE INDEX "flight_itineraries_airline_idx" ON "flight_itineraries"("airline");

-- CreateIndex
CREATE INDEX "flight_itineraries_popularityScore_idx" ON "flight_itineraries"("popularityScore" DESC);

-- CreateIndex
CREATE INDEX "destinations_city_country_idx" ON "destinations"("city", "country");

-- CreateIndex
CREATE INDEX "destinations_country_isActive_idx" ON "destinations"("country", "isActive");

-- CreateIndex
CREATE INDEX "destinations_popularityScore_idx" ON "destinations"("popularityScore" DESC);

-- CreateIndex
CREATE INDEX "points_of_interest_destinationId_isActive_idx" ON "points_of_interest"("destinationId", "isActive");

-- CreateIndex
CREATE INDEX "points_of_interest_type_isActive_idx" ON "points_of_interest"("type", "isActive");

-- CreateIndex
CREATE INDEX "points_of_interest_rating_idx" ON "points_of_interest"("rating" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "hotels_hotelId_key" ON "hotels"("hotelId");

-- CreateIndex
CREATE INDEX "hotels_hotelId_idx" ON "hotels"("hotelId");

-- CreateIndex
CREATE INDEX "hotels_city_isActive_idx" ON "hotels"("city", "isActive");

-- CreateIndex
CREATE INDEX "hotels_rating_idx" ON "hotels"("rating" DESC);

-- CreateIndex
CREATE INDEX "hotels_nightlyRate_idx" ON "hotels"("nightlyRate");

-- CreateIndex
CREATE UNIQUE INDEX "flight_bookings_pnr_key" ON "flight_bookings"("pnr");

-- CreateIndex
CREATE INDEX "flight_bookings_pnr_idx" ON "flight_bookings"("pnr");

-- CreateIndex
CREATE INDEX "flight_bookings_passengerEmail_idx" ON "flight_bookings"("passengerEmail");

-- CreateIndex
CREATE INDEX "flight_bookings_status_idx" ON "flight_bookings"("status");

-- CreateIndex
CREATE INDEX "flight_bookings_createdAt_idx" ON "flight_bookings"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "flight_bookings_itineraryId_idx" ON "flight_bookings"("itineraryId");

-- CreateIndex
CREATE INDEX "flight_bookings_userId_idx" ON "flight_bookings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_bookings_reservationId_key" ON "hotel_bookings"("reservationId");

-- CreateIndex
CREATE INDEX "hotel_bookings_reservationId_idx" ON "hotel_bookings"("reservationId");

-- CreateIndex
CREATE INDEX "hotel_bookings_guestEmail_idx" ON "hotel_bookings"("guestEmail");

-- CreateIndex
CREATE INDEX "hotel_bookings_status_idx" ON "hotel_bookings"("status");

-- CreateIndex
CREATE INDEX "hotel_bookings_createdAt_idx" ON "hotel_bookings"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "hotel_bookings_hotelId_checkin_checkout_idx" ON "hotel_bookings"("hotelId", "checkin", "checkout");

-- CreateIndex
CREATE INDEX "hotel_bookings_userId_idx" ON "hotel_bookings"("userId");

-- CreateIndex
CREATE INDEX "flight_price_history_itineraryId_recordedAt_idx" ON "flight_price_history"("itineraryId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "flight_price_history_recordedAt_idx" ON "flight_price_history"("recordedAt" DESC);

-- CreateIndex
CREATE INDEX "hotel_price_history_hotelId_recordedAt_idx" ON "hotel_price_history"("hotelId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "hotel_price_history_recordedAt_idx" ON "hotel_price_history"("recordedAt" DESC);

-- CreateIndex
CREATE INDEX "seasonal_data_destinationId_season_idx" ON "seasonal_data"("destinationId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "seasonal_data_destinationId_month_key" ON "seasonal_data"("destinationId", "month");

-- CreateIndex
CREATE INDEX "knowledge_base_category_topic_idx" ON "knowledge_base"("category", "topic");

-- CreateIndex
CREATE INDEX "knowledge_base_popularityScore_idx" ON "knowledge_base"("popularityScore" DESC);

-- CreateIndex
CREATE INDEX "knowledge_base_isActive_idx" ON "knowledge_base"("isActive");

-- CreateIndex
CREATE INDEX "recommendations_userId_type_idx" ON "recommendations"("userId", "type");

-- CreateIndex
CREATE INDEX "recommendations_score_idx" ON "recommendations"("score" DESC);

-- CreateIndex
CREATE INDEX "recommendations_createdAt_idx" ON "recommendations"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "suggested_questions_triggerContext_priority_idx" ON "suggested_questions"("triggerContext", "priority");

-- CreateIndex
CREATE INDEX "suggested_questions_isActive_idx" ON "suggested_questions"("isActive");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "conversation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_itineraries" ADD CONSTRAINT "flight_itineraries_origin_fkey" FOREIGN KEY ("origin") REFERENCES "airports"("iataCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_itineraries" ADD CONSTRAINT "flight_itineraries_destination_fkey" FOREIGN KEY ("destination") REFERENCES "airports"("iataCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destination_categories" ADD CONSTRAINT "destination_categories_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destination_categories" ADD CONSTRAINT "destination_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_of_interest" ADD CONSTRAINT "points_of_interest_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poi_categories" ADD CONSTRAINT "poi_categories_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "points_of_interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poi_categories" ADD CONSTRAINT "poi_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_categories" ADD CONSTRAINT "hotel_categories_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_categories" ADD CONSTRAINT "hotel_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_bookings" ADD CONSTRAINT "flight_bookings_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "flight_itineraries"("itineraryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_bookings" ADD CONSTRAINT "flight_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("hotelId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_price_history" ADD CONSTRAINT "flight_price_history_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "flight_itineraries"("itineraryId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_price_history" ADD CONSTRAINT "hotel_price_history_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasonal_data" ADD CONSTRAINT "seasonal_data_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
