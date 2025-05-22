FROM node:18

# Set the working directory
WORKDIR /app

# Copy dependency files and install them
COPY package*.json ./
RUN npm install

# Copy all project files
COPY . .

# Expose backend port (update if you use another)
EXPOSE 5000

# Start the app (note: root-level index.js)
CMD ["node", "index.js"]