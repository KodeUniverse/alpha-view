FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG FRONTEND_LOCAL_PORT
EXPOSE $FRONTEND_LOCAL_PORT
CMD ["npm", "run", "dev"]
