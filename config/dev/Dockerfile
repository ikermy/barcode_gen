FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn prisma generate

EXPOSE 8080

CMD ["sh", "-c", "yarn prisma migrate deploy && yarn start:dev"]
