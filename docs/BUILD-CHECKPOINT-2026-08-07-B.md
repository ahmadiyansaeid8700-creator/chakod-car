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
- سپس Pull محلی، Migration، TypeScript/Build و تست جامع انجام شود.
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
- [~] فروخته شد، توقف موقت، بازیابی/بازفعال سازی، حذف/بایگانی
- [~] تمدید از Commerce
- [~] مدیریت تصاویر و کاور با APIهای موجود

### مرکز مالی
- [~] کیف پول، سفارش امن و idempotency
- [~] پرداخت بانکی و Callback/Verify
- [~] فاکتور، جزئیات و چاپ
- [~] Checkout سفارش جدید و سفارش از قبل ساخته شده
- [~] Retry امن پرداخت کیف پول
- [~] قیمت های ثابت تبلیغات/اشتراک از FinanceCenter حذف شده اند
- [~] FinanceCenter فقط به جریان canonical Commerce متصل است
- [!] Wallet Settlement نیازمند Backend خارجی و Environment است

### نمایشگاه منتخب
- [~] `featured_showroom_placements`
- [~] رزرو کاربر، پرداخت، Verify، صف بررسی و تایید/رد مدیر
- [~] HomeFeaturedShowrooms فقط جایگاه تاییدشده/فعال را وارد Rail می کند
- [~] مشاهده همه مستقیم به `/dealerships` می رود
- [~] کارت fallback ثبت نمایشگاه مستقیم به `/account/business/new` می رود
- [~] کارت واقعی نمایشگاه به `/businesses/[slug]` می رود

### بازپرداخت
- [~] درخواست کاربر + تایید/رد/اجرای مدیر
- [~] کامل یا جزئی با سقف مبلغ واقعی پرداخت
- [~] بازپرداخت کیف پول با قفل ضد دوباره واریز
- [~] بازپرداخت بانکی از Adapter سروری
- [!] Gateway refund نیازمند `CHAKOD_REFUND_ENDPOINT/ACTION/SECRET`

### پشتیبانی واقعی
- [~] تیکت کاربر و مهمان، گفت و گو، شماره پیگیری و پنل ادمین
- [~] توکن مهمان هش شده در DB ذخیره می شود
- [~] `/contact` به فرم تیکت واقعی وصل است

### صفحات عمومی و تبلیغات
- [~] `/about`, `/privacy`, `/terms`, `/refund-policy`, `/legal`, `/support`
- [~] `/advertising`, `/advertising/stories`, `/advertising/business-placement`, `/advertising/dealership-placement`
- [~] هیچ محصول کاربری برای بنر نمایشگاهی صفحه اول وجود ندارد

### ابزارهای بازار خودرو
- [~] `/cars/price-guide` براساس قیمت آگهی های واقعی
- [~] `/cars/compare` تا سه خودرو + دکمه مقایسه در صفحه آگهی
- [~] `/cars/saved-searches` ذخیره/تغییر نام/بازکردن/حذف جست و جو
- [~] اعلان سروری saved search ساخته نشده و به دروغ فعال نمایش داده نمی شود

### حساب و تیم نمایشگاه
- [~] منوی حساب به مالی، بازپرداخت، نمایشگاه منتخب و پشتیبانی وصل است
- [~] `DealerCommandCenter` از API واقعی برای دعوت عضو، نقش، Permission و آمار تیم استفاده می کند
- [~] `ProfileEditor` تبدیل نوع حساب به dealer/parts_store/repair_shop/car_service را دارد
- [~] `ProfessionalProfileEditor` پروفایل حرفه ای، خدمات، ساعات، نقشه، تصاویر و گالری را ذخیره می کند

### مدیریت
- [~] پنل مالی، Commerce، نمایشگاه منتخب، بازپرداخت و پشتیبانی
- [~] `/admin/admins`, `/admin/roles`, `/admin/permissions`, `/admin/audit-logs` به Access Manager واقعی Commerce وصل شده اند
- [~] `/admin/advertising` هاب canonical مدیریت تبلیغات است
- [~] `/admin/stories`, `/admin/capacity` به Commerce و `/admin/placements` به نمایشگاه منتخب وصل شده اند
- [~] `/admin/banners` فقط Route سازگاری سوابق Legacy است
- [~] AdminSectionNav به تبلیغات، نمایشگاه منتخب، پشتیبانی، مالی و دسترسی مدیران وصل است
- [!] `/admin/users` هنوز قرارداد API قطعی فهرست همه کاربران ندارد و صفحه ساختگی ایجاد نشده است

### ناوبری و Route cleanup
- [~] Shared internal Header و CSS responsive ساخته شده است
- [~] هدر و فوتر صفحه اول نمایشگاه ها را مستقیم به `/dealerships` می فرستند
- [~] `/showrooms` Redirect سازگاری به `/dealerships` است
- [~] `/showrooms/[id]` dealer_id قدیمی را به پروفایل canonical کسب و کار resolve می کند و در قطع API به `/dealerships` برمی گردد
- [~] Hero قدیمی، HomeBannerSlot و HomeNearbyBusinesses placeholder حذف شده اند
- [~] صفحه اول از نظر ترتیب و ظاهر دست نخورده باقی مانده است

### SEO
- [~] Static Sitemap با صفحات عمومی جدید همگام شده است
- [~] صفحات خصوصی حساب، تیکت و saved-searches از Sitemap خارج هستند
- [~] robots مسیرهای خصوصی جدید را block می کند
- [~] `app/robots.ts` و `app/sitemap.ts` قدیمی حذف شدند تا با Routeهای canonical `robots.txt` و `sitemap.xml` تداخل نداشته باشند

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
- Migration هنوز روی محیط واقعی اجرا نشده است.

## Legacy
- [~] `/account/ads` فقط Redirect سازگاری به نمایشگاه منتخب است
- [~] `/help` به `/support` می رود
- [!] `/dealers` هنوز پنل قدیمی چندنمایشگاهی دارد؛ چون ممکن است قابلیت اضافه ای نسبت به پروفایل canonical داشته باشد، تا انتقال امن حذف نمی شود
- [~] هیچ لینک جدیدی نباید به `/dealers` اضافه شود

## موارد مهم باقی مانده قبل از تست جامع

1. [ ] ممیزی نهایی باقی لینک ها و CTAهای Legacy
2. [ ] تعیین تکلیف امن قابلیت چندنمایشگاهی Legacy `/dealers`
3. [!] قرارداد API مدیریت همه کاربران برای `/admin/users`
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
