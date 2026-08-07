# Checkpoint ساخت سایت چاکود — 2026-08-07 B

این فایل آخرین مرجع بازیابی ساخت سایت در صورت قطع چت است.

## مخزن

```text
Repository: ahmadiyansaeid8700-creator/chakod-car
Working branch: agent/launch-3-local-baseline
Base: backup-latest-2026-08-03
Main: بدون تایید مالک تغییر نکند
```

## روش کار قطعی

- ابتدا خود سایت کامل ساخته و صفحات/دکمه ها به هم متصل شوند.
- سپس Pull محلی، TypeScript/Build و تست جامع انجام شود.
- موارد ساخته شده ولی تست نشده `[~]` هستند.
- صفحه اصلی از نظر ترتیب و Responsive قفل است.

## صفحه اول قفل شده

```text
Stories
Featured Showrooms
Luxury Cars
Free-zone Cars
Top Car Services
Top Parts Stores
Top Repair Shops
```

تمام Railها افقی هستند و `نمایش همه` به صفحه Grid مربوط می رود.

### تصمیم قطعی نمایشگاه منتخب

- بنر نمایشگاهی صفحه اول حذف شده و نباید برگردد.
- محصول پولی جایگزین: `جایگاه نمایشگاه منتخب`.
- فرایند: نمایشگاه → استان → تاریخ → ظرفیت → مبلغ → تخفیف → سفارش → Checkout → کیف پول/درگاه → Verify → تایید مدیر → نمایش در Rail منتخب.
- کارت از داده واقعی نمایشگاه و خودروهای فعال همان نمایشگاه ساخته می شود؛ آپلود بنر وجود ندارد.

## ساخته شده در Launch-3

### مدیریت آگهی

- [~] مدیریت، ویرایش، تصاویر و ارتقا
- [~] فروخته شد (`mark_sold`)
- [~] توقف موقت (`disable_listing`)
- [~] بازیابی/بازفعال سازی (`reactivate_listing`)
- [~] حذف/بایگانی (`delete_listing`)
- [~] تمدید از Commerce
- [~] CSS چرخه آگهی به ماژول واقعی صفحه متصل شده است

### مرکز مالی

- [~] کیف پول
- [~] سفارش امن و idempotency
- [~] پرداخت بانکی
- [~] Callback/Verify
- [~] فاکتور و صفحه جزئیات/چاپ
- [~] Checkout سفارش از قبل ساخته شده
- [~] Retry امن پرداخت کیف پول
- [~] فهرست فاکتورها به جزئیات و چاپ متصل شده
- [~] قیمت های ثابت تبلیغات/اشتراک از FinanceCenter حذف شده اند
- [~] FinanceCenter فقط به جریان canonical Commerce و محصولات واقعی متصل است
- [!] Wallet Settlement نیازمند Backend خارجی و Environment است

### نمایشگاه منتخب

- [~] `featured_showroom_placements`
- [~] `/account/business/promotions/featured`
- [~] `/api/finance/featured-showrooms`
- [~] `/api/featured-showrooms`
- [~] `/admin/featured-showrooms`
- [~] `/api/admin/featured-showrooms`
- [~] `/account/ads` فقط Redirect قدیمی است
- [~] HomeFeaturedShowrooms فقط جایگاه تاییدشده/فعال را وارد Rail می کند
- [~] Verify بانکی و Finance Summary رزرو پرداخت شده را وارد `pending_review` می کنند

### بازپرداخت

- [~] `/account/refunds`
- [~] `/api/finance/refunds`
- [~] `/admin/refunds`
- [~] `/api/admin/refunds/manage`
- [~] بازپرداخت کامل یا جزئی
- [~] سقف بازپرداخت از مبلغ واقعی پرداخت بیشتر نمی شود
- [~] بازپرداخت کیف پول با قفل ضد دوباره واریز
- [~] بازپرداخت بانکی از Adapter سروری
- [!] Gateway refund نیازمند `CHAKOD_REFUND_ENDPOINT/ACTION/SECRET`

### پشتیبانی واقعی

- [~] `support_tickets`, `support_replies`
- [~] `/support` فرم تیکت واقعی + FAQ + تاریخچه حساب
- [~] مهمان می تواند برای مشکل ورود تیکت بسازد
- [~] لینک مهمان توکن تصادفی دارد و فقط SHA-256 آن در DB ذخیره می شود
- [~] `/support/tickets/[ticketNo]` گفت و گوی کاربر/پشتیبانی
- [~] `/api/support/requests`
- [~] `/api/support/requests/[ticketNo]`
- [~] `/admin/support`
- [~] `/api/admin/support/requests`
- [~] ادمین پاسخ، اولویت، وضعیت، بستن و بازکردن تیکت دارد
- [~] `/contact` به `/support#request` متصل شده و دیگر بن بست نیست

### صفحات عمومی/سازمانی

- [~] `/about`
- [~] `/privacy`
- [~] `/terms`
- [~] `/refund-policy`
- [~] `/legal`
- [~] `/support`
- [~] Footer به مسیر canonical راهنمای قیمت `/cars/price-guide` وصل شده

