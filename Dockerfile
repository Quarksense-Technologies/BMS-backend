FROM node:18
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Fix 1: Set the right working directory to locate server/index.js
WORKDIR /app/server

EXPOSE 5000
CMD ["node", "index.js"]
