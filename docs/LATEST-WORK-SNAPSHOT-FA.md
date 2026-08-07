# آخرین Snapshot قابل بازیابی پروژه چاکود

تاریخ ثبت: 2026-08-07

این فایل برای ادامه پروژه در صورت از بین رفتن چت یا Context ساخته شده است. مبنای ادامه کار، همین فایل به همراه `docs/MASTER-SITEMAP-FA.md` و `docs/PROJECT-CHECKLIST-FA.md` است.

## مخزن و شاخه

```text
Repository: ahmadiyansaeid8700-creator/chakod-car
Base branch: backup-latest-2026-08-03
Working branch: agent/launch-3-local-baseline
Main: نباید بدون تایید مالک تغییر یا Merge شود
Latest code commit before this snapshot: ed3d76ce41ee7c543ce15493e7323285db8eb9e1
```

## تصمیم قطعی فعلی مالک

- اول خود سایت کامل ساخته شود.
- صفحات به هم متصل شوند.
- تمام دکمه های اصلی عملکرد واقعی داشته باشند.
- کیف پول، سفارش، پرداخت، فاکتور، تبلیغات، اشتراک، پنل کسب و کار و مدیریت تکمیل شوند.
- تست جامع بعد از تکمیل ساخت انجام شود.
- موارد ساخته شده ولی تست نشده با `[~]` ثبت شوند.
- موارد تاییدشده واقعی با `[x]` ثبت شوند.
- موارد وابسته به سرویس خارجی با `[!]` ثبت شوند.

## قرارداد قفل شده صفحه اصلی

- [x] استوری ها مستقیم زیر هدر
- [x] نمایشگاه های منتخب همراه خودروهای فعال
- [x] خودروهای لوکس
- [x] خودروهای منطقه آزاد
- [x] خدمات خودرویی برتر
- [x] فروشگاه های قطعات برتر
- [x] تعمیرکاران برتر
- [x] تمام این بخش ها در صفحه اصلی Horizontal Rail هستند
- [x] نمایش همه به صفحه فهرست/Grid مربوط می رود
- [x] Location پیش فرض سراسر ایران است و انتخاب محل باید تمام محتوای صفحه اصلی را فیلتر کند
- [x] Responsive دسکتاپ، تبلت و موبایل از نظر ساختار بررسی شده است

## بخش های ساخته شده در Launch-3

### حساب و ناوبری

- [~] `/account`
- [~] `/dashboard`
- [~] `/account/profile`
- [~] `/account/notifications`
- [~] `/account/security`
- [~] `/logout`
- [~] `/auth/callback`
- [~] منوی مشترک حساب به آگهی، کسب و کار، کیف پول، پرداخت، فاکتور، تبلیغات، اشتراک، اعلان، امنیت و پیگیری پرداخت متصل شده است

### مدیریت آگهی

- [~] `/account/listings/[id]`
- [~] `/account/listings/[id]/edit`
- [~] `/account/listings/[id]/images`
- [~] `/account/listings/[id]/promote`
- [~] بررسی مالکیت آگهی سمت سرور
- [~] ویرایش مشخصات
- [~] آپلود تصویر
- [~] حذف تصویر
- [~] انتخاب تصویر اصلی
- [~] ارتقای آگهی با شناسه آگهی

### مرکز مالی

- [~] `/account/wallet`
- [~] `/account/payments`
- [~] `/account/invoices`
- [~] `/account/promotions`
- [~] `/account/subscriptions`
- [~] `/account/payments/checkout`
- [~] `/account/payments/callback`
- [~] `/account/payments/wallet-retry`

### مدل مالی D1

در `db/schema.ts` اضافه شده:

- [~] `wallets`
- [~] `wallet_transactions`
- [~] `commerce_orders`
- [~] `payment_attempts`
- [~] `invoices`
- [~] `payment_refunds`

### سفارش و پرداخت

- [~] Commerce اصلی پروژه مرجع تعرفه و سفارش باقی مانده است
- [~] مبلغ خدمات از Commerce خوانده می شود و از مرورگر قابل تعیین نیست
- [~] `idempotency` برای جلوگیری از سفارش/پرداخت تکراری وجود دارد
- [~] درخواست درگاه به سفارش ذخیره شده قفل است
- [~] Callback و Verify سمت سرور ساخته شده
- [~] شارژ کیف پول فقط بعد از Verify موفق درگاه ثبت می شود
- [~] فاکتور پس از پرداخت موفق صادر می شود
- [~] Finance Summary فقط DTO عمومی می فرستد و `ownerKey` و `idempotencyKey` داخلی به مرورگر داده نمی شوند

### پرداخت با کیف پول

- [~] کاربر در Checkout می تواند روش کیف پول یا درگاه را انتخاب کند
- [~] موجودی واقعی کیف پول در Checkout نمایش داده می شود
- [~] کمبود موجودی شناسایی می شود و مسیر شارژ کیف پول ارائه می شود
- [~] قبل از Settlement مبلغ از موجودی آزاد به موجودی مسدود منتقل می شود
- [~] چند کلیک یا Refresh باعث برداشت دوباره نمی شود
- [~] اگر Commerce پاسخ قطعی رد بدهد مبلغ آزاد می شود
- [~] اگر Timeout یا نتیجه مبهم باشد مبلغ فقط Block می ماند و دوباره برداشت نمی شود
- [~] صفحه Retry برای ادامه Settlement ساخته شده است
- [~] بعد از Settlement موفق، سفارش Paid، تراکنش Completed و فاکتور صادر می شود

