# Project Context — Chakod

## هویت پروژه

- نام: چاکود (`chakod-car`)
- نوع محصول: بازار خودرو، نمایشگاه‌ها و کسب‌وکارهای خودرویی
- زبان و جهت رابط: فارسی و RTL
- اصل توسعه: ادامه پروژه موجود؛ بازسازی از صفر و ایجاد مسیر موازی بدون تأیید ممنوع است.

## مخزن و شاخه کاری

Repository: ahmadiyansaeid8700-creator/chakod-car
Working branch: backup-latest-2026-08-03
Main branch: مبنای توسعه جاری نیست

تا پیش از تأیید صریح مالک و Build تولید، شاخه کاری با main ادغام نشود.

## وضعیت عملیاتی فعلی

### مسیرها و دسترسی

- [x] بازگشت امن ورود با returnTo اصلاح شده است.
- [x] مسیرهای مدیریت برای کاربر عادی محافظت و پنهان شده‌اند.
- [x] مسیرهای عمومی خودرو روی /cars/* تثبیت شده‌اند.
- [x] ثبت و مدیریت آگهی روی /account/listings/* قرار دارد.
- [x] مسیرهای قدیمی خودرو و آگهی Redirect می‌شوند.
- [x] صفحه 404 استاندارد و مسیر عمومی /dealerships وجود دارند.

### AI — وضعیت فعلی

- [x] دستیار گفتگویی سراسری قدیمی از RootLayout و Runtime حذف شده است.
- [x] Route قدیمی /api/ai/assistant و lib/ai-assistant/* حذف شده‌اند.
- [x] UI، تست‌ها، Workflow و مستندات اختصاصی Assistant قدیمی حذف شده‌اند.
- [x] app/chatgpt-auth.ts و مستندات Sign in with ChatGPT مربوط به Starter حذف شده‌اند.
- [x] Chakod AI Manager Foundation v0.1 جدا از هسته سایت ایجاد شده است.
- [x] Manager به‌صورت پیش‌فرض غیرفعال، Provider-agnostic و در Mode اولیه read_suggest است.
- [x] GET /api/ai/manager/status فقط پس از تأیید ادمین پاسخ می‌دهد و Secret افشا نمی‌کند.
- [x] Moderation مستقل آگهی در app/api/ai/moderate-listing و lib/ai-moderation/* حفظ شده است.
- [~] Regression/CI برای Foundation جدید هنوز باید به‌صورت واقعی تأیید شود.

### Legacy / Starter cleanup

- [x] AI_HANDOFF.md قدیمی حذف شد تا Baselineهای تاریخی با وضعیت جاری اشتباه نشوند.
- [x] README مربوط به vinext-starter با README واقعی چاکود جایگزین شد.
- [x] examples/d1 نمونه Scaffold حذف شد.
- [x] فایل‌های بکاپ app/submit/page.before-*.tsx حذف شدند.
- [x] INSTALL-FA.txt و LOCALHOST-FA.txt قدیمی و ناسازگار با Workflow فعلی حذف شدند.
- [ ] سایر فایل‌های عمومی مشکوک فقط پس از اثبات بلااستفاده بودن حذف شوند.

## اقدام‌های بعدی

Priority 1: تکمیل و تثبیت Backend/API واقعی چاکود و Auth
Priority 2: اجرای Regression Test برای Cleanup و AI Manager Foundation
Priority 3: ساخت Provider Adapter و Read-only Tool Registry برای Chakod AI Manager
Priority 4: تحلیل امن وابستگی‌ها و آسیب‌پذیری‌ها
Priority 5: تأیید Build تولید در محیط واقعی Cloudflare

## فناوری‌های مخزن

- Next.js 16 / App Router
- React 19
- TypeScript
- Vinext و Vite
- npm
- Cloudflare Workers / Pages و Wrangler
- Drizzle و D1
- PHP/MySQL backend در api.chakod.com برای بخش‌هایی از سیستم واقعی

## اسناد مرجع

1. docs/MASTER-SITEMAP-FA.md
2. docs/PROJECT-CHECKLIST-FA.md
3. docs/INITIAL-LAUNCH-CHECKLIST-FA.md
4. docs/CHAKOD-AI-MANAGER-FA.md
5. PROJECT_CONTEXT.md
6. TODO.md
7. README.md
8. AGENTS.md
9. CLAUDE.md
10. package.json

در تعارض مسیرها، docs/MASTER-SITEMAP-FA.md مبنای محصول است.

## قواعد ثابت توسعه

1. قبل از هر پچ، فاز، هدف، مسیرها و فایل‌های درگیر اعلام شوند.
2. هر پچ کوچک، مستقل و قابل بازگشت باشد.
3. فرانت‌اند، بک‌اند و دیتابیس بی‌دلیل هم‌زمان تغییر نکنند.
4. نتیجه تست یا Build بدون اجرای موفق اعلام نشود.
5. مسیر موازی، داده ساختگی و قابلیت نیمه‌کاره وارد نسخه نهایی نشود.
6. پس از هر پچ، تست مرتبط، PROJECT_CONTEXT.md و TODO.md به‌روز شوند.
7. ادغام با main فقط با تأیید صریح مالک و پس از Build تولید انجام شود.
8. فایل یا کد قدیمی صرفاً به دلیل مشکوک بودن حذف نشود؛ باید بلااستفاده یا متناقض بودن آن قابل اثبات باشد.

## اطلاعات ممنوع برای Git

فایل‌های محیطی واقعی، Secretها، API Keyها، Tokenها، Passwordها، داده واقعی کاربران، uploads و اطلاعات واقعی اتصال دیتابیس نباید Commit شوند.
