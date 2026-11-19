FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig*.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
RUN npm run build && npm prune --omit=dev --no-audit --no-fund
FROM node:24-bookworm-slim
ENV NODE_ENV=production APP_LOCATION=railway APP_DATA_DIR=/data
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
# Requiere volumen persistente /data. Sin base importada, no conecta WhatsApp.
CMD ["node","dist/apps/service/src/main.js"]
