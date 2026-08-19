# ممیزی آمادگی لانچ چاکود — 2026-08-07

این سند نتیجه ممیزی کامل Repository روی شاخه `agent/launch-3-local-baseline` است.

## نتیجه اجرایی

**وضعیت: هنوز Launch-Ready نهایی نیست.**

اتصال داخلی صفحات، Routeها، CTAها، Build و Runtime تقریبا بسته شده‌اند. موانع باقی‌مانده عمدتا Integration/Backend/Staging هستند و یک Route مدیریتی مصوب (`/admin/users`) هنوز قرارداد Backend معتبر ندارد.

## شواهد ممیزی Repository

آخرین Full Launch Audit روی شاخه کاری این نتایج را ثبت کرده است:

- 128 صفحه کشف شد.
- 288 فایل Source داخل `app/` اسکن شد.
- 482 مقصد Navigation داخلی literal بررسی شد.
- Dead internal destination: **0**
- لینک خالی / `#` / `javascript:`: **0**
- دکمه `type=button` بدون Handler: **0**
- `a` / `Link` بدون `href`: **0**
- Placeholder واقعی لانچ (`TODO` / `FIXME` / به‌زودی / بخش در حال ساخت): **0**
- 104 صفحه Static روی Server واقعی Portable Vinext Runtime Smoke شدند و هیچ 4xx/5xx نداشتند.
- 23 Route داینامیک برای تست کامل به ID/slug/data واقعی Staging نیاز دارند.
- TypeScript Launch: **PASS**
- Contract tests: **43/43 PASS**
- Portable production bundle (RSC + SSR + Client + Server): **PASS**
- Portable runtime smoke: **PASS**
- Manifest / Robots / Sitemap index / dynamic sitemaps: **PASS**
- Chakod AI offline fallback بدون Cloud key: **PASS**

## امنیت Dependency

نسخه‌های تاییدشده فعلی:

- Next `16.3.0`
- React `19.2.8`
- React DOM `19.2.8`
- react-server-dom-webpack `19.2.8`
- Vite `8.1.5`
- `@cloudflare/vite-plugin` `1.51.1`
- Wrangler `4.120.0`
- Vinext `0.0.50`

Audit بعد از ارتقاهای کنترل‌شده:

- Critical: **0**
- High: **0**
- Moderate: **4**
- Low: **0**

هیچ `npm audit fix --force` اجرا نشده است. Moderateهای باقی‌مانده عمدتا در Tooling/Drizzle development chain هستند و باید بدون Breaking Change مدیریت شوند.

## مواردی که در همین ممیزی اصلاح شدند

- حذف دو Backup قدیمی فرم Submit از `app/`.
- بازنشسته کردن پنل‌های قدیمی بنر صفحه اول و اتصالشان به `Featured Showrooms`.
- غیرفعال کردن API ساخت رزرو بنر Legacy با `410 Gone`؛ مسیر `demo_paid` حذف شد.
- Read-only کردن سابقه رزروهای بنر قدیمی در Admin API.
- حذف تب/تعرفه فعال «رزرو بنر / بنر صفحه اصلی» از Commerce UI و نگهداری صرفا سازگاری داده تاریخی.
- تبدیل `/dashboard` قدیمی به Redirect به `/account`.
- تبدیل `/dealers/[dealerId]` قدیمی به مسیر canonical `/account/business`.
- اتصال Routeهای مصوب Affiliate به پنل canonical موجود.
- اتصال صف‌های Admin listing/business به پنل‌های canonical موجود.
- ساخت `/admin/legal` به عنوان Legal review hub.
- ساخت `/admin/locations` با داده زنده `/api/geo-locations`.
- اتصال `/admin/pricing` به Commerce canonical.
- حذف کارت Admin با متن «در حال ساخت» و اتصال آن به Audit Logs واقعی.
- اصلاح CTAهای داینامیک پروفایل کسب‌وکار تا `tel:` یا Maps/WhatsApp خالی تولید نشود.
- Hardening Sitemapها با timeout کوتاه و fallback معتبر تا کندی `api.chakod.com` Sitemap را قفل نکند.
- گسترش Runtime Smoke به تمام صفحات Static و تمام Sitemap/Manifest endpoints.

