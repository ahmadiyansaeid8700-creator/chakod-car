# نقشه مادر ساختاری چاکود

> **وضعیت:** مبنای ثابت توسعه  
> **نسخه:** ۱  
> **قاعده:** هر قابلیت باید جای مشخصی در این نقشه داشته باشد و هیچ پچ نباید ساختار مسیرها را بی‌دلیل به‌هم بزند.

## دو نقشه مستقل پروژه

1. **نقشه ساختاری محصول:** برای صفحات، پنل‌ها، قابلیت‌ها و ترتیب توسعه.
2. **نقشه سئوی XML:** برای صفحات عمومی قابل ایندکس در گوگل.

تا زمان تصویب نسخه جدید، ساختار زیر قفل است.

---

## نمای کلان

```text
چاکود
├── صفحه اصلی
├── بازار خودرو
├── کسب‌وکارهای خودرویی
├── نمایشگاه‌ها
├── محتوای آموزشی
├── حساب کاربری
├── همکاری در فروش
├── پرداخت و تبلیغات
├── مدیریت
└── صفحات قانونی و سازمانی
```

---

## ۱. صفحه اصلی

**مسیر:** `/`

### ترتیب قطعی اجزا

1. هدر
2. استوری‌های عمومی
3. بنر باریک تبلیغاتی
4. جست‌وجوی خودرو
5. خودروهای لوکس و خاص
6. خودروهای منطقه آزاد
7. نمایشگاه‌های منتخب
8. کارت خدمات خودرو
9. کارت قطعات و لوازم خودرو
10. کسب‌وکارهای منتخب نزدیک کاربر
11. مقالات و راهنماها
12. فوتر

> خودروهای عادی در صفحه اصلی نمایش داده نمی‌شوند و از جست‌وجو پیدا می‌شوند.

---

## ۲. بازار خودرو

### صفحات اصلی

```text
/cars
/cars/luxury
/cars/free-zone
/cars/[slug]
```

### جست‌وجو و فیلتر

```text
/cars?brand=
/cars?model=
/cars?province=
/cars?city=
/cars?price_min=
/cars?price_max=
/cars?plate_type=
/cars?seller_type=
```

### صفحات توسعه بعدی

```text
/cars/compare
/cars/price-guide
/cars/saved-searches
```

### مشخصات اصلی هر خودرو

- برند
- مدل
- تیپ
- سال ساخت
- کارکرد
- قیمت
- استان
- شهر
- نوع فروشنده
- نوع پلاک
- منطقه آزاد
- وضعیت بدنه
- گیربکس
- سوخت
- رنگ
- تصاویر
- توضیحات

### وضعیت‌های ویژه

- لوکس تأییدشده
- منطقه آزاد
- آگهی ویژه
- آگهی اسپانسر
- نمایش در صفحه اصلی
- فروخته‌شده

---

## ۳. ثبت و مدیریت آگهی

```text
/account/listings
/account/listings/new
/account/listings/[id]
/account/listings/[id]/edit
/account/listings/[id]/images
/account/listings/[id]/promote
```

### امکانات

- ثبت آگهی
- ویرایش
- مدیریت تصاویر
- تمدید
- بالابر
- ویژه‌کردن
- استوری
- مشاهده وضعیت بررسی
- مشاهده علت رد
- علامت‌گذاری فروخته‌شده
- حذف یا بایگانی
- آمار بازدید و تماس

---

## ۴. دایرکتوری کسب‌وکارها

### صفحه مادر

```text
/businesses
```

### انواع کسب‌وکار

```text
/dealerships
/workshops
/car-services
/parts-stores
```

### صفحه اختصاصی نهایی

```text
/businesses/[slug]
```

> برای جلوگیری از چند ساختار موازی، مسیر نهایی صفحه اختصاصی همه کسب‌وکارها `/businesses/[slug]` است و نوع کسب‌وکار از اطلاعات همان صفحه تشخیص داده می‌شود.

### دسته‌های مرکز خدمات خودرو

- کارواش
- کارواش سیار
- صفرشویی
- دیتیلینگ
- پولیش و واکس
- سرامیک بدنه
- شیشه دودی
- کاور بدنه
- PPF
- تزئینات خودرو
- سیستم صوتی
- دزدگیر و ردیاب
- شیشه خودرو
- خدمات سیار

