FROM node:22-alpine

WORKDIR /app

COPY package*.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn prisma generate

RUN yarn build

ENV NODE_ENV=production

EXPOSE 8080

CMD ["sh", "-c", "yarn prisma migrate deploy && node dist/main"]
