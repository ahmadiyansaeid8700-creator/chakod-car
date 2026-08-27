# TODO — Chakod

## وضعیت جاری
Project: chakod-car
Working branch: backup-latest-2026-08-03
Current focus: Cleanup-first و Full Regression

## انجام‌شده
- [x] حذف Assistant/Starter/Backup/Assetهای legacy اثبات‌شده
- [x] حذف Banner Reservation و `/account/ads`
- [x] حذف برنامه مستقل Affiliate/Ambassador و حفظ Referral واقعی
- [x] canonical نمایشگاه: `/dealerships` عمومی، `/businesses/[slug]` پروفایل، `/account/business` مدیریت
- [x] تبدیل `/dealers` و `/showrooms/[dealer]` به Redirect سبک
- [x] تبدیل `/dashboard` به Redirect به `/account`
- [x] انتقال implementation جزئیات خودرو به `/cars/[slug]` و تبدیل `/listing/[id]` به Redirect
- [x] پاک‌سازی Workflow از excludeها و مسیرهای Affiliate قدیمی
- [x] افزودن Smoke برای `/dealerships` و Redirectهای legacy اصلی
- [x] جداسازی helperهای API خالص از `next/server` برای تست مستقیم AI Tool Executor
- [x] حفظ ai-moderation و Chakod AI Manager read-only

## اقدام‌های باز فوری

### Regression / Build
- [ ] اجرای مجدد PR #112 بعد از آخرین Cleanup
- [ ] `npm ci`
- [ ] TypeScript Check
- [ ] AI + moderation tests
- [ ] `npm run build`
- [ ] Smoke مسیرهای اصلی و Redirectهای legacy

### Cleanup / Docs
- [ ] بازنویسی `MASTER-SITEMAP-FA.md` مطابق محصول واقعی
- [ ] حذف عبارت‌های Affiliate/Banner Reservation از سایر اسناد قدیمی
- [ ] بررسی Assetهای تکراری باقی‌مانده فقط با اثبات عدم مصرف

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
- [ ] Build واقعی Cloudflare
- [ ] بررسی دامنه‌ها و مسیرهای اصلی
- [ ] main فقط با تأیید صریح مالک تغییر کند

## قواعد ثابت
- Secret، Token، Password و داده واقعی کاربر وارد Git نشود.
- AI نباید هسته سایت را برای کارکرد عادی وابسته کند.
- نتیجه تست فقط بعد از اجرای واقعی موفق اعلام شود.
- Git تاریخچه است؛ Backup تاریخی داخل app نگهداری نشود.