### تبلیغات عمومی

- [~] `/advertising`
- [~] `/advertising/stories`
- [~] `/advertising/business-placement`
- [~] `/advertising/dealership-placement`
- [~] هیچ صفحه تبلیغاتی بنر نمایشگاهی صفحه اول را تبلیغ نمی کند
- [~] CTAها به جریان واقعی حساب/Commerce می روند

### ابزارهای بازار خودرو

- [~] `/cars/price-guide`
  - آمار قیمت آگهی های واقعی بازار
  - median, 25–75%, min/max
  - تاکید: راهنمای بازار، نه کارشناسی قیمت
- [~] `/cars/compare`
  - انتخاب تا 3 آگهی
  - API عمومی امن `/api/compare-listings`
  - مقایسه قیمت/کارکرد/فنی/بدنه/پلاک/موقعیت
  - دکمه مقایسه به صفحه جزئیات خودرو اضافه شده
- [~] `/cars/saved-searches`
  - ذخیره URL واقعی فیلترهای بازار در مرورگر
  - تغییر نام/باز کردن/حذف
  - دکمه ذخیره جست و جو روی `/cars`
  - اعلان سروری هنوز ساخته نشده و به دروغ فعال نمایش داده نمی شود

### حساب و تیم نمایشگاه

- [~] منوی حساب به مالی، بازپرداخت، نمایشگاه منتخب و پشتیبانی وصل است
- [~] `DealerCommandCenter` از قبل دعوت عضو، نقش، Permission و آمار تیم را به API واقعی متصل دارد
- [~] `/account/business/team` از همان DealerCommandCenter استفاده می کند و سیستم موازی ساخته نشده است

### مدیریت

- [~] `/admin/commerce` به نمایشگاه منتخب، بازپرداخت و پشتیبانی متصل است
- [~] مدیریت مالی D1 برای سفارش، پرداخت، فاکتور، بازپرداخت، اشتراک و قیمت گذاری canonical وجود دارد

### SEO

- [~] Static Sitemap با `/cars/compare`, `/cars/price-guide`, `/advertising/*`, `/about`, `/privacy` همگام شده است
- [~] صفحات خصوصی `/account/*`, تیکت ها و saved-searches وارد Sitemap عمومی نشده اند

## مدل های D1 فعلی

```text
banner_reservations (legacy compatibility only)
wallets
wallet_transactions
commerce_orders
payment_attempts
invoices
payment_refunds
featured_showroom_placements
support_tickets
support_replies
```

## Migration Drizzle

- [~] `drizzle/0001_launch_finance_support.sql`
- [~] `drizzle/meta/_journal.json` دارای entry شماره 1 است
- [~] `drizzle/meta/0001_snapshot.json` با Schema فعلی همگام شده است
- Migration هنوز روی محیط واقعی اجرا نشده؛ اجرای آن در مرحله استقرار/تست انجام می شود.

## Legacy

- [~] `/account/ads` فقط Redirect سازگاری به نمایشگاه منتخب است
- [~] `/help` به `/support` می رود
- [!] `/dealers` هنوز پنل قدیمی ثبت/مدیریت نمایشگاه دارد؛ تا انتقال کامل قابلیت ثبت به مسیر canonical حذف نشود
- [~] هیچ لینک جدیدی نباید به `/dealers` اضافه شود؛ مسیر canonical پنل `/account/business` است

## اسناد

- `docs/MASTER-SITEMAP-FA.md` با تصمیم جدید نمایشگاه منتخب همگام شده است.
- `docs/LATEST-WORK-SNAPSHOT-FA.md` Snapshot قدیمی تر است.
- این فایل (`BUILD-CHECKPOINT-2026-08-07-B.md`) مرجع جدیدتر است.

## موارد مهم باقی مانده قبل از تست جامع

1. [ ] انتقال امن قابلیت ثبت نمایشگاه از Legacy `/dealers` به مسیر canonical کسب و کار و سپس Redirect مسیر قدیمی
2. [ ] ممیزی نهایی لینک ها و دکمه های باقی مانده عمومی/حساب/ادمین
3. [ ] پاکسازی متن ها/CTAهای Legacy باقی مانده بدون حذف قراردادهای سازگاری Backend
4. [!] تکمیل Wallet Settlement در Backend اصلی
5. [!] تنظیم Adapter بازپرداخت بانکی در Environment
6. [ ] Pull روی لپ تاپ
7. [ ] اجرای Migration روی محیط تست
8. [ ] TypeScript + Build
9. [ ] تست جامع جریان های کاربر/نمایشگاه/کسب و کار/مدیر/مالی
10. [ ] رفع خطا و Launch

## قوانین بازیابی

- Branch همان `agent/launch-3-local-baseline` است.
- `main` دست نخورد.
- صفحه اول دست نخورد مگر مالک صریحا بگوید.
- بنر نمایشگاهی صفحه اول برنگردد.
- قیمت خدمات در Frontend هاردکد نشود؛ Commerce منبع canonical تعرفه است.
- اول ساخت سایت ادامه پیدا کند؛ تست جامع در انتها.
