# TODO — Chakod

## وضعیت جاری
Project: chakod-car
Working branch: backup-latest-2026-08-03
Current focus: Dependency/Security hardening بعد از پایان Cleanup

## انجام‌شده
- [x] حذف Assistant/Starter/Backup/Assetهای legacy اثبات‌شده
- [x] حذف OpenAI Sites / Codex scaffold و وابستگی‌های `.openai` / `.sites-runtime`
- [x] حذف Banner Reservation و `/account/ads`
- [x] حذف برنامه مستقل Affiliate/Ambassador و حفظ Referral واقعی
- [x] canonical نمایشگاه: `/dealerships` عمومی، `/businesses/[slug]` پروفایل، `/account/business` مدیریت
- [x] تبدیل `/dealers` و `/showrooms/[dealer]` به Redirect سبک
- [x] تبدیل `/dashboard` به Redirect به `/account`
- [x] انتقال implementation جزئیات خودرو به `/cars/[slug]` و تبدیل `/listing/[id]` به Redirect
- [x] انتقال implementation بازار از `/ads` به `/cars/_catalog` و حفظ `/ads*` فقط به‌صورت Redirect
- [x] پاک‌سازی Workflow و افزودن Smoke مسیرهای canonical/legacy
- [x] جداسازی helperهای API خالص از `next/server` برای تست مستقیم AI Tool Executor
- [x] حفظ ai-moderation و Chakod AI Manager read-only
- [x] بازنویسی اسناد اصلی مطابق محصول فعلی
- [x] Full Regression نهایی روی PR #112: npm ci، TypeScript، 14/14 route tests، 16/16 AI/moderation، Lint، Build و Smoke همگی Pass
- [x] Merge PR #112 به `backup-latest-2026-08-03` در commit `2d1de98d64a7c10a603bef45ea5bd81586f72ec2`
- [x] افزودن گزارش دائمی `npm audit` به Regression CI
- [x] بررسی حذف `qrcode` با lockfile واقعی؛ حذف رد شد چون `BusinessCardActions` و `ListingCardActions` به آن وابسته‌اند

## اقدام‌های باز فوری

### Dependency / Security hardening
- [ ] ساخت Branch مستقل برای hardening dependencyها
- [ ] تست ارتقای `@cloudflare/vite-plugin` از 1.37.1 به نسخه امن پیشنهادی 1.54.1
- [ ] تست ارتقای `next` از 16.2.6 به 16.3.3
- [ ] تست ارتقای `react-server-dom-webpack` از 19.2.6 به 19.2.8
- [ ] تست ارتقای `vite` از 8.0.13 به 8.2.2
- [ ] ارتقای امن `wrangler` خارج از بازه آسیب‌پذیر `<=4.113.0`
- [ ] اجرای `npm audit fix` فقط بدون `--force` و فقط در Branch امنیتی، سپس بررسی diff
- [ ] Full Regression بعد از updateهای non-major
- [ ] بررسی جداگانه migration `vinext` 0.0.50 → 1.0.0-beta.8؛ بدون ادغام با پچ non-major
- [ ] هدف: کاهش 18 vulnerability فعلی بدون breaking update کور

### Referral / دعوت
- [x] حفظ `/r/[code]` برای ثبت انتساب دعوت
- [x] حفظ ارسال کد دعوت به Commerce برای خرید واجد شرایط
- [ ] تغییر نام فنی `affiliate_code` فقط با migration امن در آینده
- [ ] در صورت نیاز، UI ساده «دعوت‌های من / پورسانت من» داخل حساب فعلی؛ بدون عضویت جدا

### Backend / Hosting
- [ ] ساخت/بازیابی امن `chakod-private/secrets.php`
- [ ] تکمیل DB و Kavenegar secrets خارج از Git
- [ ] تست اتصال DB و OTP
- [ ] استقرار endpointهای لازم و Smoke ورود/پروفایل/آگهی/آپلود

### Release
- [ ] Build واقعی Cloudflare پس از Dependency hardening
- [ ] بررسی دامنه‌ها و مسیرهای اصلی
- [ ] main فقط با تأیید صریح مالک تغییر کند

## قواعد ثابت
- Secret، Token، Password و داده واقعی کاربر وارد Git نشود.
- AI نباید هسته سایت را برای کارکرد عادی وابسته کند.
- نتیجه تست فقط بعد از اجرای واقعی موفق اعلام شود.
- `npm audit fix --force` بدون بررسی ممنوع است.
- Git تاریخچه است؛ Backup تاریخی داخل app نگهداری نشود.
