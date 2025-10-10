## Multi-stage Dockerfile for building and running the TypeScript Node.js app
# 1) Base image
FROM node:22-alpine AS base
WORKDIR /usr/src/app

# 2) Dependencies for build (installs dev deps for tsc)
FROM base AS deps
ENV NODE_ENV=development
COPY package*.json ./
# Use npm ci for reproducible installs
RUN npm ci --ignore-scripts

# 3) Build stage (transpile TS -> JS)
FROM deps AS build
COPY tsconfig*.json ./
COPY src ./src
# If there are other files needed at build time, add COPY lines here.
RUN npm run build

# 4) Production runner (only production dependencies)
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8000

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts \
	&& npm cache clean --force

# Copy built artifacts
COPY --from=build /usr/src/app/dist ./dist

# Run as non-root for security
USER node

# App listens on PORT (defaults to 8000 in code). Expose for docs/discovery.
EXPOSE 8000

CMD ["node", "dist/index.js"]