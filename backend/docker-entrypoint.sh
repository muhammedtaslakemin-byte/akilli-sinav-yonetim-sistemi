#!/bin/sh
set -e

echo "🦁 [LEUKOLION] Bekleniyor: Veritabanı hazır mı..."
node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function waitDb() {
  for (let i = 0; i < 30; i++) {
    try {
      await prisma.$connect();
      console.log("🦁 [LEUKOLION] Veritabanı bağlantısı başarılı.");
      await prisma.$disconnect();
      process.exit(0);
    } catch (e) {
      console.log("🦁 [LEUKOLION] Veritabanı henüz hazır değil, bekleniyor... (" + (i+1) + "/30)");
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  console.error("🦁 [LEUKOLION] Veritabanına bağlanılamadı!");
  process.exit(1);
}
waitDb();
'

echo "🦁 [LEUKOLION] Prisma şeması senkronize ediliyor (db push)..."
npx prisma db push --skip-generate

echo "🦁 [LEUKOLION] Başlangıç verileri yükleniyor (seed)..."
node seedFullCorrected.js

echo "🦁 [LEUKOLION] Sunucu başlatılıyor..."
exec "$@"

