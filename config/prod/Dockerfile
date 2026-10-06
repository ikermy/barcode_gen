FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn prisma generate
RUN yarn build

FROM node:22-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nestjs -u 1001

COPY package*.json yarn.lock ./
RUN yarn install --production --frozen-lockfile && yarn cache clean

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/generated ./generated
# static/*.json читаются в рантайме (field_names.json, config.json, dl_tables.json)
COPY --from=builder --chown=nestjs:nodejs /app/static ./static

USER nestjs

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:8080/api/v1/healthz || exit 1

CMD ["sh", "-c", "yarn prisma migrate deploy && node dist/main"]
