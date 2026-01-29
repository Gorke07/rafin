# Ürün Gereksinim Dokümanı (PRD)

**Proje Adı:** Ev Kütüphane Takip Sistemi (Kod Adı: Rafin)
**Versiyon:** 1.0 (MVP - Minimum Viable Product)
**Tarih:** 29 Ocak 2026
**Statü:** Onaylandı / Geliştirmeye Hazır

---

## 1. Giriş ve Amaç

### 1.1. Ürün Tanımı

Kullanıcıların fiziksel kitap koleksiyonlarını dijitalleştirmelerini, kitapların ev içerisindeki fiziksel konumlarını takip etmelerini ve okuma süreçlerini (sayfa sayısı, notlar) yönetmelerini sağlayan; kendi sunucularında barındırabilecekleri (self-hosted) web ve mobil uyumlu bir platformdur.

### 1.2. Çözülen Sorunlar

* "Bu kitabı almış mıydım?" sorusuna kesin cevap vermek (Mükerrer satın almayı önleme).
* "X kitabı şu an evin neresinde?" sorusunu konum hiyerarşisi ile çözmek.
* Okuma alışkanlıklarını ve kitaplara harcanan bütçeyi raporlamak.
* Aynı evdeki farklı bireylerin aynı kütüphaneyi ortak kullanırken kendi okuma süreçlerini ayrı ayrı takip edebilmesi.

---

## 2. Teknik Mimari Özeti

*Bu bölüm, geliştirme sürecindeki teknoloji kısıtlarını belirler.*

* **Altyapı:** Self-Hosted, Docker Container yapısı.
* **Backend:** Bun Runtime, ElysiaJS Framework.
* **Veritabanı:** PostgreSQL (Veri bütünlüğü için).
* **ORM:** Drizzle ORM (Type-safe veritabanı iletişimi).
* **Kimlik Doğrulama (Auth):** Better-Auth (Kullanıcı, oturum ve yetki yönetimi).
* **Frontend:** Next.js veya React (Mobil öncelikli responsive tasarım).

---

## 3. Kullanıcı Personaları ve Roller

### 3.1. Roller (Better-Auth Entegrasyonu ile)

1. **Yönetici (Admin):**
* Sistemi kuran kişidir.
* Kitap ekleme, silme, düzenleme yetkisine tam sahiptir.
* Konum (Oda/Raf) tanımlarını yapar.
* Diğer aile üyelerini sisteme davet edebilir.


2. **Üye (Member):**
* Mevcut kütüphane envanterini görüntüler.
* Kitapların fiziksel bilgilerini (konum vb.) değiştiremez (Opsiyonel: Ayarlanabilir).
* Kendi okuma durumunu, notlarını ve puanlamalarını yönetir.



---

## 4. Fonksiyonel Gereksinimler

### 4.1. Kimlik Doğrulama ve Profil (Auth)

* **Kayıt/Giriş:** E-posta ve şifre ile güvenli giriş. (Better-Auth standartları).
* **Oturum Yönetimi:** "Beni hatırla" özelliği ve güvenli oturum sonlandırma.
* **Profil:** Kullanıcı adı, avatar (profil fotoğrafı) yükleme.

### 4.2. Envanter Yönetimi (Kitaplar)

* **Hibrit Kitap Ekleme:**
* *Otomatik:* ISBN numarası girilerek (veya barkod taranarak) dış servislerden (Google Books vb.) Kitap Adı, Yazar, Yayınevi, Sayfa Sayısı ve Kapak Resmi verilerinin çekilmesi.
* *Manuel:* Otomatik çekilen verilerin elle düzeltilebilmesi veya sıfırdan manuel giriş.


* **Kapak Görseli:** İnternetten çekilen görselin sunucuya (local storage) indirilip kaydedilmesi (Link kırılmalarını önlemek için).
* **Finansal Veri:** Kitabın satın alındığı tarih, fiyat, para birimi ve mağaza bilgisinin girilmesi.
* **Kitap Detayları:** ISBN, Baskı Yılı, Çevirmen, Kategori (Etiketler).

### 4.3. Lokasyon (Konum) Takibi

Sistem, fiziksel dünyayı simüle eden bir ağaç yapısı kullanmalıdır.

* **Hiyerarşi:** `Oda` > `Mobilya` > `Raf/Bölüm`
* *Örnek:* Salon > Vitrin > 3. Raf


* **Atama:** Kitap eklenirken veya düzenlenirken veritabanındaki mevcut konumlardan biri seçilmelidir.
* **Toplu Taşıma:** "Bu raftaki tüm kitapları şu rafa taşı" özelliği (İleri faz).

### 4.4. Okuma Takibi (Kişisel Veri)

Bu veriler **User-Book-Relation** (Kullanıcı-Kitap İlişkisi) tablosunda tutulur ve her kullanıcı için benzersizdir.

