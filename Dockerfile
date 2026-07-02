# Stage 1: Install dependencies and build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Next.js application
# The `NEXT_TELEMETRY_DISABLED` environment variable disables Next.js telemetry,
# which is often desired in production builds.
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment variables for Next.js standalone output
# This is crucial for Next.js 12+ and allows for a smaller, standalone deployment.
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy only necessary files from the builder stage
# Next.js standalone output copies only the required files for production to .next/standalone
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
