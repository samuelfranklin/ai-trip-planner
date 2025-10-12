import { PrismaClient } from '../../src/generated/prisma';

export async function seedCategories(prisma: PrismaClient) {
  console.log('🏷️  Seeding categories...');

  const categories = [
    // Destination categories
    { name: 'Praia', slug: 'praia', type: 'destination', description: 'Destinos de praia e mar' },
    { name: 'Montanha', slug: 'montanha', type: 'destination', description: 'Destinos de montanha e altitude' },
    { name: 'Cidade Histórica', slug: 'cidade-historica', type: 'destination', description: 'Cidades com patrimônio histórico' },
    { name: 'Metrópole', slug: 'metropole', type: 'destination', description: 'Grandes cidades urbanas' },
    { name: 'Natureza', slug: 'natureza', type: 'destination', description: 'Destinos de ecoturismo' },
    { name: 'Aventura', slug: 'aventura', type: 'destination', description: 'Destinos para esportes radicais' },
    { name: 'Cultural', slug: 'cultural', type: 'destination', description: 'Destinos com forte apelo cultural' },
    { name: 'Gastronômico', slug: 'gastronomico', type: 'destination', description: 'Destinos conhecidos pela gastronomia' },
    { name: 'Romance', slug: 'romance', type: 'destination', description: 'Destinos românticos' },
    { name: 'Família', slug: 'familia', type: 'destination', description: 'Destinos para viagens em família' },
    { name: 'Luxo', slug: 'luxo', type: 'destination', description: 'Destinos de luxo' },
    { name: 'Econômico', slug: 'economico', type: 'destination', description: 'Destinos econômicos' },

    // Hotel categories
    { name: 'Resort', slug: 'resort', type: 'hotel', description: 'Resorts all-inclusive' },
    { name: 'Hotel Boutique', slug: 'hotel-boutique', type: 'hotel', description: 'Hotéis boutique com charme' },
    { name: 'Pousada', slug: 'pousada', type: 'hotel', description: 'Pousadas aconchegantes' },
    { name: 'Hotel Econômico', slug: 'hotel-economico', type: 'hotel', description: 'Hotéis econômicos' },
    { name: 'Hotel de Luxo', slug: 'hotel-luxo', type: 'hotel', description: 'Hotéis 5 estrelas' },
    { name: 'Spa', slug: 'spa', type: 'hotel', description: 'Hotéis com spa' },
    { name: 'Hotel à Beira-Mar', slug: 'hotel-praia', type: 'hotel', description: 'Hotéis à beira-mar' },
    { name: 'Hotel no Centro', slug: 'hotel-centro', type: 'hotel', description: 'Hotéis no centro da cidade' },

    // Activity categories
    { name: 'Museus', slug: 'museus', type: 'activity', description: 'Museus e galerias' },
    { name: 'Parques', slug: 'parques', type: 'activity', description: 'Parques e áreas verdes' },
    { name: 'Vida Noturna', slug: 'vida-noturna', type: 'activity', description: 'Bares e baladas' },
    { name: 'Compras', slug: 'compras', type: 'activity', description: 'Shopping e lojas' },
    { name: 'Restaurantes', slug: 'restaurantes', type: 'activity', description: 'Gastronomia local' },
    { name: 'Esportes', slug: 'esportes', type: 'activity', description: 'Atividades esportivas' },
    { name: 'Passeios', slug: 'passeios', type: 'activity', description: 'Tours e passeios guiados' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        type: category.type,
        description: category.description,
        isActive: true,
      },
      create: category,
    });
  }

  console.log(`✅ Created ${categories.length} categories`);
}
