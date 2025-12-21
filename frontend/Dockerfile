FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG LOCAL_PORT
EXPOSE $LOCAL_PORT
CMD ["npm", "run", "dev", "--", "--host"]
