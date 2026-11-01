# Используем Node.js версии 20 (требуется для Next.js 16 и Tailwind v4)
FROM node:20-alpine AS base

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы зависимостей
COPY package.json package-lock.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Browser-visible configuration is supplied explicitly at build time.
ARG NEXT_PUBLIC_CESIUM_TOKEN
ARG NEXT_PUBLIC_MAPY_API_KEY
ARG NEXT_PUBLIC_OPENAIP_API_KEY
RUN npm run build

# Продакшн-образ
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
#
COPY --from=base /app/public ./public
COPY --from=base --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]