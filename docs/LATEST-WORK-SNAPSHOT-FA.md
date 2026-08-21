# آخرین Snapshot قابل بازیابی پروژه چاکود

> این Snapshot تاریخی است. برای وضعیت عملیاتی جاری، شاخه واقعی استیجینگ، آخرین انتشار و نقطه ادامه دقیق، ابتدا `AI_HANDOFF.md` خوانده شود. آخرین راهنمای قطعی در 2026-08-21 به‌روزرسانی شده است.

تاریخ ثبت: 2026-08-07

این فایل مرجع ادامه پروژه در صورت از بین رفتن چت یا Context است. در چت جدید ابتدا همین فایل، سپس `docs/MASTER-SITEMAP-FA.md` و `docs/PROJECT-CHECKLIST-FA.md` خوانده شوند.

## مخزن و شاخه

```text
Repository: ahmadiyansaeid8700-creator/chakod-car
Base branch: backup-latest-2026-08-03
Working branch: agent/launch-3-local-baseline
Main: بدون تایید مالک تغییر یا Merge نشود
Backup checkpoint: backup/launch-3-progress-2026-08-07
```

## تصمیم قطعی مالک برای روش کار

- اول خود سایت کامل ساخته شود.
- صفحات به هم متصل شوند و دکمه های اصلی عملکرد واقعی داشته باشند.
- کیف پول، پرداخت، فاکتور، تبلیغات، اشتراک، مدیریت آگهی، کسب و کار و ادمین تکمیل شوند.
- تست جامع بعد از تکمیل ساخت انجام شود.
- `[~]` یعنی ساخته شده ولی هنوز تست نهایی نشده.
- `[x]` یعنی با شواهد واقعی تایید شده.
- `[!]` یعنی وابسته یا مسدود به سرویس خارجی.

## قرارداد قفل شده صفحه اول

- [x] استوری ها مستقیم زیر هدر
- [x] نمایشگاه های منتخب
- [x] خودروهای لوکس
- [x] خودروهای منطقه آزاد
- [x] خدمات خودرویی برتر
- [x] فروشگاه های قطعات برتر
- [x] تعمیرکاران برتر
- [x] تمام ریل های بالا در صفحه اول افقی هستند
- [x] نمایش همه به صفحه فهرست/Grid مربوط می رود
- [x] موقعیت پیش فرض سراسر ایران است و تغییر موقعیت باید محتوای صفحه اول را فیلتر کند
- [x] ساختار Responsive دسکتاپ/تبلت/موبایل قبلا بررسی شده
- [x] Hero قبل از استوری وجود ندارد

## تصمیم بسیار مهم جدید: بنر صفحه اول حذف شده است

این مورد قطعی است و نباید در ادامه دوباره برگردانده شود:

```text
[حذف قطعی از محصول] بنر نمایشگاه در صفحه اول
[محصول جایگزین] جایگاه نمایشگاه منتخب
[محل نمایش] همان ریل نمایشگاه های منتخب صفحه اول
```

### فرایند رزرو جایگاه نمایشگاه منتخب

مالک تایید کرده که ترتیب کار همان فرایند رزرو بنر قبلی باشد، اما خروجی آن نمایشگاه منتخب است:

```text
نمایشگاه
↓
انتخاب استان / محدوده
↓
انتخاب تاریخ شروع و پایان
↓
بررسی ظرفیت
↓
محاسبه مبلغ
↓
کد تخفیف
↓
ثبت سفارش
↓
Checkout واحد
↓
کیف پول یا درگاه بانکی
↓
Verify پرداخت
↓
در انتظار تایید مدیر
↓
تایید مدیر
↓
نمایش در ریل نمایشگاه های منتخب همان محدوده و بازه
```

- کارت نمایشگاه منتخب از لوگو، مشخصات واقعی نمایشگاه و خودروهای فعال همان نمایشگاه ساخته می شود.
- کاربر هیچ تصویر بنر موبایل/دسکتاپ آپلود نمی کند.
- UI قدیمی رزرو بنر حذف شده است.
- `/account/ads` فقط Redirect سازگاری به مسیر جدید است.
- سرویس های `home_banner_*` دیگر در UI محصولات تبلیغاتی نمایش داده نمی شوند.
- زیرساخت قدیمی قیمت/ظرفیت بنر فقط پشت صحنه و به صورت Legacy برای سازگاری با Commerce فعلی استفاده می شود تا API خارجی دوباره ساخته نشود.

### مسیرهای جدید نمایشگاه منتخب

- [~] `/account/business/promotions/featured`
- [~] `/api/finance/featured-showrooms`
- [~] `/api/featured-showrooms`
- [~] `/admin/featured-showrooms`
- [~] `/api/admin/featured-showrooms`
- [~] `/account/payments/checkout/order/[orderNo]`
- [~] مدل D1 با نام `featured_showroom_placements`

