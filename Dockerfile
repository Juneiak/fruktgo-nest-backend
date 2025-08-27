# Используем официальный образ Node.js
FROM node:20

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем package.json и package-lock.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install

# Копируем весь код проекта внутрь контейнера
COPY . .

# Открываем порт 3000
EXPOSE 3000

# Команда для запуска NestJS
CMD ["npm", "run", "start:dev"]
