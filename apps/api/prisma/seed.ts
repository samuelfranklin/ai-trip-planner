import { PrismaClient } from '../src/generated/prisma';
import { seedAirports } from './seeds/airports';
import { seedCategories } from './seeds/categories';
import { seedDestinations } from './seeds/destinations';
import { seedHotels } from './seeds/hotels';
import { seedFlights } from './seeds/flights';
import { seedSeasonalData } from './seeds/seasonal';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // 1. Seed airports first (no dependencies)
    await seedAirports(prisma);
    console.log('');

    // 2. Seed categories (no dependencies)
    await seedCategories(prisma);
    console.log('');

    // 3. Seed destinations (depends on categories)
    await seedDestinations(prisma);
    console.log('');

    // 4. Seed hotels (depends on categories)
    await seedHotels(prisma);
    console.log('');

    // 5. Seed flights (depends on airports)
    await seedFlights(prisma);
    console.log('');

    // 6. Seed seasonal data (depends on destinations)
    await seedSeasonalData(prisma);
    console.log('');

    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