### وابستگی خارجی کیف پول

- [!] سورس PHP `api.chakod.com` داخل این Repository نیست
- [!] قرارداد واقعی Wallet Settlement باید در Backend اصلی موجود/ایجاد و در Environment معرفی شود
- [!] تا زمان تنظیم Settlement، برداشت کیف پول نباید شروع شود

Environment های طراحی شده برای این اتصال و بدون Secret در Git:

```text
CHAKOD_WALLET_SETTLEMENT_ENDPOINT
CHAKOD_WALLET_SETTLEMENT_ACTION
CHAKOD_WALLET_SETTLEMENT_SECRET
```

### پنل کسب و کار

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

قابلیت های موجود DealerCommandCenter دوباره ساخته نشده اند و به مسیرهای نقشه مادر متصل شده اند.

### مدیریت مالی ادمین

- [~] `/admin/orders`
- [~] `/admin/payments`
- [~] `/admin/invoices`
- [~] `/admin/refunds`
- [~] `/admin/subscriptions`
- [~] `/admin/pricing`
- [~] Commerce canonical ادمین حفظ شده و گزارش D1 مکمل آن است

### صفحات قانونی و پشتیبانی

- [~] `/terms`
- [~] `/refund-policy`
- [~] `/legal`
- [~] `/support`
- [~] `/help` به `/support` منتقل شده
- [~] فوتر به مسیرهای واقعی متصل شده است

### SEO

- [~] `/sitemap.xml`
- [~] `/sitemaps/static.xml`
- [~] `/sitemaps/cars.xml`
- [~] `/sitemaps/businesses.xml`
- [~] `/sitemaps/dealerships.xml`
- [~] `/sitemaps/articles.xml`
- [~] `/robots.txt`
- [~] مسیرهای account/admin/api از Index خارج شده اند

### Redirect های مسیرهای قدیمی

- [~] `/dealer` و `/dealers` به `/dealerships`
- [~] `/my-listings` به `/account/listings`
- [~] `/workshops` به فهرست کسب و کار فیلترشده
- [~] `/car-services` به فهرست کسب و کار فیلترشده
- [~] `/parts-stores` به فهرست کسب و کار فیلترشده
- [x] `/listing/[id]` قبلا به مسیر canonical خودرو Redirect می شود
- [x] صفحه 404 استاندارد وجود دارد

## وضعیت شبکه و API در لپ تاپ

- [x] DNS قبلی Wi-Fi از Router `192.168.1.1` دامنه `api.chakod.com` را اشتباه به `10.10.34.35` Resolve می کرد
- [x] DNS ویندوز موقتا روی `1.1.1.1` و `1.0.0.1` تنظیم شد
- [x] Resolve جدید `api.chakod.com` به `172.67.204.1` و `104.21.77.33` رسید
- [ ] تست نهایی TCP 443 و API بعد از DNS هنوز باید در مرحله تست جامع بسته شود

## Build و زیرساخت

- [x] `npm ci` قبلا موفق شده
- [x] Vite محلی قبلا اجرا شده
- [x] TypeScript محدوده Launch قبلا بدون خطا اجرا شده
- [!] Production Cloudflare Build هنوز به `.openai/hosting.json` و `build/sites-vite-plugin` محیط Hosting وابسته است
- [!] 18 آسیب پذیری npm قبلا ثبت شده: 1 low, 4 moderate, 13 high
- [ ] `npm audit fix --force` نباید کورکورانه اجرا شود

## موارد مهم باقی مانده برای ساخت قبل از تست جامع

اولویت ادامه:

1. [ ] چرخه کامل مدیریت آگهی: فروخته شد، حذف، بایگانی، تمدید، بازگردانی و منقضی
2. [ ] اتصال رزرو بنر موجود به Checkout/فاکتور واحد
3. [ ] عملیات واقعی Refund توسط مدیر مالی
4. [ ] تکمیل Support Request واقعی و حذف اطلاعات نمونه
5. [ ] بررسی همه دکمه های عمومی و حساب برای حذف بن بست ها
6. [ ] تکمیل جریان های کسب و کار/نمایشگاه در صورت باقی ماندن عملیات ناقص
7. [ ] تولید Migration استاندارد Drizzle برای جداول مالی
8. [ ] تکمیل قرارداد Wallet Settlement در Backend اصلی
9. [ ] سپس Pull روی لپ تاپ، TypeScript، Build، تست جامع، رفع خطا و Launch

## قانون ادامه پس از بازیابی Context

اگر این پروژه در چت جدید ادامه داده شد:

1. ابتدا این فایل خوانده شود.
2. سپس `docs/MASTER-SITEMAP-FA.md` و `docs/PROJECT-CHECKLIST-FA.md` خوانده شوند.
3. Branch کاری همان `agent/launch-3-local-baseline` باشد مگر مالک صریحا تغییر دهد.
4. هیچ کاری روی `main` انجام نشود.
5. صفحه اصلی از نظر ساختار قفل است و بدون اجازه مالک تغییر نکند.
6. اول ساخت محصول ادامه پیدا کند؛ تست جامع در پایان انجام شود.
7. هیچ Secret واقعی داخل Git قرار نگیرد.

## نقطه ادامه فوری

```text
NEXT BUILD PHASE:
Listing lifecycle completion

Routes / features:
- mark listing as sold
- archive listing
- delete listing
- renew expired listing
- restore archived listing
- status transitions and UI actions
```
