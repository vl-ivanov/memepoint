#syntax=docker/dockerfile:1.4
# Base stage for dev and build
FROM node:22-alpine as builder_base

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /srv/app

RUN corepack enable && \
    corepack prepare --activate pnpm@latest && \
    pnpm config -g set store-dir ~/.pnpm-store

# Deps stage, preserve dependencies in cache as long as the lockfile isn't changed
FROM builder_base AS deps

COPY --link pnpm-lock.yaml ./
RUN pnpm fetch

COPY --link . .
RUN pnpm install -r --offline


# Development image
FROM deps as dev

EXPOSE 8030
ENV PORT 8030
ENV NODE_ENV development

CMD ["sh", "-c", "pnpm install -r --offline; pnpm start"]

# Production image, copy all the files
FROM node:22-alpine AS prod

ENV NODE_ENV production
CMD [ "pnpm", "run", "prod" ]
