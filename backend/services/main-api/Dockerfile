FROM node:22-alpine
WORKDIR /app

# for healthcheck
RUN apk add --no-cache curl

COPY packages/alpha-utils ./packages/alpha-utils
COPY services/main-api/package*.json .
RUN npm install

COPY services/main-api ./

EXPOSE 8080
CMD ["node", "server.js"]
