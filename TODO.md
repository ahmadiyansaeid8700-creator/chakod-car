# TODO — Chakod

## وضعیت جاری

Project: chakod-car
Working branch: backup-latest-2026-08-03
Current focus: Full Regression و تثبیت Chakod AI Manager در حالت Read-only

## انجام‌شده

### Legacy cleanup

- [x] حذف Assistant، ChatGPT starter، AI_HANDOFF قدیمی و Scaffoldهای بلااستفاده
- [x] حذف Backupهای داخل app و Assetهای Starter بلااستفاده
- [x] حذف Banner Reservation قدیمی مبتنی بر ChatGPT/email auth و `demo_paid`
- [x] حذف D1 schema/migration و helperهای یتیم همان رزرو آزمایشی
- [x] حذف `/account/ads` و تمام CTA/تب‌های رزرو بنر
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
- [x] رفع ناسازگاری Node strip-types در Provider و Tool Executor
- [x] اضافه‌شدن تست Tool Executor به Workflow
- [x] اجرای تست هدفمند Config + Provider + Tool Executor + Moderation در Node 22: 16/16 Pass

## اقدام‌های باز فوری

### Regression / Build

- [~] GitHub Actions PR #112 برای Full Regression در حال استفاده است
- [x] `npm ci` در Runner واقعی GitHub پاس شد
- [x] Run اول TypeScript سه import قدیمی `chatgpt-auth` را پیدا کرد؛ زنجیره Legacy مربوط حذف شد
- [ ] اجرای مجدد `npx tsc --noEmit -p tsconfig.launch.json`
- [ ] اجرای تست‌های core routes در CI
- [ ] اجرای تست‌های AI + moderation در CI
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

- [ ] بررسی 21 vulnerability گزارش‌شده توسط `npm ci`/audit در CI
- [ ] حذف dependencyهای بلااستفاده مثل Drizzle فقط بعد از بررسی package-lock و Build
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
