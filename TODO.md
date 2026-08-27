# TODO — Chakod

## وضعیت جاری

Project: chakod-car
Working branch: backup-latest-2026-08-03
Current focus: Regression کامل و تثبیت Chakod AI Manager در حالت Read-only

## انجام‌شده

### Legacy cleanup

- [x] حذف Assistant، ChatGPT starter، AI_HANDOFF قدیمی و Scaffoldهای بلااستفاده
- [x] حذف Backupهای داخل app و Assetهای Starter بلااستفاده
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
- [x] اجرای تست هدفمند Config + Provider + Tool Executor در Node 22: 11/11 Pass
- [~] Regression کامل Repository و Smoke UI هنوز باقی است

## اقدام‌های باز فوری

### Regression / Build

- [ ] اجرای `npx tsc --noEmit -p tsconfig.launch.json`
- [ ] اجرای تست‌های core routes
- [ ] اجرای `ai-moderation-policy.test.ts` کنار تست‌های جدید AI
- [ ] Smoke Test `/`, `/cars`, `/login`, `/admin`, `/admin/ai`
- [ ] رفع هر خطای پیدا شده قبل از فعال‌سازی Provider

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

### فاز Write آینده

- [ ] هیچ Write Tool قبل از طراحی Permission مستقل ساخته نشود
- [ ] Human Approval اجباری
- [ ] Audit مستقل برای هر اقدام
- [ ] امکان Cancel/Revert در صورت ماهیت اقدام

### Release

- [ ] npm audit کنترل‌شده
- [ ] Build واقعی Cloudflare
- [ ] بررسی دامنه‌ها و مسیرهای اصلی
- [ ] main فقط با تأیید صریح مالک تغییر کند

## قواعد ثابت

- Secret، Token، Password و داده واقعی کاربر وارد Git نشود.
- AI نباید هسته سایت را برای کارکرد عادی وابسته کند.
- نتیجه تست فقط بعد از اجرای واقعی موفق اعلام شود.
- Git تاریخچه است؛ Backup تاریخی داخل app نگهداری نشود.
