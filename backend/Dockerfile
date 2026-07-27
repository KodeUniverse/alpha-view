FROM node:22-alpine
WORKDIR /app

# for healthcheck
RUN apk add --no-cache curl

# Copy shared types to /shared so ../../../shared/types from /app works
COPY shared /shared

COPY backend/package.json ./
RUN npm install

COPY backend/src ./src
COPY backend/tsconfig.json ./

RUN npm run build

EXPOSE 8080
CMD ["node", "dist/server.js"]
