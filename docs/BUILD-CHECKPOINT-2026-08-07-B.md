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

### ثبت و مدیریت آگهی
- [~] فرم چندمرحله ای ثبت آگهی با احراز هویت، برند/مدل، مکان، قیمت، اطلاعات فنی و قوانین
- [~] پیش نمایش اطلاعات قبل از ثبت در مرحله نهایی فرم وجود دارد
- [~] آپلود، فشرده سازی WebP، حذف، Retry، انتخاب کاور و Progress تصاویر
- [~] Submit واقعی با `/api/submit-listing.php` و Finalize با `/api/finalize-listing.php`
- [~] مدیریت، ویرایش، تصاویر و ارتقا
- [~] فروخته شد، توقف موقت، بازیابی/بازفعال سازی، حذف/بایگانی
- [~] تمدید از Commerce
- [~] گزارش آگهی به تیکت واقعی پشتیبانی متصل شده است
- [~] آگهی های مشابه براساس برند/مدل/استان/قیمت در صفحه جزئیات نمایش داده می شوند
- [!] Draft سروری قبل از Submit قرارداد Backend قطعی ندارد؛ Draft ساختگی اضافه نشده است

### مرکز مالی
- [~] کیف پول، سفارش امن و idempotency
- [~] پرداخت بانکی و Callback/Verify
- [~] فاکتور، جزئیات و چاپ
- [~] Checkout سفارش جدید و سفارش از قبل ساخته شده
- [~] Retry امن پرداخت کیف پول
- [~] قیمت های ثابت تبلیغات/اشتراک از FinanceCenter حذف شده اند
- [~] FinanceCenter فقط به جریان canonical Commerce متصل است
- [~] `.env.example` متغیرهای Wallet Settlement و Refund Adapter را بدون Secret واقعی مستند می کند
- [!] Wallet Settlement نیازمند Backend خارجی و Environment است

### نمایشگاه منتخب
- [~] `featured_showroom_placements`
- [~] رزرو کاربر، پرداخت، Verify، صف بررسی و تایید/رد مدیر
- [~] HomeFeaturedShowrooms فقط جایگاه تاییدشده/فعال را وارد Rail می کند
- [~] مشاهده همه مستقیم به `/dealerships` می رود
- [~] کارت fallback ثبت نمایشگاه مستقیم به `/account/business/new` می رود
- [~] کارت واقعی نمایشگاه به `/businesses/[slug]` می رود

### جایگاه کسب و کار
- [~] `business_placement` از Commerce canonical خوانده می شود
- [~] کاربر مجموعه هدف را از فهرست مجموعه های قابل مدیریت خودش انتخاب می کند
- [~] `/api/finance/orders` مالکیت `dealer_id` را دوباره سمت سرور از `/api/commerce.php` بررسی می کند
- [~] سفارش هدف دار قبل از Checkout ساخته می شود و سپس کیف پول/درگاه انتخاب می شود
- [~] مبلغ از مرورگر پذیرفته نمی شود و فقط مبلغ Commerce در سفارش قفل می شود

### بازپرداخت
- [~] درخواست کاربر + تایید/رد/اجرای مدیر
- [~] کامل یا جزئی با سقف مبلغ واقعی پرداخت
- [~] بازپرداخت کیف پول با قفل ضد دوباره واریز
- [~] بازپرداخت بانکی از Adapter سروری
- [!] Gateway refund نیازمند `CHAKOD_REFUND_ENDPOINT/ACTION/SECRET`

### پشتیبانی و گزارش تخلف
- [~] تیکت کاربر و مهمان، گفت و گو، شماره پیگیری و پنل ادمین
- [~] توکن مهمان هش شده در DB ذخیره می شود
- [~] `/contact` به فرم تیکت واقعی وصل است
- [~] فرم پشتیبانی از Query برای topic/subject/message/order_no/listing_id پیش پر می شود
- [~] گزارش آگهی از صفحه خودرو به همان تیکت متصل است
- [~] گزارش کسب و کار از `/businesses/[slug]` به همان تیکت متصل است

