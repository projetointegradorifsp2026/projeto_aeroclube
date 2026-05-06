# =============================================================================
# Frontend — React (Create React App)
# Multi-stage: dev (react-scripts start) | production (nginx serving build)
# =============================================================================

# ── Estágio base ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

WORKDIR /app

# Copia apenas os manifestos primeiro para aproveitar cache de camadas
COPY package*.json ./
RUN npm install

# ── Estágio de desenvolvimento ────────────────────────────────────────────────
FROM base AS dev

# Código montado via volume em dev; copiamos para fallback
COPY . .

EXPOSE 3000

ENV HOST=0.0.0.0

CMD ["npm", "start"]

# ── Estágio de build (intermediário para produção) ────────────────────────────
FROM base AS builder

COPY . .

# Variável de ambiente injetada pelo docker-compose.prod.yml se necessário
ARG REACT_APP_API_URL=/api/v1
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# ── Estágio de produção (nginx serve os estáticos) ───────────────────────────
FROM nginx:1.27-alpine AS production

# Remove config padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia config de SPA (trata 404 → index.html para react-router)
COPY nginx.spa.conf /etc/nginx/conf.d/default.conf

# Copia o build do React
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
