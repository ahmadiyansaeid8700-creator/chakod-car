# برنامه اجرایی نهایی لانچ چاکود

## هدف

این سند برنامه اجرایی رسیدن نسخه فعلی چاکود به وضعیت آماده انتشار عمومی است. اصل اصلی این مرحله حفظ ساختار محصول موجود، حذف ناهماهنگی‌های ظاهری، بستن مسیرهای ناقص و تست کامل روی Staging قبل از هر تغییر Production است.

## قواعد ثابت اجرای لانچ

1. تمام تغییرات تا پایان QA روی شاخه `agent/launch-3-local-baseline` و Worker استیجینگ انجام می‌شوند.
2. Production و دامنه اصلی تا Gate نهایی دست‌نخورده می‌مانند.
3. هر بار فقط یک مشکل یا یک گروه کاملاً مرتبط اصلاح می‌شود.
4. قبل از هر پچ، مسیرها و فایل‌های درگیر مشخص می‌شوند.
5. بعد از هر پچ، همان سناریو روی Desktop و Mobile تست می‌شود.
6. قابلیت جدید غیرضروری تا بسته‌شدن موارد P0 اضافه نمی‌شود.
7. هدر، فوتر، فاصله‌ها، فونت، دکمه‌ها، فرم‌ها و کارت‌ها باید از یک زبان بصری واحد پیروی کنند.
8. هیچ Secret، Merchant ID، Token یا اطلاعات واقعی درگاه در Git ذخیره نمی‌شود.
9. هر جریان مالی باید Idempotent باشد و Refresh/Retry باعث فعال‌سازی دوباره نشود.
10. هر مرحله Definition of Done مشخص دارد و تا تأیید آن، مرحله بعد شروع نمی‌شود.

---

# فاز A — ممیزی ظاهری و ساختاری تمام صفحات (P0)

## هدف

شناسایی تمام تفاوت‌های ظاهری و ساختاری قبل از اصلاح کد.

## صفحات اولویت‌دار عمومی

- `/`
- `/cars`
- `/cars/luxury`
- `/cars/free-zone`
- `/cars/[id|slug]`
- `/dealerships`
- `/businesses`
- `/businesses/[slug]`
- `/workshops`
- `/car-services`
- `/parts-stores`
- `/articles`
- `/articles/[slug]`
- `/support`
- `/about`
- `/contact`
- `/rules`
- `/privacy`
- `/terms`
- `/refund-policy`
- `/legal`
- `/login`

## صفحات حساب

- `/account`
- `/account/profile`
- `/account/listings`
- `/account/listings/new`
- `/account/saved`
- `/account/business`
- `/account/payments`
- `/account/invoices`
- `/account/notifications`
- `/account/security`
- `/account/affiliate`

## صفحات مدیریت

- `/admin`
- `/admin/listings*`
- `/admin/businesses*`
- `/admin/advertising*`
- `/admin/orders`
- `/admin/payments`
- `/admin/invoices`
- `/admin/refunds`
- `/admin/pricing`
- `/admin/affiliate*`
- `/admin/articles`
- `/admin/settings`

## برای هر صفحه بررسی شود

- Header و تعداد منوهای بالا
- Footer
- عرض Container
- فاصله از Header
- تیتر اصلی و Subheading
- Breadcrumb/Back navigation
- Button hierarchy
- Form controls
- Card style
- Border radius و Shadow
- Empty/Error/Loading states
- رنگ و Typography
- Mobile layout
- Desktop layout
- منوی پایین موبایل
- لینک‌ها و CTAهای اضافی یا تکراری

## خروجی

هر صفحه یکی از وضعیت‌های زیر می‌گیرد:

- `OK` استاندارد
- `MINOR` اصلاح جزئی
- `MAJOR` ناسازگار با ساختار اصلی
- `BLOCKER` مانع لانچ

## Definition of Done

