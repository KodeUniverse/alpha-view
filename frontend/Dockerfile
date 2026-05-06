FROM node:22-alpine
WORKDIR /app

# Copy shared types so ../shared/types from /app works
COPY shared /shared

COPY frontend/package.json ./
RUN npm install

COPY frontend .
EXPOSE 5379
CMD ["npm", "run", "dev", "--", "--host"]
