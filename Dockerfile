# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 FAROL_DATA_DIR=/data
RUN addgroup -S farol && adduser -S farol -G farol && mkdir -p /data && chown farol:farol /data
COPY --from=build --chown=farol:farol /app/.next/standalone ./
COPY --from=build --chown=farol:farol /app/.next/static ./.next/static
COPY --from=build --chown=farol:farol /app/public ./public
COPY --from=build --chown=farol:farol /app/data /seed
USER farol
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- "http://127.0.0.1:3000/api/health?quick=1" >/dev/null || exit 1
# Semeia o volume na primeira subida; depois nunca sobrescreve.
CMD ["sh", "-c", "[ -f /data/projects.json ] || cp /seed/projects.json /data/projects.json; node server.js"]
