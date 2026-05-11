FROM node:22-alpine
WORKDIR /app

# Copy shared types to /shared so ../../../shared/types from /app works
COPY shared /shared

# Copy alpha-utils to /packages/alpha-utils so ../../packages/alpha-utils from /app works
COPY backend/packages/alpha-utils/package.json /packages/alpha-utils/
RUN cd /packages/alpha-utils && npm install
COPY backend/packages/alpha-utils /packages/alpha-utils

COPY backend/services/scraping/package.json ./
RUN npm install && apk add curl

COPY backend/services/scraping ./

RUN npm run build

CMD ["node", "dist/launchScrapers.js"]