یک ماتریس کامل از تمام صفحات و ایرادهای ظاهری/ساختاری وجود داشته باشد و قبل از اصلاح UI هیچ صفحه اصلی از قلم نیفتاده باشد.

---

# فاز B — قفل Design System و Shellهای مشترک (P0)

## هدف

جلوگیری از اینکه هر صفحه هدر، منو، فاصله و ظاهر مستقل داشته باشد.

## خروجی‌های لازم

- Header عمومی واحد
- Header/Sidebar حساب واحد
- Admin Shell واحد
- Footer واحد
- Container و spacing استاندارد
- Button variants استاندارد
- Input/Select/Textarea استاندارد
- Card استاندارد
- Badge استاندارد
- Alert/Notice استاندارد
- Empty/Error/Loading استاندارد
- Modal استاندارد
- Breakpointهای Responsive مشخص

## قاعده Header عمومی

منو فقط مسیرهای اصلی و ضروری را نشان دهد. لینک‌های فرعی مثل قوانین، تماس، تبلیغات و همکاری در فروش در Footer یا Context مرتبط قرار می‌گیرند.

## Definition of Done

هیچ صفحه عمومی اصلی Header موازی یا منوی شلوغ مستقل نداشته باشد و صفحات حساب/ادمین نیز Shell مخصوص و یکسان خود را داشته باشند.

---

# فاز C — اصلاح صفحه‌به‌صفحه UI/UX (P0)

ترتیب پیشنهادی:

1. Homepage
2. Cars list
3. Car details
4. Dealerships/Businesses
5. Login
6. Account shell
7. Listing creation/edit
8. Payments/Invoices
9. Support
10. Articles/Legal
11. Admin shell
12. Admin feature pages

برای هر صفحه ابتدا Desktop و سپس Mobile اصلاح و همان لحظه تست می‌شود.

## Definition of Done

تمام صفحات اصلی از یک زبان بصری واحد پیروی کنند و هیچ تفاوت آشکار در Header، spacing، typography، buttons یا فرم‌ها باقی نماند.

---

# فاز D — تست جریان‌های اصلی محصول (P0)

## سناریوهای الزامی

- مهمان → جستجوی خودرو → جزئیات → تماس
- مهمان → ورود → برگشت به مقصد
- کاربر → ثبت آگهی → تصاویر → پیش‌نمایش → ارسال
- کاربر → ویرایش/حذف/فروخته‌شده
- کاربر → ذخیره آگهی
- کسب‌وکار → ساخت/ویرایش پروفایل
- نمایشگاه → مدیریت آگهی‌ها
- پشتیبانی → ساخت تیکت → مشاهده → پاسخ
- فاکتور و سوابق مالی
- Affiliate کاربر و ادمین
- Admin moderation

## Definition of Done

هیچ مسیر اصلی کاربر بن‌بست، 404 ناخواسته، CTA بدون عملکرد یا Redirect اشتباه نداشته باشد.

---

# فاز E — کمپین افتتاحیه GOLSHAN (P0)

مرجع محصول: `docs/LAUNCH-OFFER-GOLSHAN-FA.md`

## قواعد قفل‌شده

- کد: `GOLSHAN`
- تخفیف: 100٪
- فقط همان سرویس انتخاب‌شده
- مدت فعال‌سازی سرویس‌های مدت‌دار: 45 روز
- مبلغ نهایی: صفر تومان
- عدم ارسال سفارش صفر تومانی به زرین‌پال
- ثبت قیمت اصلی، تخفیف و مبلغ نهایی در فاکتور
- ثبت `starts_at` و `expires_at`
- انقضای خودکار بعد از 45 روز
- اعتبارسنجی سمت سرور
- Idempotency
- امکان فعال/غیرفعال‌کردن کمپین توسط مدیر
- محصولات یک‌بارمصرف مثل بالابر به‌صورت پیش‌فرض خارج از کمپین

## تست‌ها

