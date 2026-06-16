FROM node:22-alpine
WORKDIR /app

# for healthcheck
RUN apk add --no-cache curl

# Copy shared types to /shared so ../../../shared/types from /app works
COPY shared /shared

# Copy alpha-utils to /packages/alpha-utils so ../../packages/alpha-utils from /app works
COPY backend/packages/alpha-utils/package.json /packages/alpha-utils/
RUN cd /packages/alpha-utils && npm install
COPY backend/packages/alpha-utils /packages/alpha-utils

COPY backend/services/main-api/package.json ./
RUN npm install

COPY backend/services/main-api ./

RUN npm run build

EXPOSE 8080
CMD ["node", "dist/server.js"]