### اعلان های حساب
- [~] پروفایل ناقص و شماره تایید نشده
- [~] آگهی pending/rejected/inactive/expired
- [~] سفارش pending/failed
- [~] بازپرداخت requested/approved/processing/rejected
- [~] پاسخ پشتیبانی و تیکت های urgent/high
- [~] لینک هر اعلان مستقیم به صفحه عملیاتی همان مورد می رود

### صفحات عمومی و تبلیغات
- [~] `/about`, `/privacy`, `/terms`, `/refund-policy`, `/legal`, `/support`
- [~] `/advertising`, `/advertising/stories`, `/advertising/business-placement`, `/advertising/dealership-placement`
- [~] هیچ محصول کاربری برای بنر نمایشگاهی صفحه اول وجود ندارد

### ابزارهای بازار خودرو
- [~] `/cars/price-guide` براساس قیمت آگهی های واقعی
- [~] `/cars/compare` تا سه خودرو + دکمه مقایسه در صفحه آگهی
- [~] `/cars/saved-searches` ذخیره/تغییر نام/بازکردن/حذف جست و جو
- [~] اعلان سروری saved search ساخته نشده و به دروغ فعال نمایش داده نمی شود

### کسب و کار و تیم نمایشگاه
- [~] پروفایل عمومی واقعی با تماس، واتساپ، وب سایت، اینستاگرام، نقشه، ساعت کاری، خدمات، گالری و خودروهای نمایشگاه
- [~] گزارش کسب و کار به پشتیبانی واقعی وصل است
- [~] منوی حساب به مالی، بازپرداخت، نمایشگاه منتخب و پشتیبانی وصل است
- [~] `DealerCommandCenter` از API واقعی برای دعوت عضو، نقش، Permission و آمار تیم استفاده می کند
- [~] `ProfileEditor` تبدیل نوع حساب به dealer/parts_store/repair_shop/car_service را دارد
- [~] `ProfessionalProfileEditor` پروفایل حرفه ای، خدمات، ساعات، نقشه، تصاویر و گالری را ذخیره می کند
- [~] وضعیت moderation پروفایل از Backend خوانده می شود و صفحه عمومی فقط برای وضعیت تاییدشده ارائه می شود
- [!] Track عمومی تماس/واتساپ/مسیریابی قرارداد Backend قطعی در مخزن ندارد؛ Analytics موازی ساختگی ایجاد نشده است

### همکاری در فروش
- [~] جریان واقعی کاربر از `/api/auth/affiliate`: ثبت حساب، لینک اختصاصی، کلیک، فروش، پورسانت، شبا و سوابق تسویه
- [~] جریان واقعی مدیریت از `/api/admin/affiliate`: تنظیمات، حساب ها، پورسانت ها، تسویه ها و اسناد حقوقی
- [~] سیستم موازی ساخته نشده است

### مجله و مدیریت محتوا
- [~] `/articles` فهرست واقعی مجله و دسته بندی
- [~] `/articles/[slug]` صفحه مقاله + Metadata SEO
- [~] دو مقاله Launch به عنوان fallback قبل از Migration موجود هستند
- [~] `content_articles` برای CMS D1 ساخته شده است
- [~] `/admin/articles` ساخت، ویرایش، Draft، انتشار، آرشیو و حذف مقاله دارد
- [~] متن ادمین با قالب ساده `## عنوان بخش` و `- آیتم` به Sections امن تبدیل می شود
- [~] فقط `published` عمومی است؛ Draft/Archived حتی با Slug fallback محتوای عمومی را suppress می کند
- [~] Sitemap مقاله ها مستقیم از Publishedهای canonical ساخته می شود

### مدیریت
- [~] پنل مالی، Commerce، نمایشگاه منتخب، بازپرداخت و پشتیبانی
- [~] `/admin/articles` مدیریت واقعی مجله
- [~] `/admin/admins`, `/admin/roles`, `/admin/permissions`, `/admin/audit-logs` به Access Manager واقعی Commerce وصل شده اند
- [~] `/admin/advertising` هاب canonical مدیریت تبلیغات است
- [~] `/admin/stories`, `/admin/capacity` به Commerce و `/admin/placements` به نمایشگاه منتخب وصل شده اند
- [~] `/admin/banners` فقط Route سازگاری سوابق Legacy است
- [~] AdminSectionNav به مقالات، تبلیغات، نمایشگاه منتخب، پشتیبانی، مالی و دسترسی مدیران وصل است
- [!] `/admin/users` هنوز قرارداد API قطعی فهرست همه کاربران ندارد و صفحه ساختگی ایجاد نشده است

