# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the project
RUN npm run build

# Expose the port your server runs on (change if needed)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]