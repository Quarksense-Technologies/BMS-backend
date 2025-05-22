# Dockerfile
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose app port (update if your app uses a different port)
EXPOSE 5000

# Start the app
CMD ["node", "index.js"]