### ناوبری و Route cleanup
- [~] Shared internal Header و CSS responsive ساخته شده است
- [~] هدر و فوتر صفحه اول نمایشگاه ها را مستقیم به `/dealerships` می فرستند
- [~] `/showrooms` Redirect سازگاری به `/dealerships` است
- [~] `/showrooms/[id]` dealer_id قدیمی را به پروفایل canonical کسب و کار resolve می کند و در قطع API به `/dealerships` برمی گردد
- [~] `/account/ads` براساس نوع حساب کاربر به تبلیغات درست هدایت می کند
- [~] Hero قدیمی، HomeBannerSlot و HomeNearbyBusinesses placeholder حذف شده اند
- [~] صفحه اول از نظر ترتیب و ظاهر دست نخورده باقی مانده است

### SEO
- [~] Static Sitemap با صفحات عمومی جدید همگام شده است
- [~] Articles sitemap از Publishedهای canonical ساخته می شود
- [~] صفحات خصوصی حساب، تیکت و saved-searches از Sitemap خارج هستند
- [~] robots مسیرهای خصوصی جدید را block می کند
- [~] `app/robots.ts` و `app/sitemap.ts` قدیمی حذف شدند تا با Routeهای canonical تداخل نداشته باشند

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
content_articles
```

## Migration Drizzle
- [~] `drizzle/0001_launch_finance_support.sql`
- [~] `drizzle/meta/0001_snapshot.json`
- [~] `drizzle/0002_content_articles.sql`
- [~] `drizzle/meta/0002_snapshot.json`
- [~] `drizzle/meta/_journal.json` دارای entryهای 0، 1 و 2 است
- Migrationها هنوز روی محیط واقعی اجرا نشده اند.

## Legacy
- [~] `/account/ads` Route سازگاری هوشمند براساس نوع حساب است
- [~] `/help` به `/support` می رود
- [!] `/dealers` هنوز پنل قدیمی چندنمایشگاهی دارد؛ چون ممکن است قابلیت اضافه ای نسبت به پروفایل canonical داشته باشد، تا انتقال امن حذف نمی شود
- [~] هیچ لینک جدیدی نباید به `/dealers` اضافه شود

## موارد واقعی باقی مانده قبل از تست جامع

1. [ ] ممیزی نهایی چند CTA/Route Legacy باقی مانده بدون تغییر طراحی صفحه اول
2. [ ] تعیین تکلیف امن قابلیت چندنمایشگاهی Legacy `/dealers`
3. [!] قرارداد API مدیریت همه کاربران برای `/admin/users`
4. [!] قرارداد Backend Track عمومی تعامل کسب و کار (تماس/واتساپ/مسیریابی)
5. [!] قرارداد Draft سروری آگهی قبل از Submit
6. [!] تکمیل Wallet Settlement در Backend اصلی
7. [!] تنظیم Adapter بازپرداخت بانکی در Environment
8. [ ] Pull روی لپ تاپ
9. [ ] اجرای Migration روی محیط تست
10. [ ] TypeScript + Build
11. [ ] تست جامع جریان های کاربر/نمایشگاه/کسب و کار/مدیر/مالی/محتوا
12. [ ] رفع خطا و Launch

## قوانین بازیابی
- Branch همان `agent/launch-3-local-baseline` است.
- `main` دست نخورد.
- صفحه اول دست نخورد مگر مالک صریحا بگوید.
- بنر نمایشگاهی صفحه اول برنگردد.
- قیمت خدمات در Frontend هاردکد نشود؛ Commerce منبع canonical تعرفه است.
- اول ساخت سایت ادامه پیدا کند؛ تست جامع در انتها.
