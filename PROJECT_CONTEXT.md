# Project Context — Chakod

## هویت پروژه
- نام: چاکود (`chakod-car`)
- نوع محصول: بازار خودرو، نمایشگاه‌ها و کسب‌وکارهای خودرویی
- زبان و جهت رابط: فارسی و RTL
- اصل توسعه: ادامه پروژه موجود؛ بازسازی موازی بدون تأیید ممنوع است.

## مخزن و شاخه کاری
Repository: ahmadiyansaeid8700-creator/chakod-car
Working branch: backup-latest-2026-08-03
Main branch: مبنای توسعه جاری نیست

ادغام با main فقط با تأیید صریح مالک و پس از Build/Regression واقعی انجام شود.

## وضعیت فعلی

### Legacy cleanup
- [x] Assistant سراسری قدیمی، ChatGPT starter و مسیرهای وابسته حذف شده‌اند.
- [x] Banner Reservation قدیمی و `/account/ads` حذف شده‌اند.
- [x] برنامه مستقل Affiliate/Ambassador حذف شده و هسته Referral کاربر حفظ شده است.
- [x] Homeهای یتیم و Assetهای قدیمی اثبات‌شده حذف شده‌اند؛ `HomeBannerSlot` فعلی حفظ شده است.
- [x] مسیر عمومی canonical نمایشگاه‌ها `/dealerships`، پروفایل `/businesses/[slug]` و مدیریت `/account/business` است.
- [x] `/dealers` و `/showrooms/[dealer]` فقط Redirect سازگار هستند.
- [x] داشبورد canonical کاربر `/account` است و `/dashboard` فقط Redirect است.
- [x] مسیر canonical جزئیات خودرو `/cars/[slug]` است و `/listing/[id]` فقط Redirect سازگار است.
- [x] Workflow اصلی Regression از مسیرها و excludeهای Affiliate قدیمی پاک شده و Smoke مسیرهای canonical/legacy را پوشش می‌دهد.
- [x] helperهای خالص API از `next/server` جدا شده‌اند تا AI Tool Executor در Node مستقیم قابل تست باشد.
- [x] `ai-moderation` مستقل حفظ شده است.

### Chakod AI Manager
- [x] Feature Flag و Provider contract روی `disabled | openai | local`.
- [x] Mode فعلی فقط `read_suggest` و Auto-write ممنوع است.
- [x] Provider Adapter، Tool Registry و Tool Executor Read-only اضافه شده‌اند.
- [x] Snapshotهای Listings / Businesses / Commerce قبل از Provider Sanitized می‌شوند.
- [x] `/admin` بازطراحی و `/admin/ai` ساخته شده است.
- [x] تست‌های هدفمند AI + moderation قبلاً 16/16 Pass شده‌اند.
- [~] Full Regression بعد از Cleanupهای جدید باید دوباره تا Build/Smoke اجرا شود.

## اولویت‌های بعدی
Priority 1: اجرای Full Regression واقعی روی PR تست
Priority 2: بازنویسی اسناد قدیمی و بررسی Assetهای تکراری باقی‌مانده
Priority 3: تکمیل Backend/API واقعی و Auth روی هاست
Priority 4: تصمیم درباره main فقط پس از تأیید صریح مالک

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
3. docs/CHAKOD-AI-MANAGER-FA.md
4. docs/MASTER-SITEMAP-FA.md — قدیمی و نیازمند بازنویسی
5. docs/PROJECT-CHECKLIST-FA.md
6. README.md
7. package.json

## قواعد ثابت توسعه
1. هر پچ کوچک، مستقل و قابل Revert باشد.
2. نتیجه تست یا Build بدون اجرای واقعی موفق اعلام نشود.
3. AI نباید هسته سایت را برای کارکرد عادی وابسته کند.
4. Toolهای AI در این فاز فقط Read-only هستند.
5. Secret، API Key، Token، Password و Credential واقعی وارد Git یا UI نشوند.
6. Backup تاریخی داخل app نگهداری نشود؛ Git تاریخچه است.
7. main تا تأیید صریح مالک تغییر نکند.
