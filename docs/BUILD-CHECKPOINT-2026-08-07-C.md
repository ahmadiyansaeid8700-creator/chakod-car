# Checkpoint ساخت سایت چاکود — 2026-08-07 C

این فایل نقطه بازیابی جدید پروژه بعد از انتقال ادامه گفتگوی قبلی است.

## مرجع ادامه

- Repository: `ahmadiyansaeid8700-creator/chakod-car`
- Working branch: `agent/launch-3-local-baseline`
- Base: `backup-latest-2026-08-03`
- Draft CI PR: `#6` فقط برای اجرای Checkها؛ Merge نشود.
- `main` بدون تایید مالک تغییر نکند.
- ابتدا ساخت کامل سایت، سپس Migration/Build/Staging و تست جامع.
- تمام قابلیت های ساخته شده و هنوز Runtime تست نشده با `[~]` ثبت می شوند.

## قرارداد قطعی صفحه اول

ترتیب صفحه اصلی از نظر ساختار و Responsive قفل است:

1. Stories
2. Featured Showrooms
3. Luxury Cars
4. Free-zone Cars
5. Top Car Services
6. Top Parts Stores
7. Top Repair Shops

تمام Railها افقی هستند و `نمایش همه` به صفحه Grid مربوط می رود.

### نمایشگاه منتخب

- بنر نمایشگاهی صفحه اول حذف شده و نباید برگردد.
- محصول پولی جایگزین: `جایگاه نمایشگاه منتخب`.
- فرایند: نمایشگاه → استان → بازه تاریخ → ظرفیت → مبلغ → تخفیف → سفارش → Checkout → کیف پول/درگاه → Verify → تایید مدیر → نمایش در Rail منتخب.
- کارت از اطلاعات واقعی نمایشگاه و خودروهای فعال آن ساخته می شود و آپلود بنر وجود ندارد.

## وضعیت ساخته شده

- [~] ثبت و مدیریت کامل آگهی، تصاویر، ویرایش، ارتقا، فروخته شد، توقف، بازفعال سازی، حذف/بایگانی و تمدید Commerce
- [~] گزارش آگهی و گزارش کسب و کار به تیکت واقعی پشتیبانی
- [~] آگهی های مشابه
- [~] کیف پول، سفارش امن، idempotency، Checkout، درگاه، Callback/Verify، فاکتور و چاپ
- [~] نمایشگاه منتخب با رزرو، پرداخت، صف بررسی و تایید/رد مدیر
- [~] جایگاه کسب و کار با انتخاب مجموعه، کنترل مالکیت و Checkout امن
- [~] بازپرداخت کاربر و مدیریت مالی، Refund کیف پول و Adapter بانکی
- [~] پشتیبانی مهمان/کاربر، گفت و گو، شماره پیگیری و پنل ادمین
- [~] اعلان های حساب برای آگهی، پرداخت، بازپرداخت و پشتیبانی
- [~] صفحات قانونی و عمومی
- [~] راهنمای قیمت، مقایسه خودرو و جست و جوهای ذخیره شده
- [~] پروفایل عمومی کسب و کار، تیم نمایشگاه و ابزارهای حرفه ای موجود
- [~] همکاری در فروش کاربر و ادمین با API canonical
- [~] مجله عمومی و CMS مقالات D1 + `/admin/articles`
- [~] Sitemap/robots canonical و Migrationهای Drizzle تا CMS
- [~] Route cleanup و Shared Header داخلی
- [~] هاب های مدیریت مالی، تبلیغات، نمایشگاه منتخب، پشتیبانی، محتوا و Access Manager
- [~] چندنمایشگاهی از Route قدیمی `/dealers` به مسیر canonical `/account/business/dealers` منتقل شد.
- [~] API داخلی امن `/api/auth/dealers` قرارداد `my-dealers.php` را نگه می دارد و ورودی ساخت نمایشگاه را سمت سرور محدود می کند.
- [~] Route قدیمی `/dealers` فقط Redirect سازگاری است؛ مدیریت اعضا و عملکرد از `/account/business` انجام می شود.
- [~] لینک خراب قدیمی `/dealers/[id]` از جریان canonical حذف شد؛ مرکز فرمان خودش بین نمایشگاه های کاربر سوییچ می کند.
- [~] متن Legacy «رزرو بنر» از مرکز فرمان حذف و CTAهای «نمایشگاه های من» و «نمایشگاه منتخب» جایگزین شدند.
- [~] «هوش چاکود» سراسری است و `/api/ai/assistant` دارای Offline fallback، Cloud fallback، Rate Limit، محدودیت اندازه درخواست و no-store است.
- [~] Workflow `Launch 3 checks` و دستور واحد `npm run check:launch` ساخته شدند.

