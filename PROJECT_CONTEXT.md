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
- [x] AI_HANDOFF قدیمی، examples/d1، backupهای داخل app و Assetهای Starter بلااستفاده حذف شده‌اند.
- [x] Banner Reservation قدیمی و `/account/ads` حذف شده‌اند.
- [x] `AGENTS.md`، `CLAUDE.md` و متادیتای `codex-preview` حذف شده‌اند.
- [x] برنامه مستقل Affiliate/Ambassador حذف شده است؛ عضویت، KYC و پنل جدا دیگر وجود ندارد.
- [x] هسته Referral حفظ شده است: `/r/[code]` انتساب دعوت را ثبت می‌کند و Commerce کد دعوت را برای خرید واجد شرایط ارسال می‌کند.
- [x] Homeهای یتیم و مربوط به ساختارهای قبلی حذف شده‌اند: `HomeAutoBusinesses`، `HomeBusinessDirectory`، `HomeQuickServices`، `HomeServiceCategories`، `HomeBusinessBanners`، `HomeDealerAdBanner`، `HomeShowroomBanner`، `HomePaidBanner` و `HomeExperienceOverrides`.
- [x] مدیریت فعلی بنر صفحه اصلی با `HomeBannerSlot` و `/api/home-banners.php` حفظ شده است.
- [x] مسیر عمومی canonical نمایشگاه‌ها `/dealerships` است و پروفایل نهایی هر مجموعه از `/businesses/[slug]` استفاده می‌کند.
- [x] مدیریت canonical نمایشگاه/کسب‌وکار زیر `/account/business` است.
- [x] کد سنگین legacy در `/dealers` و `/showrooms/[dealer]` حذف شده و فقط Redirect سازگار برای لینک‌های قدیمی باقی مانده است.
- [x] داشبورد canonical کاربر `/account` است؛ UI قدیمی `/dashboard` حذف شده و مسیر فقط به `/account` Redirect می‌شود.
- [x] `/dashboard/listings` و `/dashboard/listings/[listingId]` فقط Redirectهای سازگار به مسیرهای `/account/listings` هستند.
- [x] `ai-moderation` مستقل حفظ شده است.

### Chakod AI Manager
- [x] Feature Flag و Provider contract روی `disabled | openai | local`.
- [x] Mode فعلی فقط `read_suggest` و Auto-write ممنوع است.
- [x] Provider Adapter، Tool Registry و Tool Executor Read-only اضافه شده‌اند.
- [x] Snapshotهای Listings / Businesses / Commerce قبل از Provider Sanitized می‌شوند.
- [x] `/admin` بازطراحی و `/admin/ai` ساخته شده است.
- [x] تست‌های هدفمند AI + moderation قبلاً 16/16 Pass شده‌اند.
- [~] Full Regression روی GitHub Actions ادامه دارد؛ نتیجه نهایی Build/Smoke هنوز باید دوباره گرفته شود.

## اولویت‌های بعدی
Priority 1: Cleanup-first؛ بررسی CSS/Assetهای یتیم، routeهای قدیمی Listing و اسناد قدیمی
Priority 2: ادامه Full Regression تا Build و Smoke
Priority 3: تکمیل Backend/API واقعی و Auth روی هاست
Priority 4: بازنویسی اسناد قدیمی مطابق محصول واقعی
Priority 5: تصمیم درباره main فقط پس از تأیید صریح مالک

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
