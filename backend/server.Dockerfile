FROM node:22-alpine
ARG LOCAL_PORT
WORKDIR /app
RUN apk add --no-cache curl
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE $LOCAL_PORT
CMD ["node", "src/server.js"]
