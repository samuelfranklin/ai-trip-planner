/*
  Warnings:

  - You are about to drop the column `gallery_image_urls` on the `destinations` table. All the data in the column will be lost.
  - You are about to drop the column `hero_image_url` on the `destinations` table. All the data in the column will be lost.
  - You are about to drop the column `gallery_image_urls` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `hero_image_url` on the `hotels` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "destinations" DROP COLUMN "gallery_image_urls",
DROP COLUMN "hero_image_url",
ADD COLUMN     "galleryImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "heroImageUrl" VARCHAR(500);

-- AlterTable
ALTER TABLE "hotels" DROP COLUMN "gallery_image_urls",
DROP COLUMN "hero_image_url",
ADD COLUMN     "galleryImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "heroImageUrl" VARCHAR(500);
