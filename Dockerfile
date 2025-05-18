# Build stage
FROM node:20-alpine as builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY . .
ENV NODE_ENV=production
RUN npm run build

# Serve stage
FROM node:20-alpine
RUN npm install -g serve

WORKDIR /app
COPY --from=builder /app/build .

EXPOSE 3000
CMD ["serve", "-s", ".", "-l", "3000"]