# 🦁 LEUKOLION v2.0 - Yapay Zeka Destekli Uzaktan Sınav ve Gözetim Sistemi

LEUKOLION, modern web teknolojileri ve yapay zeka entegrasyonuyla geliştirilmiş, uzaktan eğitim süreçlerinde sınav güvenliğini ve gözetimini en üst seviyeye çıkarmayı hedefleyen kapsamlı bir **Çevrimiçi Sınav ve Gözetim Platformudur**. Bu proje, TÜBİTAK destekli bir altyapı ile Harran Üniversitesi Sınav Merkezi için özel olarak uyarlanmıştır.

---

## 🌟 Öne Çıkan Özellikler

*   **PWA (Progressive Web App) Desteği**: Uygulamayı web üzerinden doğrudan mobil cihazınızın veya bilgisayarınızın ana ekranına uygulama olarak indirebilir, tıpkı yerel bir mobil uygulama gibi kullanabilirsiniz.
*   **Yapay Zeka Destekli Gözetim (Google MediaPipe FaceMesh)**: Öğrenci sınav esnasında kamerasıyla izlenir. Yapay zeka modelleri tarayıcı üzerinde yerel olarak çalışarak şüpheli durumları tespit eder:
    *   *Yüz Algılama & Takibi (Kamerada yüz var mı/yok mu?)*
    *   *Birden Fazla Kişi Tespiti (Kamerada başkaları var mı?)*
    *   *Bakış ve İris Odak Yönü (Öğrenci ekrandan başka bir yere uzun süre bakıyor mu?)*
    *   *Ortam Ses Seviyesi (Web Audio API RMS analiziyle konuşma/gürültü tespiti)*
*   **Rol Tabanlı Dinamik Yönetim Sistemleri**:
    *   **Yönetici Paneli (Admin)**: Kullanıcı yönetimi, birim tanımlamaları, sistem logları ve veritabanı istatistiklerini takip etme.
    *   **Protokol Paneli (Rektör/Dekan)**: Tüm aktif sınavların canlı durumunu izleme, güvenlik ihlali analizleri ve genel raporlama grafikleri.
    *   **Akademisyen Paneli (Eğitmen)**: PDF tabanlı veya manuel sınav oluşturma, soru havuzunu yönetme, sınav sırasında öğrencilerin kamera akışlarını canlı izleme ve yapay zeka ihlal günlüklerini inceleme.
    *   **Öğrenci Paneli**: Aktif sınavlara girme, sınav öncesi kamera ve ekran paylaşımı doğrulama aşamaları, kararlı sınav çözme arayüzü ve geçmiş sınav sonuçlarını sorgulama.
*   **Gelişmiş PDF Soru Çıkarma Arayüzü**: Yüklenen sınav PDF dosyalarından yapay zeka ve metin işleme ile soruları otomatik olarak ayrıştırarak sınav havuzuna aktarma.
*   **Güvenli ve İzlenebilir Altyapı**: Tüm sistem hareketleri ve ihlaller veritabanında loglanır ve anlık olarak gözetmen panellerine yansıtılır.

---

## 🛠️ Kullanılan Teknolojiler

### Arayüz (Frontend)
*   **React 19** & **TypeScript** (Tip güvenliği ve modern bileşen yapısı)
*   **TailwindCSS v4** (Modern, şık ve responsive kullanıcı arabirimi)
*   **React Router v7** (İstemci taraflı kararlı yönlendirme)
*   **Google MediaPipe FaceMesh** (Tarayıcı içi donanım hızlandırmalı yüz ve iris takip modelleri)
*   **Web Audio API** (Yerel ortam ses genlik ve gürültü analizi)

### Arka Plan (Backend)
*   **Node.js** & **Express.js v5** (Hızlı ve ölçeklenebilir API sunucusu)
*   **Prisma ORM** (Veritabanı erişim ve şema yönetim katmanı)
*   **PostgreSQL** (Güvenilir ilişkisel veritabanı)
*   **Docker & Docker Compose** (Konteynerleştirilmiş veritabanı altyapısı)
*   **PM2** (Üretim ortamında kesintisiz sunucu proses yönetimi)

---

## 📂 Proje Yapısı

```text
├── backend/            # Express.js API Sunucusu, Prisma şemaları ve Seed betikleri
│   ├── controllers/    # API İş mantığı kontrolörleri
│   ├── prisma/         # Prisma Veritabanı şeması ve göçleri (Migrations)
│   ├── routes/         # API Yol tanımlamaları
│   ├── public/         # Derlenmiş Frontend üretim dosyalarının sunulduğu klasör
│   └── server.js       # Sunucu başlangıç dosyası
├── frontend/           # React + Vite Arayüz uygulaması
│   ├── public/         # Statik varlıklar (Favicon, Manifest, Service Worker)
│   └── src/            # Kaynak kodlar (Bileşenler, Sayfalar, Layouts, API modülü)
├── mobile_client/      # Flutter Mobil Uygulama (Android / iOS / Desktop)
└── docker-compose.yml  # PostgreSQL veritabanı konteyner yapılandırması
```

