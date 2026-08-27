# TODO — Chakod

## وضعیت جاری

Project: chakod-car
Working branch: backup-latest-2026-08-03
Current focus: Cleanup-first و Full Regression بدون احیای قابلیت‌های قدیمی

## انجام‌شده

### Legacy cleanup

- [x] حذف Assistant، ChatGPT starter، AI_HANDOFF قدیمی و Scaffoldهای بلااستفاده
- [x] حذف Backupهای داخل app و Assetهای Starter بلااستفاده
- [x] حذف Banner Reservation قدیمی و `/account/ads`
- [x] حذف `pending_banners` از Snapshot هوش مصنوعی
- [x] حذف `AGENTS.md` و `CLAUDE.md` قدیمی
- [x] حذف متادیتای آزمایشی `codex-preview`
- [x] حذف برنامه مستقل Affiliate و Ambassador شامل UI، عضویت جدا، KYC جدا و پنل‌های اختصاصی
- [x] حذف Workflow، Checklist و tsconfig تاریخی Launch-2 Affiliate
- [x] حفظ هسته Referral: `/r/[code]` + انتقال کد دعوت به Commerce برای پورسانت خرید واجد شرایط
- [x] حفظ ai-moderation مستقل

### Chakod AI Manager

- [x] Feature Flag و Provider contract
- [x] Mode `read_suggest`
- [x] ممنوعیت Auto-write
- [x] Provider Adapter برای OpenAI و Local با Timeout و fail-closed
- [x] Read-only Tool Registry و Tool Executor
- [x] Sanitization برای Listings / Businesses / Commerce
- [x] Tool API و Suggestion API
- [x] بازطراحی `/admin` و ساخت `/admin/ai`
- [x] اجرای تست هدفمند Config + Provider + Tool Executor + Moderation در Node 22: 16/16 Pass در اجرای قبلی

## اقدام‌های باز فوری

### Cleanup audit

- [~] بررسی کامپوننت‌های Home که دیگر import نمی‌شوند
- [ ] یکسان‌سازی مسیرهای موازی `/showrooms`، `/dealerships` و `/dealers` پس از تعیین مسیر canonical
- [ ] حذف assetهای تکراری فقط پس از اثبات بلااستفاده‌بودن مسیر فایل
- [ ] بازنویسی `MASTER-SITEMAP-FA.md` مطابق محصول واقعی؛ سند فعلی هنوز رزرو بنر و همکاری در فروش را فهرست می‌کند
- [ ] بازنویسی بخش دعوت در اسناد با واژه «دعوت کاربر و پورسانت» به‌جای Affiliate

### Regression / Build

- [~] GitHub Actions PR #112 برای Full Regression در حال استفاده است
- [x] `npm ci` در Runner واقعی GitHub پاس شد
- [x] TypeScript Check در Runner واقعی پاس شد
- [x] 14 تست Core Routes در Runner واقعی پاس شد
- [!] تست Tool Executor در اجرای مستقیم Node به‌دلیل import زنجیره‌ای `next/server` متوقف شد؛ boundary باید اصلاح شود
- [ ] اجرای مجدد تست‌های AI + moderation در CI بعد از اصلاح import boundary
- [ ] اجرای `npm run build`
- [ ] Smoke Test `/`, `/cars`, `/login`, `/admin`, `/admin/ai`
- [ ] Smoke امنیتی APIهای AI بدون Session

### Referral / دعوت

- [x] حفظ `/r/[code]` برای ثبت انتساب دعوت
- [x] حفظ ارسال کد دعوت از Commerce برای خرید واجد شرایط
- [ ] بعد از تثبیت Backend، نام‌گذاری فنی legacy مثل `affiliate_code` و `chakod_affiliate_ref` به Referral مهاجرت داده شود بدون شکستن داده‌های موجود
- [ ] در صورت نیاز محصول، نمایش ساده «دعوت‌های من / پورسانت من» داخل حساب فعلی ساخته شود؛ بدون عضویت یا KYC مستقل Affiliate

### Backend / Hosting

- [ ] ساخت یا بازیابی امن `chakod-private/secrets.php`
- [ ] تکمیل DB و Kavenegar secrets خارج از Git
- [ ] تست اتصال دیتابیس
- [ ] تست OTP
- [ ] استقرار PHP endpointهای موردنیاز
- [ ] Smoke Test ورود، پروفایل، آگهی و آپلود

### AI Manager — قبل از فعال‌سازی

- [ ] بررسی واقعی پاسخ APIهای Read-only روی هاست
- [ ] تست Safe Off وقتی Provider غیرفعال است
- [ ] تست Suggestion endpoint با Provider معتبر
- [ ] ثبت Audit event برای درخواست‌های AI بدون ذخیره Prompt حساس یا Token

### Dependency audit

- [ ] بررسی vulnerabilityهای گزارش‌شده توسط `npm ci`
- [ ] ممنوعیت `npm audit fix --force` بدون بررسی دستی

### Release

- [ ] Build واقعی Cloudflare
- [ ] بررسی دامنه‌ها و مسیرهای اصلی
- [ ] main فقط با تأیید صریح مالک تغییر کند

## قواعد ثابت

- Secret، Token، Password و داده واقعی کاربر وارد Git نشود.
- AI نباید هسته سایت را برای کارکرد عادی وابسته کند.
- نتیجه تست فقط بعد از اجرای واقعی موفق اعلام شود.
- Git تاریخچه است؛ Backup تاریخی داخل app نگهداری نشود.
