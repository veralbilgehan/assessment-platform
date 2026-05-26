# ─── Stage 1: Frontend Build ──────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --prefer-offline
COPY frontend/ ./
# Boş VITE_API_URL → relative /api paths (backend aynı origin)
RUN npm run build

# ─── Stage 2: Backend + Frontend Serve ────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --only=production --prefer-offline
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

ENV NODE_ENV=production
EXPOSE 8080
ENV PORT=8080

CMD ["node", "src/app.js"]