### دسته‌های تعمیرگاه

- مکانیکی
- برق خودرو
- باتری
- جلوبندی
- گیربکس
- موتور
- تعویض روغن
- صافکاری
- نقاشی
- آپاراتی
- کولر
- اگزوز

### دسته‌های فروشگاه قطعات

- قطعات یدکی
- روغن و فیلتر
- لاستیک و رینگ
- باتری
- قطعات بدنه
- لوازم جانبی
- لوازم تزئینی
- سیستم صوتی
- قطعات استوک

---

## ۵. پنل کسب‌وکار

همه انواع حساب تجاری از یک ساختار مشترک استفاده می‌کنند:

```text
/account/business
/account/business/new
/account/business/edit
/account/business/media
/account/business/portfolio
/account/business/hours
/account/business/branches
/account/business/team
/account/business/analytics
/account/business/promotions
/account/business/billing
```

### انواع حساب تجاری

```text
dealership
workshop
car_service
parts_store
```

نوع کسب‌وکار تعیین می‌کند چه امکاناتی نمایش داده شود.

### امکانات اختصاصی نمایشگاه

- موجودی خودرو
- مدیریت تیم
- مدیریت آگهی‌ها
- صفحه اختصاصی
- خودروهای لوکس
- خودروهای منطقه آزاد
- گزارش تماس و بازدید
- رزرو استوری و بنر

### امکانات مراکز خدمات و تعمیرگاه

- زمینه‌های فعالیت
- آدرس و نقشه
- ساعات کاری
- نمونه‌کار
- خدمات در محل
- چند شعبه
- پیشنهاد ویژه
- آمار تماس و مسیریابی

---

## ۶. حساب کاربری

```text
/account
/account/profile
/account/listings
/account/saved
/account/payments
/account/invoices
/account/notifications
/account/security
```

### کارت‌های داشبورد

- آگهی‌های من
- ذخیره‌شده‌ها
- کسب‌وکار من
- پرداخت‌ها
- تبلیغات من
- همکاری در فروش
- پروفایل و امنیت

---

## ۷. ورود و احراز هویت

```text
/login
/logout
/auth/callback
```

### منطق الزامی بازگشت

```text
/login?returnTo=/account/business
```

- پس از ورود، کاربر باید به همان صفحه مقصد بازگردد.
- صفحات خصوصی نباید کاربر را بدون ذخیره مقصد به صفحه ورود بفرستند.

---

## ۸. نمایشگاه‌های منتخب

### صفحه عمومی

```text
/dealerships
```

### فیلترها

- استان
- شهر
- خودروهای لوکس
- خودروهای منطقه آزاد
- تأییدشده
- منتخب

### دو مفهوم مستقل

- **نمایشگاه منتخب چاکود:** انتخاب براساس کیفیت.
- **نمایشگاه اسپانسر:** جایگاه پولی با برچسب تبلیغ.

---

## ۹. محصولات درآمدی

### آگهی خودرو

- ثبت آگهی
- تمدید
- بالابر
- ویژه
- نمایش بالاتر
- استوری

### نمایشگاه

- اشتراک پایه
- اشتراک حرفه‌ای
- عضو اضافه تیم
- آگهی اضافه
- گزارش حرفه‌ای
- اسپانسر صفحه اصلی
- استوری
- بنر

### کسب‌وکارهای خودرویی

- پروفایل پایه رایگان
- اشتراک حرفه‌ای
- نمایش بالاتر در شهر
- نمایش بالاتر در دسته
- کسب‌وکار ویژه
- نمونه‌کار بیشتر
- چند شعبه
- استوری
- بنر

### مسیرهای مالی

```text
/account/payments
/account/invoices
/account/promotions
/account/subscriptions
```

---

## ۱۰. تبلیغات

```text
/advertising
/advertising/stories
/advertising/banners
/advertising/business-placement
/advertising/dealership-placement
```

### انواع جایگاه

- استوری شهری
- استوری استانی
- استوری چنداستانی
- استوری کشوری
- بنر باریک صفحه اصلی
- جایگاه نمایشگاه اسپانسر
- جایگاه کسب‌وکار ویژه
- رتبه ویژه دسته و شهر

### اطلاعات الزامی هر تبلیغ

