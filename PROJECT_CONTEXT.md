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
Main branch: مبنای توسعه جاری نیست
```

تا پیش از تأیید صریح مالک و Build تولید، شاخه کاری با `main` ادغام نشود.

## وضعیت عملیاتی فعلی

### مرحله ۲ — پچ‌های پس از ممیزی

- [x] ممیزی مسیرها، صفحات، لینک‌ها و دکمه‌های اصلی انجام شد.
- [x] بازگشت امن ورود با `returnTo` اصلاح شد.
- [x] مسیرهای مدیریت برای کاربر عادی محافظت و پنهان شدند.
- [x] مسیرهای عمومی خودرو روی `/cars/*` تثبیت شدند.
- [x] مسیرهای ثبت و مدیریت آگهی روی `/account/listings/*` قرار دارند.
- [x] مسیرهای قدیمی خودرو و آگهی به مسیرهای اصلی Redirect می‌شوند.
- [x] صفحه 404 استاندارد و مسیر عمومی `/dealerships` وجود دارند.

### AI — پاک‌سازی Legacy Assistant و Foundation جدید

- [x] دستیار گفتگویی سراسری قدیمی از `RootLayout` و Runtime پروژه حذف شد.
- [x] Route قدیمی `/api/ai/assistant` و هسته `lib/ai-assistant/*` حذف شدند.
- [x] تست‌ها، Workflow و مستندات اختصاصی همان دستیار قدیمی حذف شدند.
- [x] متغیرهای محیطی اختصاصی Assistant قدیمی از `.env.example` حذف شدند.
- [x] سیستم مستقل Moderation آگهی در `app/api/ai/moderate-listing` و `lib/ai-moderation/*` حفظ شد.
- [x] Chakod AI Manager Foundation v0.1 به‌صورت جدا از هسته سایت اضافه شد.
- [x] Manager به‌صورت پیش‌فرض غیرفعال و Provider-agnostic تعریف شد.
- [x] Mode اولیه فقط `read_suggest` است و Write Action خودکار مجاز نیست.
- [x] Route مدیریتی `GET /api/ai/manager/status` فقط پس از تأیید ادمین پاسخ می‌دهد.
- [x] Status فقط وضعیت پیکربندی را گزارش می‌کند و Secret/API Key را افشا نمی‌کند.
- [x] تست Config برای fail-closed بودن Provider و Feature Flag اضافه شد.
- [~] اجرای Regression/CI برای Foundation جدید هنوز باید تأیید شود.

### Launch-1 — استارت اولیه محلی

- [x] `tsconfig.launch.json` برای محدوده استارت اولیه اضافه شد.
- [x] نوع‌های حداقلی Cloudflare Runtime اضافه شدند.
- [x] نصب قفل‌شده با `npm ci` موفق شده است.
- [x] تست‌های مسیرها، ورود و دسترسی در نسخه مبنا ثبت شده‌اند.
- [x] سرور محلی و مسیرهای `/`، `/cars` و `/login` قبلاً Smoke Test شده‌اند.

### Launch-2 — Affiliate TypeScript

- [x] خطاهای `HeadersInit` در پنل کاربر و مدیریت همکاری در فروش رفع شدند.
- [x] هر دو تابع `tokenHeaders` اکنون فقط `Record<string, string>` برمی‌گردانند.
- [x] TypeScript اختصاصی Affiliate بدون خطا اجرا شد.
- [x] PR شماره ۴ با Commit `7fa2c8d8c1b851042d441e80b0d9179a76b8f2ee` ادغام شد.

## وضعیت Build و موانع باز

- Build تولید Cloudflare در محیط فاقد فایل‌های زیر قابل اجرا نیست:

```text
.openai/hosting.json
build/sites-vite-plugin
```

این فایل‌ها محلی و Git-ignored هستند و نباید برای رفع CI به مخزن Commit شوند.

- گزارش قبلی `npm ci` شامل ۱۸ آسیب‌پذیری بود: ۱ کم، ۴ متوسط و ۱۳ بالا.
- هیچ `npm audit fix --force` نباید بدون تحلیل اثرات اجرا شود.

## اقدام‌های بعدی

```text
Priority 1: تکمیل و تثبیت Backend/API واقعی چاکود و Auth
Priority 2: اجرای Regression Test برای Legacy AI cleanup و AI Manager Foundation
Priority 3: ساخت Provider Adapter و Read-only Tool Registry برای Chakod AI Manager
Priority 4: تحلیل امن وابستگی‌ها و آسیب‌پذیری‌ها
Priority 5: تأیید Build تولید در محیط واقعی Cloudflare
```

## فناوری‌های مخزن

- Next.js 16 / App Router
- React 19
- TypeScript
- Vinext و Vite
- npm
- Cloudflare Workers / Pages و Wrangler
- Drizzle و D1
- PHP/MySQL backend در `api.chakod.com` برای بخش‌هایی از سیستم واقعی

## اسناد مرجع و ترتیب اعتبار

1. `docs/MASTER-SITEMAP-FA.md`
2. `docs/PROJECT-CHECKLIST-FA.md`
3. `docs/INITIAL-LAUNCH-CHECKLIST-FA.md`
4. `docs/CHAKOD-AI-MANAGER-FA.md`
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
5. هر مورد تکمیل‌شده همان لحظه در چک‌لیست مرتبط ثبت شود.
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

API Key، Token، Password، Secret، کلید خصوصی و اطلاعات اتصال واقعی دیتابیس نباید Commit شوند.
