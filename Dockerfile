FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
RUN npm install --frozen-lockfile

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]