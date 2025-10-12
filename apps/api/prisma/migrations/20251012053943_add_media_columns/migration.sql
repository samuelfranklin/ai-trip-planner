-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "hero_image_url" VARCHAR(500),
ADD COLUMN     "gallery_image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "destinations" ADD COLUMN     "hero_image_url" VARCHAR(500),
ADD COLUMN     "gallery_image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
