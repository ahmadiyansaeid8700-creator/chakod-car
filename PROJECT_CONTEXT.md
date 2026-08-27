# Project Context — Chakod

## هویت پروژه
- نام: چاکود (`chakod-car`)
- نوع محصول: بازار خودرو، نمایشگاه‌ها و کسب‌وکارهای خودرویی
- زبان و جهت رابط: فارسی و RTL
- اصل توسعه: ادامه پروژه موجود؛ بازسازی موازی بدون تأیید ممنوع است.

## مخزن و شاخه‌ها
Repository: ahmadiyansaeid8700-creator/chakod-car
Working branch: backup-latest-2026-08-03
Regression branch: ci/admin-ai-regression-2026-08-27
Regression PR: #112 — merged into backup-latest-2026-08-03
Merged cleanup commit: 2d1de98d64a7c10a603bef45ea5bd81586f72ec2
Main branch: مبنای توسعه جاری نیست

ادغام با main فقط با تأیید صریح مالک انجام شود.

## وضعیت فعلی

### Legacy cleanup
- [x] Assistant سراسری قدیمی و ChatGPT starter حذف شده‌اند.
- [x] OpenAI Sites / Codex build scaffold شامل `.openai/hosting.json`، `sites-vite-plugin`، `.sites-runtime` و اسکریپت‌های Sites حذف شده است.
- [x] Banner Reservation و `/account/ads` حذف شده‌اند؛ مدیریت دستی بنر صفحه اصلی حفظ شده است.
- [x] Affiliate/Ambassador مستقل حذف شده و Referral واقعی کاربر حفظ شده است.
- [x] Homeهای یتیم، Backupهای تاریخی و Assetهای قدیمی اثبات‌شده حذف شده‌اند.
- [x] بازار خودرو از implementation قدیمی `/ads` به `app/cars/_catalog` منتقل شده و `/ads*` فقط Redirect است.
- [x] جزئیات خودرو زیر `/cars/[slug]` است و `/listing/[id]` فقط Redirect است.
- [x] نمایشگاه canonical `/dealerships`، پروفایل `/businesses/[slug]` و مدیریت `/account/business` است.
- [x] `/dealers*` و `/showrooms*` فقط Redirect سازگار هستند.
- [x] داشبورد canonical کاربر `/account` است و `/dashboard*` فقط Redirect است.
- [x] اسناد MASTER-SITEMAP، PROJECT-CHECKLIST و INITIAL-LAUNCH-CHECKLIST مطابق محصول جاری بازنویسی شده‌اند.
- [x] Cleanup و AI/Admin regression از PR #112 به working backup branch منتقل شده است.

### Chakod AI Manager
- [x] Feature Flag و Provider contract روی `disabled | openai | local`.
- [x] Mode فعلی فقط `read_suggest` و Auto-write ممنوع است.
- [x] Provider Adapter، Tool Registry و Tool Executor Read-only اضافه شده‌اند.
- [x] Snapshotهای Listings / Businesses / Commerce قبل از Provider Sanitized می‌شوند.
- [x] `/admin` بازطراحی و `/admin/ai` ساخته شده است.
- [x] `ai-moderation` مستقل حفظ شده است.

### Quality Gate — PR #112 / Run #34
- [x] `npm ci`
- [x] Dependency audit reporting
- [x] TypeScript Check
- [x] Core route tests: 14/14 Pass
- [x] AI Manager + Listing Moderation tests: 16/16 Pass
- [x] Lint
- [x] `npm run build`
- [x] Smoke مسیرهای اصلی
- [x] Smoke Redirectهای legacy شامل `/ads*`, `/dashboard`, `/dealers`, `/showrooms/*`, `/listing/*`
- [x] محافظت بدون Session برای `/admin` و `/admin/ai`

### Dependency / Security audit
آخرین Audit تعداد 18 vulnerability گزارش می‌کند: 2 Low و 16 High؛ Critical وجود ندارد.

Direct dependencyهای نیازمند بررسی/ارتقا:
- `@cloudflare/vite-plugin` 1.37.1 → Audit پیشنهاد 1.54.1 بدون SemVer major.
- `next` 16.2.6 → Audit پیشنهاد 16.3.3 بدون SemVer major.
- `react-server-dom-webpack` 19.2.6 → Audit پیشنهاد 19.2.8 بدون SemVer major.
- `vite` 8.0.13 → Audit پیشنهاد 8.2.2 بدون SemVer major.
- `wrangler` 4.92.0 در بازه آسیب‌پذیر تا 4.113.0 قرار دارد.
- `vinext` 0.0.50 برای رفع کامل Audit نیازمند 1.0.0-beta.8 است که تغییر major/beta محسوب می‌شود و باید جداگانه Regression شود.

`qrcode` و `@types/qrcode` حذف نمی‌شوند: تست حذف واقعی نشان داد `BusinessCardActions.tsx` و `ListingCardActions.tsx` به `qrcode` وابسته‌اند و حذف آن TypeScript را می‌شکند.

هیچ `npm audit fix --force` کور اجرا نشود. Dependency hardening باید در پچ/Branch مستقل و با Full Regression انجام شود.

## اولویت‌های بعدی
Priority 1: Dependency/Security hardening در Branch مستقل، ابتدا updateهای non-major و سپس تصمیم جدا برای Vinext major/beta
Priority 2: تکمیل Backend/API واقعی و Auth روی هاست
Priority 3: End-to-end OTP / Session / `/api/auth/me` / Profile / Listing / Upload
Priority 4: Staging smoke واقعی
Priority 5: main فقط بعد از Build/Regression و تأیید صریح مالک

## فناوری‌های اصلی
- Next.js 16 / App Router
- React 19
- TypeScript
- Vinext / Vite
- Cloudflare Workers
- PHP/MySQL backend در api.chakod.com

## اسناد مرجع
1. PROJECT_CONTEXT.md
2. TODO.md
3. docs/MASTER-SITEMAP-FA.md
4. docs/PROJECT-CHECKLIST-FA.md
5. docs/INITIAL-LAUNCH-CHECKLIST-FA.md
6. docs/CHAKOD-AI-MANAGER-FA.md
7. README.md
8. package.json

## قواعد ثابت توسعه
1. هر پچ کوچک، مستقل و قابل Revert باشد.
2. نتیجه تست یا Build بدون اجرای واقعی موفق اعلام نشود.
3. AI نباید هسته سایت را برای کارکرد عادی وابسته کند.
4. Toolهای AI در این فاز فقط Read-only هستند.
5. Secret، API Key، Token، Password و Credential واقعی وارد Git یا UI نشوند.
6. Backup تاریخی داخل app نگهداری نشود؛ Git تاریخچه است.
7. main تا تأیید صریح مالک تغییر نکند.