- نوع جایگاه
- استان‌ها
- شهرها
- تاریخ شروع
- تاریخ پایان
- ظرفیت
- مبلغ قفل‌شده
- وضعیت پرداخت
- وضعیت تأیید
- نمایش
- کلیک

---

## ۱۱. همکاری در فروش

### صفحات عمومی

```text
/affiliate
/affiliate/rules
/affiliate/privacy
```

### پنل کاربر

```text
/account/affiliate
/account/affiliate/links
/account/affiliate/sales
/account/affiliate/commissions
/account/affiliate/payouts
/account/affiliate/profile
```

> همکاری در فروش داخل محتوای اصلی صفحه اول قرار نمی‌گیرد.

---

## ۱۲. مقالات و محتوای آموزشی

```text
/articles
/articles/[slug]
```

### دسته‌ها

- راهنمای خرید خودرو
- راهنمای فروش خودرو
- خودروهای لوکس
- خودروهای منطقه آزاد
- نگهداری خودرو
- خدمات خودرو
- قیمت و بازار
- اخبار چاکود

---

## ۱۳. صفحات سازمانی و قانونی

```text
/about
/contact
/support
/rules
/privacy
/terms
/refund-policy
/legal
```

> صفحه قوانین اصلی سایت از اسناد همکاری در فروش جدا می‌ماند.

---

## ۱۴. مدیریت چاکود

### ریشه مدیریت

```text
/admin
```

### کاربران و دسترسی

```text
/admin/users
/admin/roles
/admin/permissions
/admin/admins
/admin/audit-logs
```

### آگهی‌ها

```text
/admin/listings
/admin/listings/pending
/admin/listings/rejected
/admin/listings/reported
/admin/listings/luxury
/admin/listings/free-zone
```

### کسب‌وکارها

```text
/admin/businesses
/admin/businesses/pending
/admin/businesses/approved
/admin/businesses/suspended
/admin/business-categories
```

فیلتر نوع:

- نمایشگاه
- تعمیرگاه
- مرکز خدمات
- فروشگاه قطعات

### تبلیغات

```text
/admin/advertising
/admin/stories
/admin/banners
/admin/placements
/admin/capacity
```

### مالی

```text
/admin/orders
/admin/payments
/admin/invoices
/admin/refunds
/admin/subscriptions
/admin/pricing
```

### همکاری در فروش

```text
/admin/affiliate
/admin/affiliate/accounts
/admin/affiliate/commissions
/admin/affiliate/payouts
/admin/affiliate/settings
/admin/affiliate/legal
```

### محتوا و تنظیمات

```text
/admin/articles
/admin/pages
/admin/legal
/admin/settings
/admin/homepage
/admin/locations
```

---

## ۱۵. نقشه سئوی XML

پس از تثبیت مسیرها:

```text
/sitemap.xml
```

به چند فایل تقسیم شود:

```text
/sitemaps/static.xml
/sitemaps/cars.xml
/sitemaps/businesses.xml
/sitemaps/dealerships.xml
/sitemaps/articles.xml
```

### موارد خارج از نقشه گوگل

```text
/admin/*
/account/*
/login
```

همچنین:

- صفحات پرداخت
- صفحات خصوصی
- صفحات دارای پارامترهای ترکیبی جست‌وجو
- پیش‌نویس‌ها
- آگهی‌های ردشده یا منقضی
- کسب‌وکارهای تأییدنشده

---

## ترتیب توسعه براساس نقشه

1. ورود، نشست و سرعت
2. صفحه اصلی
3. خودروهای لوکس و منطقه آزاد
4. فهرست و صفحه خودرو
5. حساب کاربری و آگهی‌های من
6. دایرکتوری کسب‌وکارها
7. پنل نمایشگاه و کسب‌وکار
8. محصولات درآمدی و پرداخت
9. مدیریت کامل
10. محتوا، سئو و `sitemap.xml`
11. تست امنیت، سرعت و انتشار

---

## قانون پچ‌ها

از این مرحله، هر پچ باید پیش از اجرا این موارد را مشخص کند:

```text
Phase:
Affected routes:
Affected files:
Purpose:
Rollback point:
Tests:
```

صفحه اصلی در فاز دوم قرار می‌گیرد. پیش از تغییرات گسترده بعدی، ساختار مسیرها و نام‌گذاری این سند باید مبنای ثابت پروژه باشد.
