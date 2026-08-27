# TODO — Chakod

## وضعیت جاری

Project: chakod-car
Working branch: backup-latest-2026-08-03
Current focus: Cleanup-first و Full Regression بدون احیای قابلیت‌های قدیمی

## انجام‌شده

### Legacy cleanup

- [x] حذف Assistant، ChatGPT starter، AI_HANDOFF قدیمی و Scaffoldهای بلااستفاده
- [x] حذف Backupهای داخل app و Assetهای Starter بلااستفاده
- [x] حذف Banner Reservation قدیمی مبتنی بر ChatGPT/email auth و `demo_paid`
- [x] حذف D1 schema/migration و helperهای یتیم همان رزرو آزمایشی
- [x] حذف `/account/ads` و تمام CTA/تب‌های رزرو بنر
- [x] حذف `pending_banners` از Snapshot هوش مصنوعی
- [x] حذف `AGENTS.md` و `CLAUDE.md` قدیمی
- [x] حذف متادیتای آزمایشی `codex-preview`
- [x] حفظ ai-moderation مستقل

### Chakod AI Manager

- [x] Feature Flag و Provider contract
- [x] Mode `read_suggest`
- [x] ممنوعیت Auto-write
- [x] Provider Adapter برای OpenAI و Local با Timeout و fail-closed
- [x] Read-only Tool Registry
- [x] Read-only Tool Executor
- [x] Sanitization برای Listings / Businesses / Commerce
- [x] Tool API روی `/api/ai/manager/tools/[toolId]`
- [x] Suggestion API روی `/api/ai/manager/suggest`
- [x] بازطراحی `/admin` به Command Center
- [x] ساخت `/admin/ai`
- [x] ساخت کنسول پیشنهاد مدیریتی Read-only
- [x] اجرای تست هدفمند Config + Provider + Tool Executor + Moderation در Node 22: 16/16 Pass در اجرای قبلی

## اقدام‌های باز فوری

### Cleanup audit

- [~] بررسی خوشه Affiliate / Ambassador و حذف در صورت تأیید یتیم‌بودن در محصول فعلی
- [~] بررسی کامپوننت‌های Home که دیگر import نمی‌شوند
- [ ] یکسان‌سازی مسیرهای موازی `/showrooms`، `/dealerships` و `/dealers` پس از تعیین مسیر canonical
- [ ] حذف assetهای تکراری فقط پس از اثبات بلااستفاده‌بودن مسیر فایل
- [ ] بازنویسی `MASTER-SITEMAP-FA.md` مطابق محصول واقعی؛ سند فعلی هنوز قابلیت‌های حذف‌شده را فهرست می‌کند

### Regression / Build

- [~] GitHub Actions PR #112 برای Full Regression در حال استفاده است
- [x] `npm ci` در Runner واقعی GitHub پاس شد
- [x] TypeScript Check در Runner واقعی پاس شد
- [x] 14 تست Core Routes در Runner واقعی پاس شد
- [!] تست Tool Executor در اجرای مستقیم Node به‌دلیل import زنجیره‌ای `next/server` متوقف شد؛ helper خالص باید از وابستگی Next جدا شود
- [ ] اجرای مجدد تست‌های AI + moderation در CI بعد از اصلاح import boundary
- [ ] اجرای `npm run build`
- [ ] Smoke Test `/`, `/cars`, `/login`, `/admin`, `/admin/ai`
- [ ] Smoke امنیتی APIهای AI بدون Session

### Backend / Hosting

- [ ] ساخت یا بازیابی امن `chakod-private/secrets.php`
- [ ] تکمیل DB و Kavenegar secrets خارج از Git
- [ ] تست اتصال دیتابیس
- [ ] تست OTP
- [ ] استقرار PHP endpointهای موردنیاز
- [ ] Smoke Test ورود، پروفایل، آگهی و آپلود

### AI Manager — قبل از فعال‌سازی

- [ ] بررسی واقعی پاسخ `admin-listings.php` روی هاست
- [ ] بررسی واقعی پاسخ `admin-businesses.php` روی هاست
- [ ] بررسی واقعی پاسخ `admin-commerce.php` روی هاست
- [ ] تست Safe Off وقتی Provider غیرفعال است
- [ ] تست Suggestion endpoint با Provider معتبر
- [ ] ثبت Audit event برای درخواست‌های AI بدون ذخیره Prompt حساس یا Token

### Dependency audit

- [ ] بررسی 18 vulnerability گزارش‌شده توسط `npm ci` در CI: 2 low و 16 high
- [ ] ممنوعیت `npm audit fix --force` بدون بررسی دستی

### فاز Write آینده

- [ ] هیچ Write Tool قبل از طراحی Permission مستقل ساخته نشود
- [ ] Human Approval اجباری
- [ ] Audit مستقل برای هر اقدام
- [ ] امکان Cancel/Revert در صورت ماهیت اقدام

### Release

- [ ] Build واقعی Cloudflare
- [ ] بررسی دامنه‌ها و مسیرهای اصلی
- [ ] main فقط با تأیید صریح مالک تغییر کند

## قواعد ثابت

- Secret، Token، Password و داده واقعی کاربر وارد Git نشود.
- AI نباید هسته سایت را برای کارکرد عادی وابسته کند.
- نتیجه تست فقط بعد از اجرای واقعی موفق اعلام شود.
- Git تاریخچه است؛ Backup تاریخی داخل app نگهداری نشود.
