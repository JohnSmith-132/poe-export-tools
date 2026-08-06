# syntax=docker/dockerfile:1.7

FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build.ts

FROM debian:stable-slim AS runtime

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates libatomic1 \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd -g 1001 -r app \
 && useradd -u 1001 -r -g app -d /app app

WORKDIR /app
COPY --from=build --chown=app:app /app/fullstack /app/fullstack

USER 1001
ENV PORT=3000
EXPOSE 3000

CMD ["/app/fullstack"]
