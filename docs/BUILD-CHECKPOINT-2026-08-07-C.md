# Checkpoint ساخت سایت چاکود — 2026-08-07 C

این فایل نقطه بازیابی فعلی پروژه است. گزارش کامل ممیزی لانچ در `docs/LAUNCH-READINESS-AUDIT-2026-08-07.md` نگهداری می‌شود.

## مرجع ادامه

- Repository: `ahmadiyansaeid8700-creator/chakod-car`
- Working branch: `agent/launch-3-local-baseline`
- Base: `backup-latest-2026-08-03`
- Draft CI PR: `#6` فقط برای Checkها؛ Merge نشود.
- `main` بدون تایید صریح مالک تغییر نکند.
- لپ‌تاپ تا زمان Staging/Migration/E2E لازم نیست.

## قرارداد قفل‌شده صفحه اول

1. Stories
2. Featured Showrooms
3. Luxury Cars
4. Free-zone Cars
5. Top Car Services
6. Top Parts Stores
7. Top Repair Shops

- Railها افقی و Responsive هستند.
- `نمایش همه` به Grid مربوط می‌رود.
- Location مشترک روی سکشن‌های صفحه اول اعمال می‌شود.
- بنر نمایشگاهی صفحه اول حذف شده و نباید برگردد.
- محصول پولی صفحه اول: `جایگاه نمایشگاه منتخب`.

## وضعیت ساخت محصول

قابلیت‌های اصلی Repository ساخته شده‌اند و تا زمان Integration نهایی با `[~]` در نظر گرفته می‌شوند:

- [~] ثبت/ویرایش/تصاویر/مدیریت lifecycle/ارتقا/تمدید آگهی
- [~] ذخیره آگهی، گزارش، آگهی مشابه، مقایسه و جست‌وجوی ذخیره‌شده
- [~] کیف پول، سفارش، idempotency، Checkout، Gateway callback/verify، فاکتور
- [~] نمایشگاه منتخب: رزرو، ظرفیت، پرداخت، تایید مدیر، نمایش در Rail
- [~] جایگاه کسب‌وکار
- [~] Refund کاربر/ادمین و Wallet refund
- [~] پشتیبانی واقعی مهمان/کاربر/ادمین
- [~] اعلان‌ها، پروفایل، امنیت، logout/auth callback
- [~] چندنمایشگاهی canonical زیر `/account/business`
- [~] Affiliate/Ambassador
- [~] CMS مقالات و Admin Articles
- [~] پنل‌های مالی/Commerce/Support/Featured Showrooms/Admin Access
- [~] SEO/Sitemap/Robots/Manifest
- [~] هوش چاکود با Offline fallback و محدودیت درخواست

## نتیجه ممیزی کامل Repository

- 128 page route کشف شد.
- 288 فایل Source داخل `app/` اسکن شد.
- 482 مقصد Navigation داخلی literal بررسی شد.
- Dead internal destination: `0`
- لینک خالی / `#` / `javascript:`: `0`
- `type=button` بی‌Handler: `0`
- `a` / `Link` بدون `href`: `0`
- Placeholder واقعی لانچ: `0`
- 104 صفحه Static روی Runtime واقعی Portable Vinext smoke شدند؛ همه 2xx/redirect سالم.
- 23 Route داینامیک برای E2E واقعی به ID/slug/data Staging نیاز دارند.
- TypeScript Launch: PASS
- Contract tests: `43/43 PASS`
- Portable production bundle: PASS
- Portable runtime smoke: PASS
- Manifest/Robots/Sitemap XML: PASS
- Chakod AI offline runtime: PASS

## Cleanupهای مهم ممیزی

- Backupهای قدیمی Submit از `app/` حذف شدند.
- پنل/API بنر صفحه اول Legacy بازنشسته شد؛ API ساخت قدیمی `410 Gone` است و `demo_paid` حذف شد.
- Commerce UI دیگر محصول/تب فعال بنر صفحه اول نشان نمی‌دهد.
- `/dashboard` قدیمی به `/account` منتقل شد.
- `/dealers/[dealerId]` قدیمی به پنل canonical کسب‌وکار منتقل شد.
- Routeهای Affiliate و صف‌های Admin به هاب‌های canonical وصل شدند.
- `/admin/legal` و `/admin/locations` ساخته شدند.
- `/admin/pricing` به Commerce canonical وصل شد.
- Admin placeholder «در حال ساخت» حذف و به Audit Logs واقعی وصل شد.
- CTAهای تماس/واتساپ/نقشه پروفایل کسب‌وکار در برابر داده خالی ایمن شدند.
- Sitemap dynamic fetch به timeout کوتاه و fallback معتبر مجهز شد.

## امنیت Dependency نهایی

نسخه‌های تاییدشده:

- Next `16.3.0`
- React `19.2.8`
- React DOM `19.2.8`
- react-server-dom-webpack `19.2.8`
- Vite `8.1.5`
- `@cloudflare/vite-plugin` `1.51.1`
- Wrangler `4.120.0`
- Vinext `0.0.50`

Audit:

- Critical: `0`
- High: `0`
- Moderate: `4`
- Low: `0`

هیچ `npm audit fix --force` اجرا نشده است.

## تنها Route مصوب مفقود

- [!] `/admin/users`

این Route در Master Sitemap وجود دارد ولی هیچ Backend contract معتبر برای فهرست همه کاربران در Repository یا شاخه‌های قبلی بررسی‌شده پیدا نشد. صفحه جعلی ساخته نشود. یا Backend واقعی اضافه شود یا مالک محصول صریحا آن را از Scope لانچ حذف کند.

## Blockerهای واقعی قبل از Production Launch

- [!] Wallet Settlement واقعی در Backend خارجی + Secret/Endpoint واقعی
- [!] Bank Refund واقعی در Backend درگاه + Secret/Endpoint واقعی
- [!] `/admin/users` یا تصمیم حذف از Scope
- [ ] اجرای Migration روی D1 غیرتولیدی و بررسی داده
- [ ] Official Sites Build در محیط واقعی Hosting
- [ ] Staging E2E با OTP/session، آگهی داینامیک، Gateway، Wallet، Refund، Featured Showrooms، CMS و Admin access

موارد غیرمسدودکننده:

- Event tracking تماس/WhatsApp/مسیریابی
- Draft server-side آگهی قبل از Submit
- کاهش 4 Moderate tooling در صورت امکان بدون Breaking Change

## حکم فعلی

Repository از نظر ساختار داخلی، لینک/CTA، TypeScript، Contract، Bundle و Portable Runtime بسیار نزدیک به نهایی است، اما هنوز Production Launch نشود تا Blockerهای بالا بسته شوند.

## قانون ادامه

اگر گفت‌وگو قطع شد، ادامه از این فایل و `docs/LAUNCH-READINESS-AUDIT-2026-08-07.md` روی شاخه `agent/launch-3-local-baseline` انجام شود و هیچ قابلیت ساخته‌شده از صفر بازسازی نشود.
