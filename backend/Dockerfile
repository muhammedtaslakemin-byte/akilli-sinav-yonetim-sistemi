FROM node:20-slim

WORKDIR /app

# Native modüller ve Prisma için gerekli sistem paketleri
RUN apt-get update -y && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY . .

# Giriş betiğine çalıştırma yetkisi ver ve CRLF temizliği sağla
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 5001

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]

