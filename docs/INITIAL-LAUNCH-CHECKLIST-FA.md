# چک‌لیست اجرای اولیه چاکود

> این سند فقط وضعیت محصول فعلی را پوشش می‌دهد. قابلیت‌های حذف‌شده مثل Affiliate مستقل، Ambassador و Banner Reservation جزو Launch نیستند.

## 1. Repository / Branch
- [ ] کار روی Branch تأییدشده انجام شده باشد.
- [ ] `main` بدون تأیید صریح مالک تغییر نکرده باشد.
- [ ] فایل Backup تاریخی یا Scaffold آزمایشی داخل Runtime باقی نمانده باشد.

## 2. Dependency / TypeScript
- [ ] `npm ci` موفق باشد.
- [ ] `npx tsc --noEmit -p tsconfig.launch.json` موفق باشد.
- [ ] dependencyهای High/Critical با `npm audit` ثبت و جداگانه بررسی شوند؛ `npm audit fix --force` کور اجرا نشود.

## 3. تست‌های Route
- [ ] Login return-to tests
- [ ] Route access tests
- [ ] Car route tests
- [ ] Listing route tests

مسیرهای canonical مورد انتظار:

```text
/
/cars
/cars/luxury
/cars/free-zone
/cars/[slug]
/dealerships
/businesses
/businesses/[slug]
/account
```

Redirectهای Legacy باید سبک و بدون implementation موازی باشند:

```text
/ads*
/listing/*
/dashboard*
/dealers*
/showrooms*
```

## 4. AI / Moderation
- [ ] Chakod AI Manager Config tests
- [ ] Provider Adapter tests
- [ ] Read-only Tool Executor tests
- [ ] Listing Moderation policy tests
- [ ] AI Manager بدون config صریح Fail-closed باشد.
- [ ] هیچ Write Action خودکار فعال نباشد.

## 5. Build
- [ ] `scripts/build-verified.sh` executable باشد.
- [ ] `scripts/validate-artifact.sh` executable باشد.
- [ ] `npm run build` موفق باشد.
- [ ] Artifact validation موفق باشد.

## 6. Smoke محلی
- [ ] `/`
- [ ] `/cars`
- [ ] `/dealerships`
- [ ] `/login`
- [ ] `/admin` بدون Session محافظت شود.
- [ ] `/admin/ai` بدون Session محافظت شود.
- [ ] APIهای AI Manager بدون Admin Session داده مدیریتی برنگردانند.

## 7. Backend / Hosting
- [ ] API روی `api.chakod.com` از Document Root مستقل اجرا شود.
- [ ] secrets خارج از Document Root و خارج از Git باشند.
- [ ] DB connection موفق باشد.
- [ ] OTP واقعی تست شود.
- [ ] Session creation تست شود.
- [ ] `/api/auth/me` تست شود.
- [ ] Profile / Listing / Upload smoke شوند.

## 8. Referral
- [ ] `/r/[code]` attribution دعوت را ثبت کند.
- [ ] Commerce کد دعوت را برای خرید واجد شرایط ارسال کند.
- [ ] هیچ عضویت Affiliate/Ambassador جداگانه‌ای وجود نداشته باشد.

## 9. Release
- [ ] Regression کامل سبز باشد.
- [ ] Build واقعی سبز باشد.
- [ ] Smoke استیجینگ سبز باشد.
- [ ] فقط بعد از تأیید صریح مالک، تصمیم درباره `main` گرفته شود.
