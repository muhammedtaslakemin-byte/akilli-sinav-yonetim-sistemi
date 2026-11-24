# 🦁 LEUKOLION v2.0 - Temel Mimari Hatalar, MediaPipe Kısıtları ve Model Eğitimi Süreç Analizi

> **Doküman Türü:** Mimari Hata Teardown, MediaPipe Analizi ve Zaman Planı  
> **PDF Sürümü:** [LEUKOLION_V2_TEMEL_HATALAR_VE_EGITIM_SURECI_RAPORU.pdf](file:///c:/Users/LENOVO/Desktop/leukolin_v2.0/docs/LEUKOLION_V2_TEMEL_HATALAR_VE_EGITIM_SURECI_RAPORU.pdf) *(Kök dizin: [LEUKOLION_V2_TEMEL_HATALAR_VE_EGITIM_SURECI_RAPORU.pdf](file:///c:/Users/LENOVO/Desktop/leukolin_v2.0/LEUKOLION_V2_TEMEL_HATALAR_VE_EGITIM_SURECI_RAPORU.pdf))*  
> **Tarih:** 21 Kasım 2026

---

## 1. Yapay Zeka Yardımıyla Model Eğitimi Ne Kadar Zamanınızı Alır?

| Aşama | Ne Yapılacak? | Kim Yapacak? | Süre |
| :--- | :--- | :--- | :--- |
| **Aşama 1: Ortam Kurulumu** | Gerekli Python kütüphanelerinin (`torch`, `mediapipe`, `onnx` vb.) kurulması. | Yapay zeka scriptleri hazırlar, siz terminalde çalıştırırsınız. | **3 – 5 Dakika** |
| **Aşama 2: Veri Toplama** | Web kamerasının karşısına geçip yönlendirmelere göre (Merkez, Sağ, Sol, Telefon/Masa, Yukarı) poz verme. | **Sizin tek aktif eforunuz** (~3.000 koordinat karesi). | **10 – 15 Dakika** |
| **Aşama 3: Model Eğitimi** | 108 öznitelikli minik sinir ağının (MLP) eğitilmesi ve ONNX formatına dönüştürülmesi. | Bilgisayarınızın normal CPU'su otomatik çözer. | **45 – 90 Saniye** |
| **Aşama 4: Web Entegrasyonu** | Üretilen 80 KB'lık modelin React (`ExamRoom.tsx`) içerisine bağlanması ve canlı test. | Yapay zeka kodları entegre eder, siz sayfayı yenileyip test edersiniz. | **10 – 15 Dakika** |
| **TOPLAM SÜRE** | **Sıfırdan çalışan yapay zeka modeline ulaşma süresi:** | — | **~30 – 45 Dakika** |

---

## 2. MediaPipe Kütüphanesinin Gerçek Kısıtları Nelerdir?

1. **MediaPipe Bir "Göz Takipçisi" Değildir:**  
   MediaPipe FaceMesh, yalnızca yüzdeki geometrik tepe noktalarını bulan bir **3B Yüz Ağı Çıkarıcısıdır**. Öğrencinin nereye baktığını, odaklandığı noktayı veya niyetini bilmez. Size sadece 478 adet ham koordinat ($x, y, z$) verir. Eski kod bu koordinatları alıp iki noktayı birbirine bölerek yapay zeka yaptığını sanmıştır; bu tamamen ilkel bir yanılgıdır.
2. **Piksel Çözünürlüğü ve Sensör Gürültüsü Sınırı:**  
   Standart bir 720p web kamerasında, öğrenci ekrandan 60 cm uzakta otururken göz kapağı mesafesi kamerada **yalnızca 20 ila 30 pikseldir**. Kameradaki ışık parlaması veya sensör gürültüsü nedeniyle iris merkezi her karede 1-2 piksel titrer (jitter). 1 piksellik titreme, ekranda 6-8 cm'lik yapay bir sapmaya denk gelir.
3. **Perspektif Bozulması (Monocular Ambiguity):**  
   Tek bir RGB kameradan derinlik ($z$ ekseni) tahmin edilmeye çalışıldığında, kameranın görüş açısı (FOV) değiştikçe koordinat oranları bozulur; sabit matematiksel eşikler çalışmaz hale gelir.

---

## 3. Projenin En Temelinde Ne Yanlış Yapılmıştı?

| Hatalı Kod & Konum | Neden Temelden Hatalı? (Kök Neden) | Yol Açtığı Facia ve Çözüm |
| :--- | :--- | :--- |
| **`ExamRoom.tsx:483`**<br>`headRatio = \|CheekR - Nose\| / \|Nose - CheekL\|` | Sadece X ekseninde (sağa-sola dönüş / Yaw) oran alır. Y eksenini (aşağı eğilme / Pitch) tamamen yok sayar. | **Kucağa Bakışı Kaçırır:** Öğrenci kucağındaki telefona baktığında başın sağ-sol oranı 1.0 kalır; sistem öğrenciyi "soruya bakıyor" sanır. Çözüm: 3D SolvePnP. |
| **`ExamRoom.tsx:517`**<br>`irisPosition > 0.68 \|\| < 0.32` | Yalnızca sol gözün yatay pozisyonuna bakar. Sabit sayısal eşik (0.68) anatomik farklılıkları yok sayar. | **Haksız Kopya Suçlaması:** Göz kapağı hafif çekik veya asimetrik olan masum öğrenciler sürekli kopya ile suçlanır. Çözüm: Kişisel kalibrasyon ve eğitilmiş model. |
| **Fizyolojik Cehalet:**<br>VOR Refleksinin Yokluğu | Kafa ile göz hareketlerini birbirinden bağımsız iki ayrı `if` bloğunda denetler. | **Sahte Alarm Patlaması:** İnsan kafasını 15° sağa çevirip gözünü 15° sola odakladığında hala ekrana bakmaktadır. Mevcut kod anında alarm çalar. Çözüm: Bütünleşik Tensör Modeli. |
| **`ExamRoom.tsx:399`**<br>`setInterval(pollSession, 4000)` | WebRTC veya WebSocket yerine ilkel HTTP Polling ile her 4 saniyede sunucuya GET isteği atar. | **Sunucu Çökmesi:** 5.000 öğrenci sınava girdiğinde saniyede 1.250 HTTP sorgusu veritabanını kilitler. Çözüm: Socket.io Event mimarisi. |

---

## 4. Büyük Karşılaştırma: Ne Yapılmıştı vs. Ne Yapılmalı?

* **ESKİ YANLIŞ YAPI (Mevcut Durum):**  
  `Kamera -> MediaPipe -> İki Noktayı Birbirine Böl (2B Oran) -> Sabit Eşik (> 0.68) -> Hatalı Karar.`  
  *Sonuç:* %45 Yanlış Alarm, telefona bakışları kaçırma, gözlük takanları cezalandırma, 5.000 kişide çöken sunucu.
* **YENİ DOĞRU YAPI (Uygulayacağımız Mühendislik):**  
  1. **Öznitelik Çıkarıcı:** MediaPipe sadece 36 noktayı (108 sayıyı) çıkarır; karara karışmaz.  
  2. **Matematiksel Normalizasyon:** Koordinatlar burun köküne ötelenir ve göz mesafesine bölünerek kameradan bağımsızlaştırılır.  
  3. **Eğitilmiş Özel Model (Tiny ONNX MLP):** 108 sayıyı girdi alıp kafa açısı ile göz bebeği arasındaki ilişkiyi yapay zekayla çözer (< 1 ms sürede 5 sınıflı olasılık üretir).  
  4. **Sınav Öncesi 5 Noktalı Kalibrasyon:** Öğrencinin bireysel göz sınırlarını öğrenerek yanlış pozitifleri sıfırlar.  
  5. **Presigned URL + 15 KB Kanıt:** İhlal anında hafif WebP görseli sunucuyu yormadan depolamaya basılır.
