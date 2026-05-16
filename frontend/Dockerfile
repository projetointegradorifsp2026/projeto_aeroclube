# =============================================================================
# Stage: dev — servidor Vite com hot-reload para desenvolvimento
# =============================================================================
FROM node:22-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# =============================================================================
# Stage: build — compila os assets estáticos
# =============================================================================
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

# =============================================================================
# Stage: production — serve os assets via Nginx
# =============================================================================
FROM nginx:1.27-alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
