FROM node:22-alpine
WORKDIR /app

# Copy package.json and install dependencies for Alpine
COPY frontend/package.json ./
RUN npm install

# Copy source files (node_modules excluded by .dockerignore)
COPY frontend .
EXPOSE 5379
CMD ["npm", "run", "dev", "--", "--host"]
