# ================================
# Monopoly India — Dockerfile
# ================================

# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files for dependency caching
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY client/package.json client/
COPY server/package.json server/

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY shared/ shared/
COPY client/ client/
COPY server/ server/

# Build client (Vite) and server (TypeScript)
RUN npm run build --workspace=client
RUN npm run build --workspace=server

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
# Client package.json needed for workspace resolution, but no runtime deps
COPY client/package.json client/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy shared source (needed at runtime for type resolution)
COPY shared/ shared/

# Copy built server
COPY --from=build /app/server/dist server/dist

# Copy built client
COPY --from=build /app/client/dist client/dist

EXPOSE 3001

CMD ["node", "server/dist/server/src/index.js"]
