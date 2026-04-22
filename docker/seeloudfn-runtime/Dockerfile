# Builder stage
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy monorepo root files
COPY package.json bun.lock turbo.json bunfig.toml ./

# Copy workspace packages
COPY packages ./packages
COPY apps/seeloudfn-runtime ./apps/seeloudfn-runtime

# Install dependencies
RUN bun install

# Generate the prisma client
RUN cd packages/db && bun run db:generate

# Build workspace packages
RUN cd packages && bun run build || true


# Runtime stage
FROM oven/bun:slim

WORKDIR /app

# Copy package.json and lock file
COPY --from=builder /app/package.json ./

# Copy built dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy workspace packages
COPY --from=builder /app/packages ./packages

# Copy seeloudfn-runtime service source
COPY --from=builder /app/apps/seeloudfn-runtime ./apps/seeloudfn-runtime

# Create cache directory for worker bundles
RUN mkdir -p /var/seeloudfn

# Set working directory to seeloudfn-runtime
WORKDIR /app/apps/seeloudfn-runtime

# Start seeloudfn-runtime service
CMD ["bun", "run", "index.ts"]
