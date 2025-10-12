-- AlterTable
ALTER TABLE "flight_bookings" ADD COLUMN     "adults" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "fareBasis" VARCHAR(20),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "passengerPhone" VARCHAR(30),
ADD COLUMN     "seatClass" VARCHAR(20),
ADD COLUMN     "specialRequests" TEXT,
ADD COLUMN     "ticketedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "hotel_bookings" ADD COLUMN     "adults" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "children" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "guestPhone" VARCHAR(30),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "specialRequests" TEXT;
