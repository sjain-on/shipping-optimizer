# API Dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
COPY api/package.json ./api/
COPY shared/package.json ./shared/
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build -w shared
RUN npm run build -w api

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/api/package.json ./api/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "start", "-w", "api"]
