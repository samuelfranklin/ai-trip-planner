# Database Seeds

Este diretório contém os seeds de dados para popular o banco de dados com informações realistas de uma agência de viagens.

## Dados Baseados em Pesquisa de Mercado 2024-2025

Os dados foram criados com base em pesquisas sobre os destinos mais procurados por brasileiros em 2024 e 2025, incluindo:
- **Destinos nacionais**: São Paulo, Rio de Janeiro, Salvador, Recife, Fortaleza, Florianópolis, etc.
- **Destinos internacionais**: Buenos Aires, Santiago, Lima, Lisboa, Paris, Roma, Miami, Orlando, Punta Cana, etc.

## Estrutura dos Seeds

### 1. `airports.ts`
**35+ aeroportos** incluindo:
- Principais aeroportos brasileiros (GRU, GIG, CGH, SDU, BSB, SSA, REC, FOR, FLN, POA, CNF, CWB)
- Aeroportos internacionais na América do Sul (EZE, SCL, LIM, MVD, BOG)
- Aeroportos norte-americanos (MIA, MCO, JFK)
- Aeroportos europeus (LIS, CDG, MAD, BCN, FCO, MXP, FRA, DUB)
- Aeroportos do Caribe (PUJ, CUR)

Cada aeroporto inclui:
- Códigos IATA e ICAO
- Localização geográfica (cidade, país, coordenadas)
- Popularidade (score de 0-100)
- Aeroportos alternativos

### 2. `categories.ts`
**27 categorias** para classificação:
- **Destinos**: Praia, Montanha, Cidade Histórica, Metrópole, Natureza, Aventura, Cultural, Gastronômico, Romance, Família, Luxo, Econômico
- **Hotéis**: Resort, Hotel Boutique, Pousada, Hotel Econômico, Hotel de Luxo, Spa, Praia, Centro
- **Atividades**: Museus, Parques, Vida Noturna, Compras, Restaurantes, Esportes, Passeios

### 3. `destinations.ts`
**20+ destinos** com descrições detalhadas:

**Brasil:**
- São Paulo (metrópole, gastronomia)
- Rio de Janeiro (praias, Cristo Redentor)
- Salvador (cultura afro-brasileira)
- Recife/Porto de Galinhas (piscinas naturais)
- Fortaleza (praias, Beach Park)
- Florianópolis (42 praias)
- Foz do Iguaçu (Cataratas)

**América do Sul:**
- Buenos Aires (tango, gastronomia)
- Santiago (Andes, vinícolas)
- Lima (gastronomia)
- Cusco/Machu Picchu (história Inca)
- Montevidéu (charme colonial)
- Cartagena (Caribe colombiano)

**América do Norte:**
- Miami (praias, compras)
- Orlando (parques temáticos)
- Nova York (cultura, Broadway)

**Europa:**
- Lisboa (azulejos, fado)
- Paris (romance, arte)
- Roma (história milenar)
- Barcelona (Gaudí, praias)
- Madrid (museus, tapas)

**Caribe:**
- Punta Cana (resorts all-inclusive)
- Curaçao (mergulho)

Cada destino inclui:
- Coordenadas geográficas
- Descrição completa e resumida
- Melhores meses para visitar
- Orçamento médio estimado
- Score de popularidade
- Categorias associadas

### 4. `hotels.ts`
**20+ hotéis** com preços realistas:

**Categorias:**
- Hotéis de luxo (R$ 850 - R$ 4500/noite)
- Hotéis boutique (R$ 550 - R$ 900/noite)
- Hotéis econômicos (R$ 280 - R$ 420/noite)
- Resorts all-inclusive (R$ 2200 - R$ 2800/noite)
- Pousadas (R$ 650/noite)

**Destaques:**
- Localização (distância do centro e aeroporto)
- Avaliações (rating de 0-5, número de reviews)
- Comodidades (piscina, spa, wifi, restaurante, praia, etc.)
- Políticas (café incluso, reembolsável)

### 5. `flights.ts`
**15+ itinerários de voo** com preços realistas:

**Voos Domésticos (Brasil):**
- GRU-GIG: R$ 850 (LATAM)
- GRU-SSA: R$ 720 (Gol)
- GRU-REC: R$ 980 (Azul)
- GRU-FOR: R$ 1050 (LATAM)
- GRU-FLN: R$ 620 (Gol)

**Voos América do Sul:**
- GRU-EZE: R$ 1450 (Aerolíneas Argentinas)
- GRU-SCL: R$ 1680 (LATAM)
- GRU-LIM: R$ 1820 (LATAM)

**Voos Europa:**
- GRU-LIS: R$ 3200 (TAP)
- GRU-CDG: R$ 4800 (Air France)
- GRU-FCO: R$ 4200 (ITA Airways)
- GRU-MAD: R$ 4500 (Iberia)

**Voos América do Norte:**
- GRU-MIA: R$ 3800 (American Airlines)
- GRU-MCO: R$ 3600 (LATAM, 1 parada)

**Voos Caribe:**
- GRU-PUJ: R$ 3400 (Copa, 1 parada)

Cada itinerário inclui:
- Datas de ida e volta (30 dias no futuro)
- Segmentos detalhados com horários
- Informações da aeronave
- Bagagem incluída
- Número de paradas
- Scores de popularidade e conforto

### 6. `seasonal.ts`
**Dados sazonais mês a mês** para principais destinos:

Para cada destino e mês:
- Temperatura média (mínima e máxima)
- Dias de chuva
- Descrição do clima
- Temporada (alta/baixa/shoulder)
- Multiplicador de preço (0.70 - 2.0)
- Nível de lotação (low/moderate/high)
- Eventos especiais (Carnaval, Réveillon, etc.)

**Destinos cobertos:**
- Rio de Janeiro
- Salvador
- Buenos Aires
- Lisboa
- Paris
- Miami
- Punta Cana

## Como Usar

### Rodar todos os seeds:
```bash
pnpm db:seed
```

### Resetar banco e rodar seeds:
```bash
pnpm db:reset
```

### Ordem de execução:
Os seeds são executados na seguinte ordem (definida em `prisma/seed.ts`):
1. Airports (sem dependências)
2. Categories (sem dependências)
3. Destinations (depende de Categories)
4. Hotels (depende de Categories)
5. Flights (depende de Airports)
6. Seasonal Data (depende de Destinations)

## Notas Importantes

- Todos os preços estão em BRL (Reais)
- Datas de voos são calculadas dinamicamente (30 dias no futuro + 7 dias de estadia)
- Os dados são baseados em pesquisas de mercado reais de 2024-2025
- Aeroportos incluem coordenadas geográficas reais
- Scores de popularidade refletem tendências de busca reais
- Informações de clima e temporada são baseadas em dados históricos

## Fontes

Dados baseados em pesquisas de:
- Decolar.com (ranking de destinos mais procurados 2024)
- Kayak (tendências de busca)
- Ministério do Turismo do Brasil
- Panrotas (estatísticas de turismo)
