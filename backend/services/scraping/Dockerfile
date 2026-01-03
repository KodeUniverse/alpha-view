FROM node:22-alpine
WORKDIR /app

COPY services/scraping/package*.json ./
COPY packages/alpha-utils ./packages/alpha-utils
RUN npm install && apk add curl

COPY services/scraping ./
CMD ["node", "launchScrapers.js"]
