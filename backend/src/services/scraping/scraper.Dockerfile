FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install && apk add curl
COPY . .
CMD ["node", "launchScrapers.js"]

