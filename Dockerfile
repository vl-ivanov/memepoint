#syntax=docker/dockerfile:1.4
# Base stage for dev and build
FROM node:22-alpine as builder_base

EXPOSE 8030
ENV PORT=8030
env PNPM_HOME="/root/.local/share/pnpm"
env PATH="$PNPM_HOME/bin:$PATH"
ENV CI=true

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /srv/app

RUN corepack enable && \
    corepack prepare --activate pnpm@latest && \
    pnpm config -g set store-dir /root/.pnpm-store

# Deps stage, preserve dependencies in cache as long as the lockfile isn't changed
FROM builder_base AS deps

COPY --link package.json ./
COPY --link . .
RUN pnpm install --frozen-lockfile

# Development image
FROM deps AS dev

ENV NODE_ENV=development
COPY --link pnpm-lock.yaml ./

CMD ["sh", "-c", "pnpm install -r --offline; pnpm start"]

# Production image, copy all the files
FROM builder_base AS prod

ENV NODE_ENV=production

COPY --from=deps /srv/app/ .

CMD ["sh", "-c", "pnpm install -r --offline; pnpm run prod"]
