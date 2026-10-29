const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function main() {
  console.log("\n========================================================");
  console.log("   🦁 LEUKOLION - BASİT TEST HESAPLARI OLUŞTURULUYOR   ");
  console.log("========================================================\n");

  // 1. Rolleri Garantiye Al
  const roles = [
    { id: 1, name_tr: 'Yönetici' },
    { id: 2, name_tr: 'Protokol' },
    { id: 3, name_tr: 'Akademisyen' },
    { id: 4, name_tr: 'Öğrenci' }
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { id: r.id },
      update: { name_tr: r.name_tr },
      create: { id: r.id, name_tr: r.name_tr }
    });
  }

  // 2. Basit Şifre: 123456
  const passwordHash = await bcrypt.hash('123456', 10);

  // 3. Ders ve Şube Kontrolü (Öğrencinin sınavları görebilmesi için)
  let course = await prisma.course.findFirst();
  if (!course) {
    let program = await prisma.program.findFirst();
    if (!program) {
      let dept = await prisma.department.findFirst();
      if (!dept) {
        let uni = await prisma.unity.findFirst();
        if (!uni) {
          let university = await prisma.university.findFirst();
          if (!university) {
            university = await prisma.university.create({ data: { name: 'Harran Üniversitesi' } });
          }
          uni = await prisma.unity.create({ data: { name: 'Mühendislik Fakültesi', universityId: university.id } });
        }
        dept = await prisma.department.create({ data: { name: 'Bilgisayar Mühendisliği', unityId: uni.id } });
      }
      program = await prisma.program.create({ data: { name: 'Lisans Programı', departmentId: dept.id } });
    }
    course = await prisma.course.create({ data: { name: 'Yazılım Mühendisliği', code: 'CENG301', programId: program.id } });
  }

  let branch = await prisma.branch.findFirst({ where: { courseId: course.id } });
  if (!branch) {
    branch = await prisma.branch.create({ data: { name: 'A Şubesi', courseId: course.id } });
  }

  // 4. AKADEMİSYEN (ÖĞRETİM GÖREVLİSİ) HESABI: "ogretmen" veya "akademisyen1"
  const academicUser = await prisma.user.upsert({
    where: { username: 'ogretmen' },
    update: {
      password: passwordHash,
      isActive: true,
      is_email_verified: true,
      forename: 'Öğretim',
      surname: 'Görevlisi'
    },
    create: {
      username: 'ogretmen',
      tc_kimlik: '33333333333',
      email: 'ogretmen@harran.edu.tr',
      password: passwordHash,
      forename: 'Öğretim',
      surname: 'Görevlisi',
      roleId: 3, // Akademisyen
      isActive: true,
      is_email_verified: true
    }
  });

  // "akademisyen1" hesabını da oluşturalım/garantiye alalım
  await prisma.user.upsert({
    where: { username: 'akademisyen1' },
    update: {
      password: passwordHash,
      isActive: true,
      is_email_verified: true,
      forename: 'Öğretim',
      surname: 'Görevlisi'
    },
    create: {
      username: 'akademisyen1',
      tc_kimlik: '33333333334',
      email: 'akademisyen@harran.edu.tr',
      password: passwordHash,
      forename: 'Öğretim',
      surname: 'Görevlisi',
      roleId: 3, // Akademisyen
      isActive: true,
      is_email_verified: true
    }
  });

  // 5. ÖĞRENCİ HESABI: "ogrenci"
  const studentUser = await prisma.user.upsert({
    where: { username: 'ogrenci' },
    update: {
      password: passwordHash,
      isActive: true,
      is_email_verified: true,
      forename: 'Örnek',
      surname: 'Öğrenci',
      branches: {
        connect: { id: branch.id }
      }
    },
    create: {
      username: 'ogrenci',
      tc_kimlik: '44444444444',
      email: 'ogrenci@harran.edu.tr',
      password: passwordHash,
      forename: 'Örnek',
      surname: 'Öğrenci',
      roleId: 4, // Öğrenci
      isActive: true,
      is_email_verified: true,
      branches: {
        connect: { id: branch.id }
      }
    }
  });

  console.log("✅ HESAPLAR BAŞARIYLA OLUŞTURULDU VEYA GÜNCELLENDİ!\n");
  console.log("--------------------------------------------------------");
  console.log("👨‍🏫 1. AKADEMİSYEN GİRİŞ BİLGİLERİ:");
  console.log("   Sekme       : 'Akademisyen' sekmesine tıklayın!");
  console.log("   Kullanıcı Adı: ogretmen (veya akademisyen1 veya 33333333333)");
  console.log("   Şifre       : 123456");
  console.log("--------------------------------------------------------");
  console.log("🎓 2. ÖĞRENCİ GİRİŞ BİLGİLERİ:");
  console.log("   Sekme       : 'Öğrenci' sekmesine tıklayın!");
  console.log("   Kullanıcı Adı: ogrenci  (veya 44444444444)");
  console.log("   Şifre       : 123456");
  console.log("--------------------------------------------------------\n");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Hata oluştu:", e);
  await prisma.$disconnect();
  process.exit(1);
});