## تنها Route مصوب مفقود داخل Repository

`/admin/users`

این Route در `docs/MASTER-SITEMAP-FA.md` مصوب است، اما:

- در شاخه فعلی Page/API ندارد.
- در `backup-latest-2026-08-03` نیز قرارداد معتبری برای آن پیدا نشد.
- در شاخه‌های قبلی بررسی‌شده نیز Page/API معتبر پیدا نشد.
- Commerce فقط Admin accounts/permissions را مدیریت می‌کند و جایگزین فهرست همه کاربران پلتفرم نیست.

بنابراین ساخت یک صفحه ظاهری یا فهرست ناقص برای سبز کردن Audit ممنوع است. قبل از Launch یکی از این دو تصمیم لازم است:

1. Backend API واقعی فهرست/مدیریت کاربران تعریف و `/admin/users` به آن متصل شود؛ یا
2. مالک محصول صریحا `/admin/users` را از Scope لانچ و Master Sitemap حذف کند.

## موانع واقعی Integration قبل از Launch

### 1. Wallet Settlement واقعی

UI و State Machine امن ساخته شده‌اند، ولی Production settlement به قرارداد Backend واقعی نیاز دارد:

- `CHAKOD_WALLET_SETTLEMENT_ENDPOINT`
- `CHAKOD_WALLET_SETTLEMENT_ACTION`
- `CHAKOD_WALLET_SETTLEMENT_SECRET`

تا زمانی که Backend واقعی تنظیم نشده باشد، نباید پرداخت کیف پول Production-ready اعلام شود.

### 2. Bank Refund واقعی

Refund داخلی/Wallet و Admin workflow ساخته شده‌اند، اما Refund بانکی واقعی نیاز دارد به:

- `CHAKOD_REFUND_ENDPOINT`
- `CHAKOD_REFUND_ACTION`
- `CHAKOD_REFUND_SECRET`

### 3. D1 Migration روی محیط غیرتولیدی

Migration journal/SQL/Snapshot chain با Contract Test سبز است، اما Migrationهای جدید باید روی یک D1 non-production binding واقعی اجرا و صحت داده بررسی شوند.

### 4. Official Sites Build

`build:preflight` کاملا سبز است، اما `npm run build` رسمی به Hosting environment واقعی Sites و فایل‌های runtime/hosting تزریقی محیط استقرار وابسته است. این Build باید در محیط رسمی Staging اجرا شود.

### 5. Staging E2E داده‌دار

این جریان‌ها باید با داده و Credential واقعی Staging تست شوند:

- OTP/Login/Session و returnTo
- ثبت آگهی واقعی + تصاویر + ویرایش + مدیریت lifecycle
- Routeهای dynamic خودرو و کسب‌وکار با ID/slug واقعی
- خرید سرویس Commerce
- Gateway create/callback/verify
- Wallet settlement
- Invoice
- Refund
- Featured Showroom reservation/payment/review/display
- Business placement
- CMS article publish/read
- Admin permissions/access
- Support ticket lifecycle

## موارد غیرمسدودکننده ولی بهتر است بعد از Launch ادامه پیدا کنند

- Event tracking تماس/WhatsApp/مسیریابی کسب‌وکار در Backend.
- Draft server-side آگهی پیش از Submit.
- کاهش 4 vulnerability Moderate باقی‌مانده در Tooling در صورت امکان بدون Breaking Change.

## حکم فعلی

از نظر **ساختار داخلی Repository، لینک‌ها، CTAها، Routeهای Static، TypeScript، Contractها، Bundle و Runtime Portable** وضعیت بسیار نزدیک به نهایی است.

اما تا زمان تعیین تکلیف `/admin/users` و انجام **D1 + Gateway/Wallet/Refund + Official Sites Build + Staging E2E**، سایت نباید Production Launch شود.

## قانون ادامه

- `main` بدون تایید صریح مالک تغییر نکند.
- صفحه اصلی و ترتیب Responsive آن قفل است.
- بنر نمایشگاهی صفحه اول نباید برگردد.
- ادامه کار از همین سند و `docs/BUILD-CHECKPOINT-2026-08-07-C.md` انجام شود.
