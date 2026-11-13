# The instance as a Bun process. Build the client before the image: bunx vite build.
FROM oven/bun:1.4.3

WORKDIR /yapir
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts
COPY tsconfig.json ./
COPY src/server src/server
COPY src/content src/content
COPY migrations migrations
COPY dist/client dist/client

USER bun
EXPOSE 3000
CMD ["bun", "src/server/bun.ts"]
