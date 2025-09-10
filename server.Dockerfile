FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV PORT=1337
EXPOSE 1337
CMD ["node", "src/server.js"]