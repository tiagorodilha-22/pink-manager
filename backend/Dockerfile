# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update -qq && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Troca provider para PostgreSQL antes de gerar o client
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

RUN npx prisma generate
RUN npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

RUN apt-get update -qq && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=8080

# Dependências de produção
COPY package*.json ./
RUN npm ci --omit=dev

# Artefatos do build
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/node_modules/.prisma  ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma  ./node_modules/@prisma
COPY --from=builder /app/prisma       ./prisma

# Prisma CLI (para o db push no startup)
COPY --from=builder /app/node_modules/prisma  ./node_modules/prisma

EXPOSE 8080

# Sincroniza o schema com o banco e inicia a API
CMD ["sh", "-c", "node_modules/.bin/prisma db push --skip-generate && node dist/app.js"]
