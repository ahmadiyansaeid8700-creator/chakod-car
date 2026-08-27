# TODO — Chakod

## وضعیت جاری
Project: chakod-car
Working branch: backup-latest-2026-08-03
Current focus: Backend/API/Auth recovery + بررسی جداگانه Vinext migration

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
- [x] Merge PR #112 به `backup-latest-2026-08-03`
- [x] افزودن گزارش دائمی `npm audit` به Regression CI
- [x] بررسی حذف `qrcode` با lockfile واقعی؛ حذف رد شد چون `BusinessCardActions` و `ListingCardActions` به آن وابسته‌اند
- [x] ساخت Branch مستقل `security/dependency-hardening-2026-08-27`
- [x] ارتقای `@cloudflare/vite-plugin` به 1.54.1
- [x] ارتقای `next` به 16.3.3
- [x] ارتقای `react` و `react-dom` و `react-server-dom-webpack` به 19.2.8
- [x] ارتقای `vite` به 8.2.2
- [x] ارتقای `wrangler` به 4.127.0
- [x] اجرای `npm audit fix` بدون `--force` و بررسی diff
- [x] Full Regression امنیتی: npm ci، TypeScript، 14/14 route tests، 16/16 AI/moderation، Lint، Build و Smoke همگی Pass
- [x] کاهش Audit از 18 vulnerability به 2 High
- [x] Merge PR #113 به `backup-latest-2026-08-03` در commit `0dfdf3cee693dd8a1875ef8e8e0adcff46a7a188`

## اقدام‌های باز فوری

### Backend / Hosting
- [ ] ساخت/بازیابی امن `chakod-private/secrets.php`
- [ ] تکمیل DB و Kavenegar secrets خارج از Git
- [ ] تست اتصال DB و OTP
- [ ] بازیابی/استقرار endpointهای PHP لازم در `api.chakod.com/api/`
- [ ] Smoke ورود، Session، `/api/auth/me`، پروفایل، آگهی و Upload

### Dependency / Security — باقی‌مانده
- [ ] بررسی جداگانه migration `vinext` 0.0.50 → 1.0.0-beta.8 در Branch مستقل
- [ ] Full Regression کامل قبل و بعد از Vinext migration
- [ ] Merge فقط اگر Build/Smoke و رفتار runtime بدون regression باشد
- [ ] دو High فعلی مربوط به `vinext` / `image-size` هستند؛ هیچ `npm audit fix --force` کور اجرا نشود

### Referral / دعوت
- [x] حفظ `/r/[code]` برای ثبت انتساب دعوت
- [x] حفظ ارسال کد دعوت به Commerce برای خرید واجد شرایط
- [ ] تغییر نام فنی `affiliate_code` فقط با migration امن در آینده
- [ ] در صورت نیاز، UI ساده «دعوت‌های من / پورسانت من» داخل حساب فعلی؛ بدون عضویت جدا

### Release / Staging
- [ ] Build واقعی Cloudflare
- [ ] Staging smoke روی دامنه واقعی
- [ ] بررسی دامنه‌ها و مسیرهای اصلی
- [ ] main فقط با تأیید صریح مالک تغییر کند

## قواعد ثابت
- Secret، Token، Password و داده واقعی کاربر وارد Git نشود.
- AI نباید هسته سایت را برای کارکرد عادی وابسته کند.
- نتیجه تست فقط بعد از اجرای واقعی موفق اعلام شود.
- `npm audit fix --force` بدون بررسی ممنوع است.
- Git تاریخچه است؛ Backup تاریخی داخل app نگهداری نشود.
