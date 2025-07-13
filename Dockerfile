# Development Dockerfile
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package.json yarn.lock ./

# Install all dependencies (including dev dependencies)
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Expose debug port
EXPOSE 9229

# Set development environment
ENV NODE_ENV=development

# Start development server with hot reloading
CMD ["yarn", "dev"] 