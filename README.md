# AI Trip Planner 🌍✈️

Sistema de reservas de viagens via chat com IA, utilizando LangGraph e Generative UI.

## 📋 Descrição

Chat interativo para buscar, reservar e cancelar voos e hotéis através de linguagem natural. A interface gera componentes React dinamicamente via streaming, proporcionando uma experiência fluida e moderna.

## 🏗️ Arquitetura

Monorepo com pnpm workspaces:

```
ai-trip-planner/
├── packages/
│   ├── backend/     # Node.js + LangGraph + Express
│   └── frontend/    # React + Vite + Generative UI
├── pnpm-workspace.yaml
└── package.json
```

### Stack Tecnológico

**Backend:**
- Node.js + TypeScript
- LangGraph (agente conversacional)
- OpenAI GPT-4
- Express (API REST)
- PostgreSQL/SQLite (persistência)

**Frontend:**
- React 18
- Vite
- LangGraph Client SDK
- Generative UI (streaming de componentes)
- Tailwind CSS
- Vitest + Playwright (testes)

## 🚀 Setup

### Pré-requisitos

- Node.js >= 18
- pnpm >= 8
- PostgreSQL ou SQLite

### Instalação

1. Clone o repositório:
```bash
git clone <repo-url>
cd ai-trip-planner
```

2. Instale as dependências:
```bash
pnpm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite .env com suas credenciais
```

4. Configure o banco de dados:
```bash
# Para PostgreSQL
createdb ai_trip_planner

# Para SQLite (automático no primeiro run)
```

### Execução

**Modo desenvolvimento (ambos os serviços):**
```bash
pnpm dev
```

**Somente backend:**
```bash
pnpm dev:backend
```

**Somente frontend:**
```bash
pnpm dev:frontend
```

Acesse: http://localhost:5173

## 🧪 Testes

```bash
# Testes unitários
pnpm test:unit

# Testes E2E
pnpm test:e2e

# Todos os testes
pnpm test
```

## 📚 Funcionalidades

### ✈️ Voos (Obrigatório)
- ✅ Buscar voos round-trip com filtros
- ✅ Reservar voo com PNR
- ✅ Cancelar reserva
- ✅ Persistência em banco

### 🏨 Hotéis (Recomendado/Desejável)
- ✅ Buscar hotéis por cidade e datas
- ✅ Reservar hotel
- ✅ Cancelar reserva

### 🔄 Resiliência
- ✅ Simulação de latência (300-1200ms)
- ✅ Simulação de erro (~15%)
- ✅ Feedback visual (loading/erro)
- ✅ Retry automático

### ♿ Acessibilidade
- ✅ Navegação por teclado
- ✅ ARIA labels
- ✅ i18n (pt-BR/en-US)

## 📖 Documentação Detalhada

- [Arquitetura do Agente](./docs/ARCHITECTURE.md) (a criar)
- [Tools API](./docs/TOOLS.md) (a criar)
- [Componentes Generativos](./docs/COMPONENTS.md) (a criar)
- [Decisões Técnicas](./docs/DECISIONS.md) (a criar)

## 🤖 Uso de IA

Este projeto utilizou assistência de IA (Claude/Cursor) para:
- [x] Estruturação inicial do monorepo
- [ ] Implementação do agente LangGraph
- [ ] Desenvolvimento de componentes React
- [ ] Configuração de testes

Decisões próprias:
- Arquitetura de componentes
- Modelagem de dados
- Fluxo de UX/UI

## 🔐 Segurança

- Sanitização de inputs do LLM
- Validação de schemas com Zod
- CORS configurado
- Variáveis de ambiente protegidas

## 📝 Licença

MIT

## 👥 Autor

[Seu Nome]