* **Durumlar:**
* *TBR (To Be Read):* Okunacaklar listesinde.
* *Reading (Okunuyor):* Şu an okunuyor.
* *Completed (Tamamlandı):* Bitti.
* *DNF (Did Not Finish):* Yarım bırakıldı.


* **İlerleme:** Sayfa sayısı girişi (Örn: 145. sayfadayım). Arayüzde % (yüzde) barı olarak gösterilmesi.
* **Tarihçe:** "Ne zaman başladım?" ve "Ne zaman bitirdim?" verilerinin otomatik veya manuel kaydı.

### 4.5. Notlar ve Zenginleştirme

* **Alıntılar (Quotes):** Kitaptan sevilen cümlelerin sayfa numarası referansıyla kaydedilmesi.
* **İnceleme:** Kitap bittiğinde 1-5 yıldız arası puanlama ve detaylı inceleme yazısı.
* **Gizlilik:** Notların "Sadece ben görebilirim" veya "Evdeki herkes görebilir" olarak işaretlenebilmesi.

### 4.6. Arama ve Filtreleme

* **Global Arama:** Kitap adı, yazar veya ISBN ile anlık arama.
* **Akıllı Filtreler:**
* "Salondaki kitaplar"
* "Okumadığım kitaplar"
* "Stephen King kitapları"
* "2024 yılında aldığım kitaplar"



---

## 5. Veri Modeli ve İş Kuralları (Business Logic)

Kod yazmadan veritabanı mantığını şu kurallarla özetleyebiliriz:

1. **Tekillik Kuralı:** Fiziksel bir kitap (Envanter öğesi) veritabanında **1 kez** oluşturulur.
2. **Çoğulluk Kuralı:** O tek kitaba, birden fazla kullanıcı (Baba, Anne, Çocuk) kendi "Okuma Durumu" kaydını bağlayabilir.
* *Senaryo:* Kitap nesnesi silinirse, kullanıcılardaki okuma kayıtları da boşa düşmemeli, arşivlenmelidir (Soft Delete).


3. **Konum Kuralı:** Bir kitap fiziksel olarak aynı anda sadece bir konumda (Raf) bulunabilir.
4. **Yetki Kuralı:** "Admin" rolündeki kullanıcı tüm kitapları düzenleyebilir. "Üye" rolü sadece kendi okuma verisini düzenler.

---

## 6. Arayüz (UI/UX) Gereksinimleri

### 6.1. Genel Tasarım Dili

* Temiz, odaklı ve minimalist.
* Koyu Mod (Dark Mode) desteği (Gece okumaları sonrası giriş için kritik).

### 6.2. Mobil Görünüm (PWA Hedefli)

* Alt Navigasyon Barı: `Ana Sayfa` | `Kütüphanem` | `Barkod Tara` | `Profil`.
* Büyük butonlar (Parmakla kolay etkileşim için).
* Kamera entegrasyonu (Barkod tarama butonu her an erişilebilir olmalı).

### 6.3. Web Görünüm (Desktop)

* Tablo görünümü (Excel benzeri): Kitapları hızlıca düzenlemek, fiyatları girmek için "Data Grid" yapısı.
* Dashboard: "Bu ay kaç sayfa okudum?", "Toplam kitap değeri" gibi grafikler.

---

## 7. Entegrasyonlar ve Dış Servisler

* **Google Books API:** ISBN sorgusu için birincil kaynak. (Ücretsiz, API Key kullanıcı tarafından girilebilir veya backend üzerinden proxy yapılabilir).
* **Open Library API:** Yedek kaynak.
* **Image Handling:** Dış servislerden gelen kapak resim URL'leri zamanla değişebileceği için, resimler indirilmeli ve `/uploads` klasöründe sunulmalıdır.

---

## 8. Performans ve Güvenlik Beklentileri

* **Hız:** Bun + Elysia kullanıldığı için API yanıt süreleri <50ms olmalıdır.
* **Offline First (Hedef):** İnternet koptuğunda bile kütüphane listesi görüntülenebilmelidir (Service Worker / PWA cache).
* **Veri Güvenliği:** Better-Auth ile şifreler hashlenerek saklanmalı, API endpointleri session kontrolü (Guard) ile korunmalıdır.

---

## 9. Fazlandırma (Roadmap)

* **Faz 1 (MVP):**
* Kullanıcı girişi (Better-Auth).
* Manuel ve ISBN ile kitap ekleme.
* Konum tanımlama ve atama.
* Basit listeleme.


* **Faz 2 (Okuma Deneyimi):**
* Okuma durumu (Başladı/Bitti).
* Sayfa ilerleme takibi.
* Notlar ve alıntılar modülü.


* **Faz 3 (Analiz ve Sosyal):**
* Dashboard grafikleri (Yıllık okuma hedefi vb.).
* Çoklu kullanıcı yetkilendirmelerinin detaylandırılması.
* Toplu düzenleme özellikleri.


