# Admin Dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
COPY admin/package.json ./admin/
COPY admin/tsconfig.json ./admin/
COPY admin/next.config.ts ./admin/
COPY admin/eslint.config.mjs ./admin/
COPY admin/public ./admin/public
COPY admin/app ./admin/app
COPY admin/lib ./admin/lib
COPY admin/.env* ./admin/
RUN npm install
WORKDIR /app/admin
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/admin/node_modules ./node_modules
COPY --from=builder /app/admin/.next ./.next
COPY --from=builder /app/admin/public ./public
COPY --from=builder /app/admin/package.json ./
COPY --from=builder /app/admin/next.config.ts ./

EXPOSE 3001
CMD ["npm", "start"]