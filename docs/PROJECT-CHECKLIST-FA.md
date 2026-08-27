# چک‌لیست فعلی پروژه چاکود

> این سند فقط قابلیت‌های واقعی نسخه جاری را دنبال می‌کند. هر مورد حذف‌شده باید حذف‌شده بماند مگر با تصمیم صریح مالک.

## ساختار محصول
- [x] صفحه اصلی `/`
- [x] بازار خودرو `/cars`
- [x] لوکس `/cars/luxury`
- [x] منطقه آزاد `/cars/free-zone`
- [x] جزئیات canonical `/cars/[slug]`
- [x] کسب‌وکارها `/businesses`
- [x] پروفایل کسب‌وکار `/businesses/[slug]`
- [x] نمایشگاه‌ها `/dealerships`
- [x] حساب `/account`
- [x] آگهی‌های کاربر `/account/listings`
- [x] ثبت آگهی `/account/listings/new`
- [x] ذخیره‌شده‌ها `/account/saved`
- [x] مدیریت کسب‌وکار `/account/business`
- [x] خدمات/Commerce حساب `/account/services`

## مسیرهای Legacy
- [x] `/ads*` فقط Redirect سازگار
- [x] `/listing/[id]` فقط Redirect به `/cars/[slug]`
- [x] `/dashboard*` فقط Redirect به `/account`
- [x] `/dealers*` فقط Redirect به مدیریت جدید حساب
- [x] `/showrooms*` فقط Redirect به ساختار عمومی فعلی
- [x] implementation موازی قدیمی از این مسیرها حذف شده است

## دعوت و پورسانت
- [x] هر کاربر می‌تواند کد دعوت داشته باشد
- [x] `/r/[code]` attribution دعوت را ثبت می‌کند
- [x] Commerce می‌تواند کد دعوت را برای خرید واجد شرایط منتقل کند
- [x] Affiliate program مستقل حذف شده است
- [x] Ambassador program حذف شده است
- [ ] در صورت نیاز UI ساده «دعوت‌های من / پورسانت من» داخل حساب عادی طراحی شود

## بنر
- [x] Banner Reservation توسط کاربر حذف شده است
- [x] `/account/ads` حذف شده است
- [x] مدیریت دستی بنر صفحه اصلی مستقل باقی مانده است
- [x] `/admin/homepage-banners` قابلیت مدیریتی جدا از رزرو کاربر است

## مدیریت
- [x] `/admin`
- [x] `/admin/listings`
- [x] `/admin/businesses`
- [x] `/admin/commerce`
- [x] `/admin/homepage-banners`
- [x] `/admin/ai`

## Chakod AI Manager
- [x] Assistant سراسری قدیمی حذف شده است
- [x] ChatGPT starter قدیمی حذف شده است
- [x] Feature flag و Provider contract اضافه شده است
- [x] Provider Adapter اضافه شده است
- [x] Tool Registry و Tool Executor Read-only اضافه شده‌اند
- [x] Snapshotها قبل از Provider Sanitized می‌شوند
- [x] حالت فعلی `read_suggest` است
- [x] Write action خودکار ممنوع است
- [x] Listing Moderation مستقل حفظ شده است
- [ ] Write tool فقط بعد از طراحی Human Approval مستقل بررسی شود

## امنیت
- [x] Secret واقعی داخل Git قرار نمی‌گیرد
- [x] AI Manager بدون config صریح Fail-closed است
- [x] Admin routeها باید Server-side محافظت شوند
- [ ] Backend secrets روی هاست خارج از Document Root تکمیل شوند
- [ ] DB / OTP / Session / upload به‌صورت end-to-end تست شوند

## Quality Gate
- [x] TypeScript روی آخرین Run قبل از Build پاس شده است
- [x] Core route tests روی آخرین Run قبل از Build پاس شده‌اند
- [x] AI Manager + Moderation tests روی آخرین Run قبل از Build پاس شده‌اند
- [x] Lint helpers پاس شده است
- [x] Permission اسکریپت‌های Build برای Linux اصلاح شده است
- [ ] Full Build بعد از آخرین Cleanup پاس شود
- [ ] Smoke بعد از Build پاس شود

## Cleanup
- [x] Legacy AI
- [x] Affiliate / Ambassador مستقل
- [x] Banner Reservation
- [x] Dashboard قدیمی
- [x] Dealer manager قدیمی
- [x] Showroom profile قدیمی
- [x] Listing detail implementation به مسیر canonical منتقل شد
- [x] Catalog implementation از `/ads` به `app/cars/_catalog` منتقل شد
- [x] Backupها و Home componentهای یتیم اثبات‌شده حذف شدند
- [ ] Assetهای باقی‌مانده فقط در صورت اثبات عدم مصرف حذف شوند

## Release
- [ ] Full Regression سبز
- [ ] Backend smoke سبز
- [ ] Staging smoke سبز
- [ ] تصمیم درباره `main` فقط با تأیید صریح مالک