---

## 🚀 Yerel Kurulum Adımları

Projeyi kendi yerel bilgisayarınızda çalıştırmak için aşağıdaki adımları uygulayabilirsiniz:

### 1. Depoyu Klonlayın
```bash
git clone https://github.com/sukru00dev/leukolion.git
cd leukolion
```

### 2. Veritabanını Başlatın
PostgreSQL veritabanını Docker ile başlatmak için:
```bash
docker-compose up -d
```

### 3. Arka Planı (Backend) Yapılandırın ve Çalıştırın
```bash
cd backend
npm install

# .env dosyasını oluşturun ve veritabanı bağlantı bilgilerini tanımlayın:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/leukolion?schema=public"
# PORT=5000

# Veritabanı şemasını uygulayın ve test verilerini doldurun:
npx prisma db push
node seedFullCorrected.js

# Sunucuyu geliştirici modunda başlatın:
npm run dev
```

### 4. Arayüzü (Frontend) Yapılandırın ve Çalıştırın
```bash
cd ../frontend
npm install

# .env.local dosyası oluşturup API adresini tanımlayın:
# VITE_API_URL=http://localhost:5000/api

# Arayüzü başlatın:
npm run dev
```
Tarayıcınızdan `http://localhost:5173` adresine giderek uygulamaya erişebilirsiniz.

---

## ☁️ Canlı Dağıtım (Production Deployment)

Uygulama, **Oracle Cloud Free Tier** sunucusu üzerinde kesintisiz çalışacak şekilde yapılandırılmıştır.

*   **Canlı Erişim Adresi**: [http://140.245.7.158:5001/](http://140.245.7.158:5001/)
    > [!IMPORTANT]
    > Modern tarayıcılar (Chrome, Edge, Safari vb.) `getUserMedia` (kamera/mikrofon) erişimini W3C gereğince yalnızca güvenli bağlamlarda (**HTTPS** veya `localhost`) onaylar. Canlı sunucuda kamera gözetiminin tarayıcı tarafından engellenmemesi için alan adı ve SSL sertifikası (Let's Encrypt / Reverse Proxy) yapılandırılmalıdır.

### 🔒 Nginx & SSL (HTTPS) Yapılandırma Kılavuzu

Canlı ortamda öğrencilerin kamera/mikrofon erişiminin engellenmemesi için sunucuda Nginx Reverse Proxy ve Let's Encrypt SSL kurulumu önerilir:

1. **Nginx ve Certbot Kurulumu:**
   ```bash
   sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
   ```

2. **Nginx Sanal Konak Yapılandırması (`/etc/nginx/sites-available/leukolion`):**
   ```nginx
   server {
       listen 80;
       server_name sinav.harran.edu.tr; # Alan adınızı yazın

       location / {
           proxy_pass http://127.0.0.1:5001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Aktifleştirme ve Ücretsiz SSL Sertifikası Tanımlama:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/leukolion /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d sinav.harran.edu.tr
   ```
   *Certbot, SSL sertifikasını otomatik olarak yapılandıracak ve HTTP isteklerini HTTPS'e yönlendirecektir.*
*   **Port Yapılandırması**: Çakışmaları önlemek için canlı ortam `5001` portundan yayın yapmaktadır.
*   **PM2 Yönetimi**: Sunucu üzerinde Node.js uygulaması PM2 ile başlatılmıştır:
    ```bash
    cd ~/leukolion/backend
    pm2 start server.js --name leukolion
    pm2 save
    ```
*   **Statik Dosya Sunumu**: Express sunucusu, üretim ortamında frontend derleme çıktılarını (`dist/*`) doğrudan `backend/public` altından statik olarak sunar ve HTML5 Router fallback desteği ile yönlendirir.

---

## 👥 Test Hesapları (Canlı Ortam)

Sistemi canlı sunucuda test etmek için aşağıdaki seeded (hazır oluşturulmuş) hesapları kullanabilirsiniz. Tüm hesapların şifresi **`123456`**'dır.

| Rol | Giriş Yöntemi (T.C. Kimlik / Kullanıcı Adı) | Şifre |
| :--- | :--- | :--- |
| **Yönetici (Admin)** | `11111111111` veya `admin` | `123456` |
| **Protokol (Rektör)** | `22222222222` veya `rektor` | `123456` |
| **Akademisyen (Öğretmen)** | `33333333333` veya `dursun` | `123456` |
| **Öğrenci** | `44444444444` veya `ogrenci1` | `123456` |

---
*Bu proje Harran Üniversitesi Bilgisayar Mühendisliği Bölümü öğrencileri ve akademisyenlerinin uzaktan eğitim süreçlerini daha güvenli hale getirmek amacıyla tasarlanmıştır.*