## CI و Contractهای Launch

Contractهای فعلی:

- `tests/homepage-contract.test.mjs`
- `tests/dealer-directory-contract.test.mjs`
- `tests/ai-assistant-contract.test.mjs`
- `tests/finance-commerce-contract.test.mjs`
- `tests/featured-showroom-contract.test.mjs`
- `tests/local-development-login.test.mjs`
- `tests/local-development-session.test.mjs`
- `tests/local-public-api.test.mjs`
- `tests/route-access.test.mjs`

### نتیجه واقعی GitHub Actions

- [x] TypeScript با `tsconfig.launch.json` بدون خطا اجرا شد.
- [x] Contract Testهای Homepage، چندنمایشگاهی، هوش چاکود، مالی/Commerce و نمایشگاه منتخب اجرا و موفق شدند.
- [x] تست Homepage با Route canonical `/dealerships` همگام شد و تست قدیمی `/showrooms` حذف شد.
- [x] تست های قدیمی TypeScript با Node 22 و `--experimental-strip-types` قابل اجرا شدند.
- [x] خطای TypeScript دسترسی CMS مقاله با Narrowing صریح Identity اصلاح شد.
- [x] Run شماره 22 GitHub Actions برای `Launch 3 checks` با نتیجه `success` بسته شد.

Runtime/Build/Staging هنوز در این نتیجه پوشش داده نشده اند.

## موارد Backend-dependent که نباید حدسی پیاده شوند

- [!] Wallet Settlement واقعی در Backend خارجی
- [!] Refund بانکی واقعی در Backend درگاه
- [!] API فهرست تمام کاربران برای `/admin/users`
- [!] Track تماس/واتساپ/مسیریابی کسب و کار در Backend
- [!] Draft سروری آگهی قبل از Submit؛ فرم ثبت موجود بزرگ و حساس است و بدون تست محلی با جایگزینی کامل فایل دستکاری نشود.

## وضعیت فعلی فاز

ساخت قابلیت های اصلی داخل این Repository تقریبا بسته شده و Source/TypeScript Contract Gate سبز است. از این نقطه تغییرات جدید باید یا:

1. Hardening امنیتی کم ریسک باشند؛ یا
2. نتیجه خطای واقعی Migration/Build/Runtime را رفع کنند؛ یا
3. وابستگی Backend خارجی قطعی و مستند داشته باشند.

صفحه اصلی قفل است و برای Hardening طراحی یا ترتیب آن تغییر نکند.

## گام بعدی

- [x] `npm run check:launch` روی GitHub Actions سبز شد.
- [ ] Gate آسیب پذیری Critical وابستگی ها در CI.
- [ ] بررسی Migration روی دیتابیس غیرتولیدی.
- [ ] Build/Staging و تست جامع جریان های محصول.

## قانون ادامه

اگر گفت و گو قطع شد، ادامه از همین فایل و شاخه `agent/launch-3-local-baseline` انجام شود و هیچ قابلیت ساخته شده دوباره از صفر پیاده نشود.
