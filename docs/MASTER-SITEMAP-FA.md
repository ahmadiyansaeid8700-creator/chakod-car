# نقشه مادر فعلی چاکود

> وضعیت: منبع حقیقت ساختاری برای نسخه جاری پس از Legacy Cleanup  
> اصل: مسیرهای canonical از کد جاری استخراج می‌شوند؛ اسناد قدیمی نباید قابلیت حذف‌شده را دوباره وارد محصول کنند.

## نمای کلان محصول

```text
چاکود
├── صفحه اصلی
├── بازار خودرو
├── کسب‌وکارهای خودرویی
├── نمایشگاه‌ها
├── حساب کاربری
├── دعوت و پورسانت کاربر
├── مدیریت
└── قوانین
```

## مسیرهای عمومی canonical

```text
/
/cars
/cars/luxury
/cars/free-zone
/cars/[slug]
/businesses
/businesses/[slug]
/dealerships
/r/[code]
/rules
```

### بازار خودرو
- implementation بازار زیر `app/cars/_catalog` است.
- صفحه جزئیات canonical: `/cars/[slug]`.
- `/ads` و `/ads/[segment]` فقط مسیر سازگار قدیمی و Redirect هستند.
- `/listing/[id]` فقط Redirect سازگار به `/cars/[slug]` است.

### نمایشگاه و کسب‌وکار
- فهرست عمومی نمایشگاه‌ها: `/dealerships`.
- پروفایل عمومی کسب‌وکار/نمایشگاه: `/businesses/[slug]`.
- `/showrooms` و `/showrooms/[dealer]` فقط Redirect سازگار هستند.
- `/dealers` و `/dealers/[dealerId]` فقط Redirect به مدیریت جدید حساب هستند.

## حساب کاربری

مسیر اصلی حساب:

```text
/account
```

مسیرهای فعال مهم:

```text
/account/listings
/account/listings/new
/account/listings/[listingId]
/account/saved
/account/business
/account/business/new
/account/services
```

`/dashboard` و زیرمسیرهای قدیمی آن فقط Redirect سازگار به ساختار `/account` هستند.

## دعوت و پورسانت

Affiliate یا Ambassador مستقل وجود ندارد.

مدل جاری:

```text
User
→ کد دعوت
→ /r/[code]
→ ثبت attribution
→ خرید/خدمت واجد شرایط
→ پورسانت دعوت‌کننده
```

هیچ عضویت، KYC یا حساب Affiliate جداگانه‌ای نباید ساخته شود.

## مدیریت

```text
/admin
/admin/ai
/admin/listings
/admin/businesses
/admin/commerce
/admin/homepage-banners
```

### Chakod AI Manager
- AI Manager از هسته سایت جدا است.
- Mode فعلی: `read_suggest`.
- Toolها در این فاز Read-only هستند.
- Write action خودکار ممنوع است.
- Snapshot داده قبل از Provider باید Sanitized باشد.
- Listing Moderation یک زیرسیستم مستقل و حفظ‌شده است.

## قابلیت‌های حذف‌شده

موارد زیر بخشی از محصول جاری نیستند و نباید دوباره از اسناد قدیمی بازسازی شوند:

- Global AI Assistant / ChatGPT starter قدیمی
- Affiliate program مستقل
- Ambassador program
- Banner Reservation توسط کاربر
- `/account/ads`
- داشبورد موازی قدیمی
- پنل مدیریتی قدیمی `/dealers`
- implementation قدیمی بازار زیر `/ads`

## بنر صفحه اصلی

مدیریت دستی بنرهای صفحه اصلی با Banner Reservation متفاوت است و همچنان می‌تواند از `/admin/homepage-banners` مدیریت شود. رزرو جایگاه توسط کاربر حذف شده است.

## قواعد تغییر ساختار

1. مسیر canonical جدید فقط با نیاز واقعی محصول اضافه شود.
2. Route قدیمی در صورت نیاز به سازگاری فقط Redirect سبک باشد؛ implementation موازی ممنوع است.
3. Backup تاریخی داخل `app` نگهداری نشود؛ Git تاریخچه است.
4. قابلیت حذف‌شده فقط با تصمیم صریح مالک برگردد.
5. `main` فقط پس از Regression/Build موفق و تأیید صریح مالک تغییر کند.