### رفتار ساخته شده

- [~] نمایشگاه و استان از Commerce واقعی حساب خوانده می شوند
- [~] تاریخ شروع/پایان انتخاب می شود
- [~] ظرفیت و نرخ استانی از تنظیمات موجود Commerce خوانده می شوند
- [~] کد تخفیف از همان Commerce بررسی می شود
- [~] سفارش canonical بک اند ساخته و در D1 آینه می شود
- [~] سفارش از قبل ساخته شده بدون ساخت سفارش دوم وارد Checkout می شود
- [~] Checkout سفارش موجود کیف پول و درگاه بانکی دارد
- [~] Verify بانکی جایگاه را به `pending_review` می برد
- [~] مدیر می تواند رزرو پرداخت شده را تایید، رد یا لغو کند
- [~] فقط وضعیت های تاییدشده و در بازه معتبر وارد API عمومی صفحه اول می شوند
- [~] `HomeFeaturedShowrooms` اکنون نمایشگاه ها را براساس جایگاه های تایید شده فیلتر می کند
- [~] ظاهر، ترتیب و Horizontal Rail صفحه اول تغییر نکرده است

## مدیریت آگهی

- [~] `/account/listings/[id]`
- [~] `/account/listings/[id]/edit`
- [~] `/account/listings/[id]/images`
- [~] `/account/listings/[id]/promote`
- [~] قرارداد واقعی قدیمی `POST /api/listing-manage.php` از تاریخچه پروژه بازیابی شد
- [~] Action های canonical: `mark_sold`, `disable_listing`, `reactivate_listing`, `delete_listing`
- [~] Route داخلی امن `/api/auth/listings/manage/[id]` این Action ها را Proxy می کند
- [~] فروخته شد
- [~] توقف موقت
- [~] بازیابی / بازفعال سازی
- [~] حذف / بایگانی
- [~] تمدید از Commerce با `listing_personal_renew` یا `listing_dealer_renew`
- [~] ویرایش مشخصات
- [~] مدیریت تصاویر، حذف و انتخاب Cover
- [~] ارتقای آگهی به Checkout

## مرکز مالی

- [~] `/account/wallet`
- [~] `/account/payments`
- [~] `/account/invoices`
- [~] `/account/promotions`
- [~] `/account/subscriptions`
- [~] `/account/payments/checkout`
- [~] `/account/payments/callback`
- [~] `/account/payments/wallet-retry`
- [~] Checkout سفارش از قبل ساخته شده
- [~] `/api/finance/order`

### مدل مالی D1

- [~] `wallets`
- [~] `wallet_transactions`
- [~] `commerce_orders`
- [~] `payment_attempts`
- [~] `invoices`
- [~] `payment_refunds`
- [~] `featured_showroom_placements`

### سفارش و پرداخت

- [~] Commerce اصلی پروژه مرجع تعرفه و سفارش خدمات است
- [~] مبلغ خدمات معمولی از مرورگر پذیرفته نمی شود
- [~] Idempotency برای جلوگیری از سفارش/پرداخت تکراری وجود دارد
- [~] درخواست درگاه به سفارش ذخیره شده قفل شده است
- [~] Callback و Verify سمت سرور ساخته شده
- [~] شارژ کیف پول فقط بعد از Verify موفق ثبت می شود
- [~] فاکتور بعد از پرداخت موفق صادر می شود
- [~] Finance Summary اطلاعات حساس داخلی را به مرورگر نمی دهد

## کیف پول

- [~] نمایش موجودی واقعی
- [~] افزایش موجودی از درگاه
- [~] پرداخت خدمات با کیف پول
- [~] رزرو مبلغ قبل از Settlement
- [~] جلوگیری از برداشت دوباره
- [~] Retry امن بعد از Refresh
- [~] آزاد شدن مبلغ در رد قطعی Commerce
- [~] Block ماندن مبلغ در Timeout مبهم
- [~] صفحه Retry پرداخت

### وابستگی کیف پول

- [!] سورس PHP `api.chakod.com` داخل این Repository نیست
- [!] Wallet Settlement واقعی باید در Backend اصلی وجود داشته باشد و با Environment معرفی شود

```text
CHAKOD_WALLET_SETTLEMENT_ENDPOINT
CHAKOD_WALLET_SETTLEMENT_ACTION
CHAKOD_WALLET_SETTLEMENT_SECRET
```

هیچ Secret واقعی در Git ذخیره نشده است.

## حساب کاربری

