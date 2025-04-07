FROM node:16-alpine

WORKDIR /app

# Копируем package.json и lock-файл
COPY package.json package-lock.json ./

RUN npm install

COPY . .

EXPOSE 3000

ENV CHOKIDAR_USEPOLLING=true

CMD ["npm", "start"]