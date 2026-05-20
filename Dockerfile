# ==========================================
# ETAPA 1: Base común de Node.js
# ==========================================
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# ==========================================
# ETAPA 2: Compilación del Frontend (Citas)
# ==========================================
FROM base AS build-frontend
RUN npm run build

# ==========================================
# ETAPA 3: Servidor de producción para el Frontend
# ==========================================
FROM nginx:alpine AS frontend
COPY --from=build-frontend /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# ==========================================
# ETAPA 4: Entorno de ejecución para el Backend
# ==========================================
FROM base AS backend
EXPOSE 5000
CMD ["node", "server/index.js"]