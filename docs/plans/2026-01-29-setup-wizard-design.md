# Setup Wizard Design

**Tarih:** 2026-01-29
**Amaç:** Veritabanında hiç kullanıcı yokken ilk admin hesabını oluşturmak için wizard

---

## Genel Akış

```
Kullanıcı siteye gelir
       ↓
API: /api/setup/status kontrol
       ↓
┌─────────────────────────────────┐
│ Kullanıcı var mı?               │
│   EVET → Normal login sayfası   │
│   HAYIR → Setup wizard          │
└─────────────────────────────────┘
       ↓
Setup Wizard (3 adım):
  1. Hoşgeldin - Uygulama tanıtımı, "Başla" butonu
  2. Hesap Bilgileri - İsim, email, şifre formu
  3. Özet - Girilen bilgiler, "Tamamla" butonu
       ↓
Admin hesabı oluşturulur
       ↓
Otomatik login → Dashboard'a yönlendir
```

---

## Dosya Yapısı

```
apps/api/src/
├── routes/
│   └── setup.ts          # GET /api/setup/status
│                         # POST /api/setup/complete

apps/web/
├── app/
│   └── setup/
│       ├── page.tsx      # Setup wizard ana sayfası
│       └── layout.tsx    # Setup-specific layout (minimal, sidebar yok)
├── components/
│   └── setup/
│       ├── SetupWizard.tsx    # Ana wizard container + state yönetimi
│       ├── StepWelcome.tsx    # Adım 1: Hoşgeldin
│       ├── StepAccount.tsx    # Adım 2: Hesap formu
│       └── StepSummary.tsx    # Adım 3: Özet ve onay
├── hooks/
│   └── useSetupStatus.ts     # Setup durumu kontrolü
```

---

## API Endpoints

### GET /api/setup/status
Setup gerekip gerekmediğini kontrol eder.

**Response:**
```json
{ "needsSetup": true }
```

### POST /api/setup/complete
Admin hesabı oluşturur ve session başlatır.

**Request:**
```json
{
  "name": "Admin",
  "email": "admin@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{ "success": true }
```

---

## Veri Akışı

### Wizard State
```typescript
interface SetupState {
  step: 1 | 2 | 3
  data: {
    name: string
    email: string
    password: string
  }
}
```

### Form Validasyonu (Adım 2)
- İsim: minimum 2 karakter
- Email: geçerli email formatı
- Şifre: minimum 8 karakter

### Submit Akışı (Adım 3)
```
"Tamamla" butonuna tıkla
       ↓
POST /api/setup/complete { name, email, password }
       ↓
API: Kullanıcı oluştur (Better-Auth)
       ↓
API: Session başlat, cookie set et
       ↓
Response: { success: true }
       ↓
Client: redirect → /dashboard
```

---

## Hata Durumları

| Hata | Mesaj |
|------|-------|
| Email zaten var | "Bu email kullanımda" |
| Network hatası | "Bağlantı hatası, tekrar deneyin" |

---

## Kararlar

- **Tetikleme:** Veritabanında hiç kullanıcı yoksa
- **Kapsam:** Sadece admin hesabı oluşturma (minimal)
- **UI:** Adım adım stepper
- **Adımlar:** 3 adım (Hoşgeldin → Hesap → Özet)
- **Kontrol:** API endpoint `/api/setup/status`