- کد معتبر
- کد نامعتبر
- سرویس غیرمشمول
- فعال‌سازی صفر تومانی
- Refresh بعد از فعال‌سازی
- Retry درخواست
- فاکتور صفر تومانی
- انقضای 45 روزه

---

# فاز F — زرین‌پال و پرداخت واقعی (P0)

## مراحل

- تعریف Secretهای درگاه فقط در Environment
- Create payment
- Redirect به زرین‌پال
- Callback
- Verify سمت سرور
- ثبت Authority/Ref ID یا شناسه‌های معادل
- جلوگیری از Verify/Activation تکراری
- نتیجه موفق
- نتیجه ناموفق
- لغو توسط کاربر
- Timeout/Network failure
- Invoice reconciliation

## اصل مهم

سفارش با مبلغ نهایی صفر هرگز به زرین‌پال ارسال نمی‌شود.

## Definition of Done

حداقل یک پرداخت واقعی کم‌مبلغ در محیط نهایی تست شده و تکرار Callback/Refresh باعث پرداخت یا فعال‌سازی مضاعف نمی‌شود.

---

# فاز G — اعتماد، حقوقی، SEO و اینماد (P1)

- نمایش مناسب اینماد
- قوانین استفاده
- حریم خصوصی
- Refund policy
- قوانین تبلیغات
- شرایط سرویس‌های پولی
- لینک صحیح Footer
- Metadata
- Canonical
- robots
- sitemap
- Open Graph
- عدم Index صفحات خصوصی

---

# فاز H — امنیت و Performance (P0/P1)

## امنیت P0

- Secrets خارج Git
- کنترل Role/Permission
- Upload MIME/size limits
- Rate limit
- XSS/SQL injection review
- CORS/CSRF
- عدم نمایش خطاهای داخلی
- Backup دیتابیس

## Performance P1

- تصاویر WebP/AVIF
- Lazy loading
- جلوگیری از CLS
- کاهش درخواست Homepage
- Cache مناسب API عمومی
- Bundle review
- تست موبایل و دسکتاپ

---

# فاز I — Staging نهایی (P0)

- نهایی‌کردن دامنه Staging بدون دست‌زدن به Production
- D1 مستقل Staging
- تست Desktop
- تست Android Chrome
- تست iPhone Safari/Chrome
- اینترنت ضعیف
- مهمان
- کاربر شخصی
- نمایشگاه
- تعمیرگاه
- خدمات
- قطعات
- مدیر
- پرداخت
- GOLSHAN
- Support
- 404/API failure

## Definition of Done

تمام Gateهای P0 سبز باشند و هیچ مورد BLOCKER یا MAJOR بدون تصمیم باقی نماند.

---

# فاز J — Production Gate و لانچ

قبل از لانچ:

- Backup
- Rollback point
- Environment/Bindings check
- Migration check
- Domain/Routes check
- Secrets check
- Smoke test checklist آماده

بعد از لانچ:

- Homepage
- Login
- Cars
- Listing creation
- Business
- Support
- Payment
- Admin
- Mobile
- Error logs

مانیتورینگ 24 تا 48 ساعت اول برای Worker errors، D1 errors، 404، Login failures و Payment failures انجام شود.

---

# ترتیب اجرایی قطعی

1. `A` ممیزی UI/UX
2. `B` Design System/Shell
3. `C` اصلاح صفحات
4. `D` تست جریان‌ها
5. `E` GOLSHAN
6. `F` زرین‌پال
7. `G` اعتماد/SEO/حقوقی
8. `H` امنیت/Performance
9. `I` Staging نهایی
10. `J` Production Gate و لانچ

## نقطه شروع فعلی

**شروع از فاز A: ممیزی ظاهری و ساختاری.**

در این فاز فعلاً کد UI تغییر نمی‌کند؛ ابتدا فهرست صفحات و ماتریس ایرادها تهیه می‌شود، سپس اصلاحات صفحه‌به‌صفحه و کوچک انجام خواهند شد.
