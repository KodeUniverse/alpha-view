FROM node:22-alpine
ARG LOCAL_PORT
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE $LOCAL_PORT
CMD ["node", "src/server.js"]