- [~] `/account`
- [~] `/dashboard`
- [~] `/account/profile`
- [~] `/account/notifications`
- [~] `/account/security`
- [~] `/logout`
- [~] `/auth/callback`
- [~] منوی حساب به آگهی، کسب و کار، مالی، نمایشگاه منتخب، اعلان و امنیت متصل است

## پنل کسب و کار

- [~] `/account/business`
- [~] `/account/business/new`
- [~] `/account/business/edit`
- [~] `/account/business/media`
- [~] `/account/business/portfolio`
- [~] `/account/business/hours`
- [~] `/account/business/branches`
- [~] `/account/business/team`
- [~] `/account/business/analytics`
- [~] `/account/business/promotions`
- [~] `/account/business/billing`
- [~] `/account/business/promotions/featured`

قابلیت های DealerCommandCenter موجود دوباره ساخته نشده اند؛ مسیرها به همان قابلیت های موجود متصل شده اند.

## مدیریت مالی ادمین

- [~] `/admin/orders`
- [~] `/admin/payments`
- [~] `/admin/invoices`
- [~] `/admin/refunds`
- [~] `/admin/subscriptions`
- [~] `/admin/pricing`
- [~] `/admin/featured-showrooms`
- [~] Commerce canonical ادمین حفظ شده است
- [~] صفحه Commerce به مدیریت نمایشگاه های منتخب لینک دارد

## صفحات قانونی، پشتیبانی و SEO

- [~] `/terms`
- [~] `/refund-policy`
- [~] `/legal`
- [~] `/support`
- [~] `/help` به `/support` منتقل شده
- [~] sitemap index و sitemap های static/cars/businesses/dealerships/articles
- [~] robots.txt
- [~] account/admin/api از index خارج شده اند

## Redirect های قدیمی

- [~] `/dealer` و `/dealers` → `/dealerships`
- [~] `/my-listings` → `/account/listings`
- [~] `/workshops` → `/businesses` فیلترشده
- [~] `/car-services` → `/businesses` فیلترشده
- [~] `/parts-stores` → `/businesses` فیلترشده
- [~] `/account/ads` → `/account/business/promotions/featured`
- [x] `/listing/[id]` قبلا به مسیر canonical خودرو Redirect می شود
- [x] 404 استاندارد وجود دارد

## شبکه و محیط محلی

- [x] DNS قبلی Wi-Fi دامنه `api.chakod.com` را اشتباه به `10.10.34.35` Resolve می کرد
- [x] DNS ویندوز موقتا روی `1.1.1.1` و `1.0.0.1` تنظیم شد
- [x] Resolve جدید به `172.67.204.1` و `104.21.77.33` رسید
- [ ] تست نهایی TCP/API بعدا در مرحله تست جامع

## Build و زیرساخت

- [x] `npm ci` قبلا موفق شده
- [x] Vite محلی قبلا اجرا شده
- [x] TypeScript محدوده Launch در مرحله قبلی بدون خطا اجرا شده
- [!] Production Cloudflare Build هنوز به `.openai/hosting.json` و `build/sites-vite-plugin` محیط Hosting وابسته است
- [!] 18 آسیب پذیری npm قبلا ثبت شده: 1 low, 4 moderate, 13 high
- [ ] `npm audit fix --force` کورکورانه اجرا نشود

## کارهای مهم باقی مانده قبل از تست جامع

ترتیب ادامه فعلی:

1. [ ] تکمیل همگام سازی پرداخت کیف پول نمایشگاه منتخب با وضعیت `pending_review` در همان لحظه Settlement
2. [ ] عملیات واقعی Refund توسط مدیر مالی
3. [ ] ساخت Support Request واقعی و رفع مسیر/اطلاعات تماس نمونه
4. [ ] ممیزی دکمه ها و لینک های عمومی برای حذف بن بست ها
5. [ ] تکمیل عملیات ناقص تیم/کسب و کار در صورت وجود
6. [ ] تولید Migration استاندارد Drizzle برای جداول مالی و `featured_showroom_placements`
7. [ ] تکمیل Wallet Settlement در Backend اصلی
8. [ ] سپس Pull روی لپ تاپ، TypeScript، Build، تست جامع، رفع خطا و Launch

## قانون بازیابی Context

در چت جدید:

1. این فایل خوانده شود.
2. Branch همان `agent/launch-3-local-baseline` باشد مگر مالک صریحا تغییر دهد.
3. `main` دست نخورد.
4. ساختار صفحه اول قفل است.
5. بنر نمایشگاه صفحه اول دیگر وجود ندارد و نباید برگردد.
6. محصول جایگزین «جایگاه نمایشگاه منتخب» با فرایند رزرو استان/تاریخ/ظرفیت/پرداخت/تایید است.
7. اول ساخت محصول ادامه پیدا کند و تست جامع در پایان انجام شود.
