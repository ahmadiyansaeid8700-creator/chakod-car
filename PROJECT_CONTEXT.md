# Project Context — Chakod

## هویت پروژه

- **نام:** چاکود (`chakod-car`)
- **نوع محصول:** بازار خودرو، نمایشگاه‌ها و کسب‌وکارهای خودرویی
- **زبان و جهت رابط:** فارسی و RTL
- **اصل توسعه:** ادامه پروژه موجود؛ بازسازی از صفر و ایجاد مسیر موازی بدون تأیید ممنوع است.

## مخزن و شاخه کاری

```text
Repository: ahmadiyansaeid8700-creator/chakod-car
Working branch: backup-latest-2026-08-03
Latest known commit: 0da39d12692461c35d4d30504a15989a2bef4619
Main branch: مبنای توسعه جاری نیست
```

تا پیش از تأیید Build تولید، شاخه کاری با `main` ادغام نشود.

## وضعیت عملیاتی فعلی

### مرحله ۲ — پچ‌های پس از ممیزی

- [x] ممیزی کامل مسیرها، صفحات، لینک‌ها و دکمه‌ها انجام شد.
- [x] بازگشت امن ورود با `returnTo` اصلاح شد.
- [x] مسیرهای مدیریت برای کاربر عادی محافظت و پنهان شدند.
- [x] مسیرهای عمومی خودرو روی `/cars/*` تثبیت شدند.
- [x] مسیرهای ثبت و مدیریت آگهی روی `/account/listings/*` قرار دارند.
- [x] مسیرهای قدیمی خودرو و آگهی به مسیرهای اصلی Redirect می‌شوند.
- [x] صفحه 404 استاندارد و مسیر عمومی `/dealerships` وجود دارند.

### AI-1 — هسته مستقل دستیار

- [x] هسته Rule-based مستقل در `lib/ai-assistant/offline.ts` اضافه شد.
- [x] نبود کلید، Timeout یا خرابی مدل ابری به fallback مستقل منتهی می‌شود.
- [x] پاسخ داده‌محور فقط از داده رسمی چاکود ساخته می‌شود.
- [x] اطلاعات ورود، Token و داده کارت در گفتگو رد می‌شوند.
- [x] پنج تست AI مستقل، ESLint و TypeScript اختصاصی هسته موفق شدند.
- [x] Pull Request شماره ۲ با Commit `dc3174352d5c1cae46c085dc65bbd5956a9a2e63` ادغام شد.

### Launch-1 — استارت اولیه محلی

- [x] `tsconfig.launch.json` برای محدوده استارت اولیه اضافه شد.
- [x] نوع‌های حداقلی Cloudflare Runtime اضافه شدند.
- [x] نصب قفل‌شده با `npm ci` موفق شد.
- [x] TypeScript اولیه بدون خطا اجرا شد.
- [x] ۲۷ تست مسیرها، ورود، دسترسی، AI و Moderation موفق شدند.
- [x] ESLint فایل‌های پچ موفق شد.
- [x] سرور با `npm run dev` بالا آمد.
- [x] مسیرهای `/`، `/cars` و `/login` پاسخ HTTP موفق دادند.
- [x] Pull Request شماره ۳ با Commit `375deff98d4d73f11cf630778a0d384b61d4b5a8` ادغام شد.
- [x] چک‌لیست نهایی Launch-1 در `docs/INITIAL-LAUNCH-CHECKLIST-FA.md` ثبت شد.

## وضعیت Build و موانع باز

- Build تولید Cloudflare در محیط فاقد فایل‌های زیر قابل اجرا نیست:

```text
.openai/hosting.json
build/sites-vite-plugin
```

این فایل‌ها محلی و Git-ignored هستند و نباید برای رفع CI به مخزن Commit شوند.

- TypeScript بخش‌های Affiliate هنوز در پچ جداگانه نیازمند اصلاح است.
- گزارش `npm ci` شامل ۱۸ آسیب‌پذیری بود: ۱ کم، ۴ متوسط و ۱۳ بالا.
- هیچ `npm audit fix --force` اجرا نشده و نباید بدون تحلیل اثرات اجرا شود.

## اقدام بعدی

```text
Phase: Launch-2
Priority 1: اصلاح TypeScript بخش‌های Affiliate بدون کاهش strictness
Priority 2: تحلیل npm audit و رفع امن آسیب‌پذیری‌های قابل اصلاح
Priority 3: فراهم‌کردن پیش‌نیازهای محیط Cloudflare و تأیید Build تولید
```

هر کدام باید پچ، تست، PR و نقطه بازگشت مستقل داشته باشند.

## فناوری‌های مخزن

- Next.js 16 / App Router
- React 19
- TypeScript
- Vinext و Vite
- npm
- Cloudflare Workers / Pages و Wrangler
- Drizzle و D1
- CSS Modules و CSS عمومی

## اسناد مرجع و ترتیب اعتبار

1. `docs/MASTER-SITEMAP-FA.md`
2. `docs/PROJECT-CHECKLIST-FA.md`
3. `docs/INITIAL-LAUNCH-CHECKLIST-FA.md`
4. `docs/AI-ASSISTANT-CHECKLIST-FA.md`
5. `PROJECT_CONTEXT.md`
6. `TODO.md`
7. `README.md`
8. `AGENTS.md`
9. `CLAUDE.md`
10. `package.json`

در تعارض مسیرها، `docs/MASTER-SITEMAP-FA.md` مبنای محصول است.

## قواعد ثابت توسعه

1. قبل از هر پچ، فاز، هدف، مسیرها و فایل‌های درگیر اعلام شوند.
2. هر پچ کوچک، مستقل و قابل بازگشت باشد.
3. فرانت‌اند، بک‌اند و دیتابیس بی‌دلیل هم‌زمان تغییر نکنند.
4. نتیجه تست یا Build بدون اجرای موفق اعلام نشود.
5. هر مورد تکمیل‌شده همان لحظه در چک‌لیست مرتبط با `[x]` ثبت شود.
6. موارد در حال بررسی با `[~]` و موارد مسدود با `[!]` ثبت شوند.
7. مسیر موازی، داده ساختگی و قابلیت نیمه‌کاره وارد نسخه نهایی نشود.
8. پس از هر پچ، تست مرتبط، `PROJECT_CONTEXT.md` و `TODO.md` به‌روز شوند.
9. ادغام با `main` فقط با تأیید صریح مالک و پس از Build تولید انجام شود.

## فایل‌ها و اطلاعات ممنوع برای Git

```text
.env
.env.local
.env.*
!.env.example
.npmrc
.openai/
node_modules/
.next/
build/
dist/
out/
uploads/
app/api/config.php
app/api/config.php.secure
```

همچنین API Key، Token، Password، Secret، کلید خصوصی و اطلاعات اتصال واقعی دیتابیس نباید Commit شوند.

## قالب معرفی هر پچ

```text
Phase:
Patch title:
Purpose:
Affected routes:
Affected files:
Database impact:
Environment impact:
Rollback point:
Tests:
Result:
```
