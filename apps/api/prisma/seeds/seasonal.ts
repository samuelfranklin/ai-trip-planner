import { PrismaClient } from '../../src/generated/prisma';

export async function seedSeasonalData(prisma: PrismaClient) {
  console.log('📅 Seeding seasonal data...');

  // Helper function to create seasonal data for a destination
  async function createSeasonalData(destinationName: string, city: string, monthsData: any[]) {
    const destination = await prisma.destination.findFirst({
      where: { name: destinationName, city }
    });

    if (!destination) {
      console.log(`⚠️  Destination ${destinationName} (${city}) not found`);
      return;
    }

    for (const data of monthsData) {
      await prisma.seasonalData.upsert({
        where: {
          destinationId_month: {
            destinationId: destination.id,
            month: data.month
          }
        },
        update: data,
        create: {
          destinationId: destination.id,
          ...data
        }
      });
    }
  }

  // Rio de Janeiro - Alta temporada no verão e carnaval
  await createSeasonalData('Rio de Janeiro', 'Rio de Janeiro', [
    { month: 1, avgTempMin: 23, avgTempMax: 30, rainyDays: 13, weatherDescription: 'Quente e úmido, alta temporada', season: 'high', priceMultiplier: 1.5, crowdLevel: 'high' },
    { month: 2, avgTempMin: 23, avgTempMax: 30, rainyDays: 11, weatherDescription: 'Carnaval - altíssima temporada', season: 'high', priceMultiplier: 2.0, crowdLevel: 'high', events: [{ name: 'Carnaval', date: 'Fevereiro/Março' }] },
    { month: 3, avgTempMin: 23, avgTempMax: 29, rainyDays: 12, weatherDescription: 'Verão encerrando, ainda movimentado', season: 'high', priceMultiplier: 1.3, crowdLevel: 'high' },
    { month: 4, avgTempMin: 21, avgTempMax: 27, rainyDays: 10, weatherDescription: 'Outono agradável', season: 'shoulder', priceMultiplier: 1.0, crowdLevel: 'moderate' },
    { month: 5, avgTempMin: 19, avgTempMax: 26, rainyDays: 8, weatherDescription: 'Clima ameno, baixa temporada', season: 'low', priceMultiplier: 0.85, crowdLevel: 'low' },
    { month: 6, avgTempMin: 18, avgTempMax: 25, rainyDays: 7, weatherDescription: 'Inverno suave', season: 'low', priceMultiplier: 0.80, crowdLevel: 'low' },
    { month: 7, avgTempMin: 18, avgTempMax: 25, rainyDays: 7, weatherDescription: 'Inverno, férias escolares', season: 'shoulder', priceMultiplier: 1.1, crowdLevel: 'moderate' },
    { month: 8, avgTempMin: 19, avgTempMax: 26, rainyDays: 7, weatherDescription: 'Fim do inverno', season: 'low', priceMultiplier: 0.90, crowdLevel: 'low' },
    { month: 9, avgTempMin: 19, avgTempMax: 26, rainyDays: 11, weatherDescription: 'Primavera começando', season: 'shoulder', priceMultiplier: 0.95, crowdLevel: 'moderate' },
    { month: 10, avgTempMin: 20, avgTempMax: 27, rainyDays: 13, weatherDescription: 'Primavera', season: 'shoulder', priceMultiplier: 1.0, crowdLevel: 'moderate' },
    { month: 11, avgTempMin: 21, avgTempMax: 28, rainyDays: 13, weatherDescription: 'Pré-verão', season: 'shoulder', priceMultiplier: 1.1, crowdLevel: 'moderate' },
    { month: 12, avgTempMin: 22, avgTempMax: 29, rainyDays: 14, weatherDescription: 'Início da alta temporada', season: 'high', priceMultiplier: 1.4, crowdLevel: 'high', events: [{ name: 'Réveillon', date: '31 de Dezembro' }] },
  ]);

  // Salvador - Alta temporada no verão
  await createSeasonalData('Salvador', 'Salvador', [
    { month: 1, avgTempMin: 24, avgTempMax: 30, rainyDays: 10, weatherDescription: 'Verão quente, alta temporada', season: 'high', priceMultiplier: 1.4, crowdLevel: 'high' },
    { month: 2, avgTempMin: 24, avgTempMax: 30, rainyDays: 11, weatherDescription: 'Carnaval - altíssima temporada', season: 'high', priceMultiplier: 2.0, crowdLevel: 'high', events: [{ name: 'Carnaval de Salvador', date: 'Fevereiro' }] },
    { month: 3, avgTempMin: 24, avgTempMax: 30, rainyDays: 14, weatherDescription: 'Final do verão', season: 'shoulder', priceMultiplier: 1.2, crowdLevel: 'moderate' },
    { month: 4, avgTempMin: 24, avgTempMax: 29, rainyDays: 18, weatherDescription: 'Mais chuvoso', season: 'low', priceMultiplier: 0.85, crowdLevel: 'low' },
    { month: 5, avgTempMin: 23, avgTempMax: 28, rainyDays: 20, weatherDescription: 'Período chuvoso', season: 'low', priceMultiplier: 0.80, crowdLevel: 'low' },
    { month: 6, avgTempMin: 22, avgTempMax: 27, rainyDays: 18, weatherDescription: 'Inverno chuvoso', season: 'low', priceMultiplier: 0.75, crowdLevel: 'low' },
    { month: 7, avgTempMin: 22, avgTempMax: 27, rainyDays: 16, weatherDescription: 'Inverno, férias', season: 'shoulder', priceMultiplier: 1.0, crowdLevel: 'moderate' },
    { month: 8, avgTempMin: 22, avgTempMax: 27, rainyDays: 13, weatherDescription: 'Fim do inverno', season: 'low', priceMultiplier: 0.85, crowdLevel: 'low' },
    { month: 9, avgTempMin: 23, avgTempMax: 28, rainyDays: 11, weatherDescription: 'Primavera', season: 'shoulder', priceMultiplier: 0.90, crowdLevel: 'low' },
    { month: 10, avgTempMin: 23, avgTempMax: 29, rainyDays: 10, weatherDescription: 'Boa época para visitar', season: 'shoulder', priceMultiplier: 0.95, crowdLevel: 'moderate' },
    { month: 11, avgTempMin: 24, avgTempMax: 29, rainyDays: 11, weatherDescription: 'Pré-verão', season: 'shoulder', priceMultiplier: 1.0, crowdLevel: 'moderate' },
    { month: 12, avgTempMin: 24, avgTempMax: 30, rainyDays: 10, weatherDescription: 'Início alta temporada', season: 'high', priceMultiplier: 1.3, crowdLevel: 'high' },
  ]);

  // Buenos Aires - Alta temporada na primavera e outono
  await createSeasonalData('Buenos Aires', 'Buenos Aires', [
    { month: 1, avgTempMin: 20, avgTempMax: 30, rainyDays: 9, weatherDescription: 'Verão quente', season: 'high', priceMultiplier: 1.3, crowdLevel: 'high' },
    { month: 2, avgTempMin: 19, avgTempMax: 29, rainyDays: 8, weatherDescription: 'Verão', season: 'high', priceMultiplier: 1.2, crowdLevel: 'high' },
    { month: 3, avgTempMin: 17, avgTempMax: 26, rainyDays: 10, weatherDescription: 'Outono agradável', season: 'shoulder', priceMultiplier: 1.1, crowdLevel: 'moderate' },
    { month: 4, avgTempMin: 13, avgTempMax: 22, rainyDays: 9, weatherDescription: 'Outono perfeito', season: 'high', priceMultiplier: 1.2, crowdLevel: 'moderate' },
    { month: 5, avgTempMin: 10, avgTempMax: 18, rainyDays: 8, weatherDescription: 'Outono fresco', season: 'shoulder', priceMultiplier: 1.0, crowdLevel: 'moderate' },
    { month: 6, avgTempMin: 7, avgTempMax: 15, rainyDays: 7, weatherDescription: 'Inverno frio', season: 'low', priceMultiplier: 0.80, crowdLevel: 'low' },
    { month: 7, avgTempMin: 7, avgTempMax: 15, rainyDays: 7, weatherDescription: 'Inverno', season: 'low', priceMultiplier: 0.75, crowdLevel: 'low' },
    { month: 8, avgTempMin: 8, avgTempMax: 17, rainyDays: 7, weatherDescription: 'Fim do inverno', season: 'low', priceMultiplier: 0.80, crowdLevel: 'low' },
    { month: 9, avgTempMin: 10, avgTempMax: 19, rainyDays: 8, weatherDescription: 'Primavera começando', season: 'shoulder', priceMultiplier: 1.0, crowdLevel: 'moderate' },
    { month: 10, avgTempMin: 13, avgTempMax: 22, rainyDays: 10, weatherDescription: 'Primavera linda', season: 'high', priceMultiplier: 1.2, crowdLevel: 'high' },
    { month: 11, avgTempMin: 16, avgTempMax: 26, rainyDays: 10, weatherDescription: 'Primavera perfeita', season: 'high', priceMultiplier: 1.3, crowdLevel: 'high' },
    { month: 12, avgTempMin: 18, avgTempMax: 28, rainyDays: 9, weatherDescription: 'Verão começando', season: 'high', priceMultiplier: 1.2, crowdLevel: 'high' },
  ]);

  // Lisboa - Alta temporada no verão
  await createSeasonalData('Lisboa', 'Lisboa', [
    { month: 1, avgTempMin: 8, avgTempMax: 15, rainyDays: 15, weatherDescription: 'Inverno ameno e chuvoso', season: 'low', priceMultiplier: 0.70, crowdLevel: 'low' },
    { month: 2, avgTempMin: 9, avgTempMax: 16, rainyDays: 13, weatherDescription: 'Inverno', season: 'low', priceMultiplier: 0.70, crowdLevel: 'low' },
    { month: 3, avgTempMin: 10, avgTempMax: 18, rainyDays: 11, weatherDescription: 'Primavera começando', season: 'shoulder', priceMultiplier: 0.85, crowdLevel: 'moderate' },
    { month: 4, avgTempMin: 12, avgTempMax: 20, rainyDays: 10, weatherDescription: 'Primavera agradável', season: 'high', priceMultiplier: 1.1, crowdLevel: 'moderate' },
    { month: 5, avgTempMin: 14, avgTempMax: 23, rainyDays: 8, weatherDescription: 'Primavera perfeita', season: 'high', priceMultiplier: 1.2, crowdLevel: 'high' },
    { month: 6, avgTempMin: 17, avgTempMax: 27, rainyDays: 4, weatherDescription: 'Verão começando', season: 'high', priceMultiplier: 1.3, crowdLevel: 'high', events: [{ name: 'Festas de Lisboa', date: 'Junho' }] },
    { month: 7, avgTempMin: 19, avgTempMax: 29, rainyDays: 1, weatherDescription: 'Verão quente', season: 'high', priceMultiplier: 1.5, crowdLevel: 'high' },
    { month: 8, avgTempMin: 19, avgTempMax: 29, rainyDays: 1, weatherDescription: 'Verão pico', season: 'high', priceMultiplier: 1.5, crowdLevel: 'high' },
    { month: 9, avgTempMin: 18, avgTempMax: 27, rainyDays: 5, weatherDescription: 'Outono agradável', season: 'high', priceMultiplier: 1.2, crowdLevel: 'moderate' },
    { month: 10, avgTempMin: 15, avgTempMax: 22, rainyDays: 11, weatherDescription: 'Outono', season: 'shoulder', priceMultiplier: 1.0, crowdLevel: 'moderate' },
    { month: 11, avgTempMin: 11, avgTempMax: 18, rainyDays: 13, weatherDescription: 'Outono chuvoso', season: 'low', priceMultiplier: 0.80, crowdLevel: 'low' },
    { month: 12, avgTempMin: 9, avgTempMax: 15, rainyDays: 14, weatherDescription: 'Inverno', season: 'low', priceMultiplier: 0.75, crowdLevel: 'low' },
  ]);

  // Paris - Alta temporada primavera/verão
  await createSeasonalData('Paris', 'Paris', [
    { month: 1, avgTempMin: 3, avgTempMax: 7, rainyDays: 10, weatherDescription: 'Inverno frio', season: 'low', priceMultiplier: 0.75, crowdLevel: 'low' },
    { month: 2, avgTempMin: 3, avgTempMax: 8, rainyDays: 9, weatherDescription: 'Inverno', season: 'low', priceMultiplier: 0.75, crowdLevel: 'low' },
    { month: 3, avgTempMin: 5, avgTempMax: 12, rainyDays: 10, weatherDescription: 'Primavera começando', season: 'shoulder', priceMultiplier: 0.90, crowdLevel: 'moderate' },
    { month: 4, avgTempMin: 7, avgTempMax: 16, rainyDays: 9, weatherDescription: 'Primavera linda', season: 'high', priceMultiplier: 1.2, crowdLevel: 'high' },
    { month: 5, avgTempMin: 11, avgTempMax: 20, rainyDays: 10, weatherDescription: 'Primavera perfeita', season: 'high', priceMultiplier: 1.3, crowdLevel: 'high' },
    { month: 6, avgTempMin: 14, avgTempMax: 23, rainyDays: 8, weatherDescription: 'Verão agradável', season: 'high', priceMultiplier: 1.4, crowdLevel: 'high' },
    { month: 7, avgTempMin: 16, avgTempMax: 25, rainyDays: 8, weatherDescription: 'Verão', season: 'high', priceMultiplier: 1.5, crowdLevel: 'high', events: [{ name: 'Dia da Bastilha', date: '14 de Julho' }] },
    { month: 8, avgTempMin: 16, avgTempMax: 25, rainyDays: 8, weatherDescription: 'Verão pico', season: 'high', priceMultiplier: 1.4, crowdLevel: 'high' },
    { month: 9, avgTempMin: 13, avgTempMax: 21, rainyDays: 8, weatherDescription: 'Outono agradável', season: 'shoulder', priceMultiplier: 1.1, crowdLevel: 'moderate' },
    { month: 10, avgTempMin: 10, avgTempMax: 16, rainyDays: 9, weatherDescription: 'Outono', season: 'shoulder', priceMultiplier: 1.0, crowdLevel: 'moderate' },
    { month: 11, avgTempMin: 6, avgTempMax: 10, rainyDays: 10, weatherDescription: 'Outono frio', season: 'low', priceMultiplier: 0.80, crowdLevel: 'low' },
    { month: 12, avgTempMin: 4, avgTempMax: 7, rainyDays: 10, weatherDescription: 'Inverno', season: 'shoulder', priceMultiplier: 0.90, crowdLevel: 'moderate', events: [{ name: 'Mercados de Natal', date: 'Dezembro' }] },
  ]);

  // Miami - Alta temporada no inverno
  await createSeasonalData('Miami', 'Miami', [
    { month: 1, avgTempMin: 17, avgTempMax: 24, rainyDays: 6, weatherDescription: 'Inverno perfeito', season: 'high', priceMultiplier: 1.4, crowdLevel: 'high' },
    { month: 2, avgTempMin: 18, avgTempMax: 25, rainyDays: 6, weatherDescription: 'Inverno ideal', season: 'high', priceMultiplier: 1.4, crowdLevel: 'high' },
    { month: 3, avgTempMin: 19, avgTempMax: 26, rainyDays: 6, weatherDescription: 'Primavera agradável', season: 'high', priceMultiplier: 1.5, crowdLevel: 'high', events: [{ name: 'Spring Break', date: 'Março' }] },
    { month: 4, avgTempMin: 21, avgTempMax: 28, rainyDays: 6, weatherDescription: 'Primavera quente', season: 'shoulder', priceMultiplier: 1.2, crowdLevel: 'moderate' },
    { month: 5, avgTempMin: 23, avgTempMax: 30, rainyDays: 10, weatherDescription: 'Início do verão', season: 'low', priceMultiplier: 0.90, crowdLevel: 'low' },
    { month: 6, avgTempMin: 25, avgTempMax: 31, rainyDays: 16, weatherDescription: 'Verão quente e úmido', season: 'low', priceMultiplier: 0.85, crowdLevel: 'low' },
    { month: 7, avgTempMin: 26, avgTempMax: 32, rainyDays: 17, weatherDescription: 'Verão muito quente', season: 'low', priceMultiplier: 0.80, crowdLevel: 'low' },
    { month: 8, avgTempMin: 26, avgTempMax: 32, rainyDays: 18, weatherDescription: 'Verão, temporada furacões', season: 'low', priceMultiplier: 0.75, crowdLevel: 'low' },
    { month: 9, avgTempMin: 25, avgTempMax: 31, rainyDays: 17, weatherDescription: 'Final do verão', season: 'low', priceMultiplier: 0.80, crowdLevel: 'low' },
    { month: 10, avgTempMin: 23, avgTempMax: 29, rainyDays: 11, weatherDescription: 'Outono agradável', season: 'shoulder', priceMultiplier: 1.0, crowdLevel: 'moderate' },
    { month: 11, avgTempMin: 20, avgTempMax: 26, rainyDays: 7, weatherDescription: 'Ótima época', season: 'high', priceMultiplier: 1.2, crowdLevel: 'high' },
    { month: 12, avgTempMin: 18, avgTempMax: 24, rainyDays: 6, weatherDescription: 'Inverno perfeito', season: 'high', priceMultiplier: 1.3, crowdLevel: 'high' },
  ]);

  // Punta Cana - Destino de praia o ano todo
  await createSeasonalData('Punta Cana', 'Punta Cana', [
    { month: 1, avgTempMin: 21, avgTempMax: 28, rainyDays: 7, weatherDescription: 'Seco e agradável', season: 'high', priceMultiplier: 1.4, crowdLevel: 'high' },
    { month: 2, avgTempMin: 21, avgTempMax: 28, rainyDays: 6, weatherDescription: 'Melhor época', season: 'high', priceMultiplier: 1.5, crowdLevel: 'high' },
    { month: 3, avgTempMin: 21, avgTempMax: 29, rainyDays: 6, weatherDescription: 'Perfeito', season: 'high', priceMultiplier: 1.5, crowdLevel: 'high' },
    { month: 4, avgTempMin: 22, avgTempMax: 29, rainyDays: 7, weatherDescription: 'Excelente', season: 'high', priceMultiplier: 1.3, crowdLevel: 'high' },
    { month: 5, avgTempMin: 23, avgTempMax: 30, rainyDays: 11, weatherDescription: 'Quente', season: 'shoulder', priceMultiplier: 1.0, crowdLevel: 'moderate' },
    { month: 6, avgTempMin: 24, avgTempMax: 31, rainyDays: 11, weatherDescription: 'Verão quente', season: 'low', priceMultiplier: 0.85, crowdLevel: 'low' },
    { month: 7, avgTempMin: 24, avgTempMax: 31, rainyDays: 11, weatherDescription: 'Verão', season: 'shoulder', priceMultiplier: 1.0, crowdLevel: 'moderate' },
    { month: 8, avgTempMin: 24, avgTempMax: 32, rainyDays: 12, weatherDescription: 'Quente e úmido', season: 'low', priceMultiplier: 0.80, crowdLevel: 'low' },
    { month: 9, avgTempMin: 24, avgTempMax: 31, rainyDays: 12, weatherDescription: 'Temporada furacões', season: 'low', priceMultiplier: 0.75, crowdLevel: 'low' },
    { month: 10, avgTempMin: 23, avgTempMax: 30, rainyDays: 13, weatherDescription: 'Fim temporada chuvosa', season: 'low', priceMultiplier: 0.80, crowdLevel: 'low' },
    { month: 11, avgTempMin: 22, avgTempMax: 29, rainyDays: 10, weatherDescription: 'Agradável', season: 'shoulder', priceMultiplier: 1.1, crowdLevel: 'moderate' },
    { month: 12, avgTempMin: 21, avgTempMax: 28, rainyDays: 8, weatherDescription: 'Alta temporada', season: 'high', priceMultiplier: 1.4, crowdLevel: 'high' },
  ]);

  console.log('✅ Seasonal data created successfully');
}
