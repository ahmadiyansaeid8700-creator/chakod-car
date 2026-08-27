# TODO — Chakod

## وضعیت جاری
Project: chakod-car
Working branch: backup-latest-2026-08-03
Current focus: Cleanup-first و Full Regression

## انجام‌شده

### Legacy cleanup
- [x] حذف Assistant و ChatGPT starter قدیمی
- [x] حذف Backupهای داخل app و Assetهای Starter بلااستفاده
- [x] حذف Banner Reservation و `/account/ads`
- [x] حذف `AGENTS.md`، `CLAUDE.md` و `codex-preview`
- [x] حذف برنامه مستقل Affiliate/Ambassador و پنل‌های جدا
- [x] حفظ Referral واقعی: `/r/[code]` + انتقال کد دعوت به Commerce
- [x] حذف Homeهای یتیم و قدیمی
- [x] حفظ `HomeBannerSlot` و مدیریت فعلی بنر صفحه اصلی
- [x] تعیین ساختار canonical نمایشگاه: `/dealerships` عمومی، `/businesses/[slug]` پروفایل، `/account/business` مدیریت
- [x] حذف پیاده‌سازی سنگین legacy در `/dealers` و `/showrooms/[dealer]` و نگه‌داشتن Redirect سبک
- [x] حذف UI قدیمی `/dashboard` و تبدیل آن به Redirect به `/account`
- [x] انتقال implementation جزئیات خودرو به `/cars/[slug]` و تبدیل `/listing/[id]` به Redirect سازگار
- [x] حفظ ai-moderation مستقل

### Chakod AI Manager
- [x] Feature Flag و Provider contract
- [x] Mode `read_suggest` و ممنوعیت Auto-write
- [x] Provider Adapter، Read-only Tool Registry و Tool Executor
- [x] Sanitization برای Listings / Businesses / Commerce
- [x] بازطراحی `/admin` و ساخت `/admin/ai`
- [x] تست هدفمند قبلی: 16/16 Pass

## اقدام‌های باز فوری

### Cleanup audit
- [ ] بررسی `DealerQrCard` و فایل‌های نمایشگاهی یتیم پس از حذف پروفایل قدیمی
- [ ] بررسی CSSهای قدیمی Home پس از حذف کامپوننت‌های یتیم
- [ ] بررسی Assetهای قدیمی و حجیم فقط پس از اثبات بلااستفاده بودن
- [ ] بازنویسی `MASTER-SITEMAP-FA.md` مطابق محصول واقعی
- [ ] اصلاح متن اسناد: «دعوت کاربر و پورسانت» به‌جای Affiliate

### Regression / Build
- [~] GitHub Actions PR #112 برای Full Regression
- [x] `npm ci` در Run قبلی پاس شده
- [x] TypeScript Check در Run قبلی پاس شده
- [x] تست‌های Core Routes در Run قبلی پاس شده‌اند
- [ ] اجرای مجدد AI + moderation tests بعد از Cleanupهای جدید
- [ ] `npm run build`
- [ ] Smoke Test مسیرهای اصلی و Redirectهای legacy

### Referral / دعوت
- [x] حفظ `/r/[code]` برای ثبت انتساب دعوت
- [x] حفظ ارسال کد دعوت به Commerce برای خرید واجد شرایط
- [ ] بعداً نام‌های فنی legacy مثل `affiliate_code` فقط با migration امن به Referral تغییر کنند
- [ ] در صورت نیاز، نمایش ساده «دعوت‌های من / پورسانت من» داخل حساب فعلی ساخته شود؛ بدون عضویت جدا

### Backend / Hosting
- [ ] ساخت/بازیابی امن `chakod-private/secrets.php`
- [ ] تکمیل DB و Kavenegar secrets خارج از Git
- [ ] تست اتصال DB و OTP
- [ ] استقرار endpointهای لازم و Smoke ورود/پروفایل/آگهی/آپلود

### Release
- [ ] Build واقعی Cloudflare
- [ ] بررسی دامنه‌ها و مسیرهای اصلی
- [ ] main فقط با تأیید صریح مالک تغییر کند

## قواعد ثابت
- Secret، Token، Password و داده واقعی کاربر وارد Git نشود.
- AI نباید هسته سایت را برای کارکرد عادی وابسته کند.
- نتیجه تست فقط بعد از اجرای واقعی موفق اعلام شود.
- Git تاریخچه است؛ Backup تاریخی داخل app نگهداری نشود.
