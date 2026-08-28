# راهنمای قطعی ادامه پروژه چاکود برای هوش مصنوعی

آخرین به‌روزرسانی: 2026-08-21

این فایل نقطه شروع اجباری هر گفت‌وگوی جدید است. پروژه نباید از صفر بازسازی شود. ابتدا وضعیت واقعی مخزن و استیجینگ بررسی شود، سپس فقط ادامه همین پروژه انجام شود.

## آخرین تغییر منتشرشده

```text
Date: 2026-08-21
Requested change: یکسان‌سازی کنترل بازگشت در بالای صفحات موبایل
Root cause: بعضی مسیرها متن «بازگشت/برگشت» و بعضی مسیرها نویسه‌های پیکانی متفاوت داشتند و قانون مشترکی برای جهت RTL، اندازه، دسترس‌پذیری و fallback وجود نداشت.
Implementation: کامپوننت مشترک MobileBackButton با آیکون راست‌جهت RTL، aria-label ثابت، focus-visible، نسخه روشن/تیره و fallback امن به صفحه اصلی ساخته شد. هدرهای موبایل نمایشگاه‌ها، کسب‌وکارها، استوری و ناوبری همکاری در فروش به این کنترل متصل شدند.
Affected files:
- app/components/MobileBackButton.tsx
- app/components/MobileBackButton.module.css
- app/businesses/page.tsx
- app/dealerships/DealerDirectoryClient.tsx
- app/stories/[id]/page.tsx
- app/affiliate/AffiliateLandingClient.tsx
- app/affiliate/page.module.css
- tests/mobile-navigation-contract.test.mjs
- AI_HANDOFF.md
Verification:
- TypeScript موفق
- 16/16 تست مرتبط موفق
- Build cPanel/Vinext موفق
PRs: #36
Merge commits: f943a3147886b6767b02199056a1ec09064e9c44
Deployment state: ادغام‌شده در شاخه استیجینگ؛ بررسی آنلاین پس از پایان Workflow لازم است
Online verification: در انتظار پایان انتشار استیجینگ
Exact next action: بررسی آیکون بازگشت در عرض‌های 320، 390 و 430 پیکسل و سپس ادامه یکسان‌سازی هر هدر موبایل جدید با MobileBackButton
```

### آخرین تکمیل صفحه اصلی پس از Snapshot بالا

```text
Date: 2026-08-21
Requested change: امکان انتخاب بیش از ۶ استان و جمع‌وجور کردن فهرست انتخاب‌های موقعیت در موبایل
Root cause: سقف ۶ استان هم در HomeLocationSelector و هم در sanitize مدل home-location تکرار شده بود؛ چیپ‌ها نیز تک‌ردیفی و افقی بودند و انتخاب‌های زیاد از دید خارج می‌شدند.
Implementation: سقف استان‌ها در UI و مدل ذخیره‌سازی به ۳۱ و ظرفیت محدوده‌ها به ۹۶ افزایش یافت. انتخاب‌ها به چیپ‌های چندردیفی فشرده با ارتفاع کنترل‌شده، ضربدر حذف تکی، aria-label اختصاصی و دکمه واضح «حذف همه» تبدیل شدند.
Affected files: app/components/HomeLocationSelector.tsx، app/components/home-location.ts، tests/homepage-contract.test.mjs
Verification: تست قرمز قبل از اصلاح ثبت شد؛ سپس 17/17 تست مرتبط موفق؛ TypeScript موفق؛ Build cPanel/Vinext موفق
PR: #46
Merge commit: 285bc2a40aaa8a6325efacc9311d6c0fc9e96ee2
Deployment state: ادغام‌شده در شاخه استیجینگ؛ بررسی آنلاین پس از پایان Workflow لازم است
Online verification: در انتظار پایان انتشار استیجینگ
Exact next action: انتخاب حداقل ۷ استان در Safari آیفون، حذف تکی یکی از چیپ‌ها، حذف همه و تأیید حفظ انتخاب‌ها پس از اعمال
```

```text
Date: 2026-08-21
Requested change: یکسان‌سازی اسکرول «خودروهای لوکس منتخب» با «خودروهای منطقه آزاد» در موبایل
Root cause: جهت RTL فقط از CSS تأمین می‌شد و ریل پُرِ لوکس در موتورهای لمسی/سافاری رفتار پایدار مشابه ریل کم‌موجودی منطقه آزاد نداشت.
Implementation: ویژگی dir="rtl" مستقیماً روی عنصر مشترک HomeHorizontalRail قرار گرفت و touch-action: pan-x برای gesture افقی پایدار اضافه شد؛ هر دو بخش همچنان از همین کامپوننت و اندازه/فاصله/اسنپ مشترک استفاده می‌کنند.
Affected files: app/components/HomeHorizontalRail.tsx، app/home.css، tests/homepage-contract.test.mjs
Verification: تست قرمز قبل از اصلاح ثبت شد؛ سپس 17/17 تست مرتبط موفق؛ TypeScript موفق؛ Build cPanel/Vinext موفق
PR: #44
Merge commit: bfb4a0ddc0d632728ef83bf60acd5f97cb0656dc
Deployment state: ادغام‌شده در شاخه استیجینگ؛ بررسی آنلاین پس از پایان Workflow لازم است
Online verification: در انتظار پایان انتشار استیجینگ
Exact next action: تست لمسی ریل لوکس در Safari آیفون و تأیید شروع از راست و نمایش کارت بعدی با کشیدن به چپ
```

```text
Date: 2026-08-21
Requested change: شروع همه ریل‌های صفحه اصلی از راست و مشاهده موارد بعدی با حرکت به چپ
Implementation: direction: rtl روی ریل مشترک خودروها، ریل نمایشگاه‌ها و ریل کسب‌وکارها صریح شد تا رفتار به جهت ارث‌رسیده مرورگر وابسته نباشد.
Affected files: app/home.css، app/components/HomeFeaturedShowrooms.module.css، app/components/HomeFeaturedBusinesses.tsx، tests/homepage-contract.test.mjs
Verification: 16/16 تست مرتبط موفق؛ TypeScript موفق؛ Build cPanel/Vinext موفق
PR: #38
Merge commit: 2ca18e351c4afaec49b70f599f4bef2f11fbab55
Deployment state: ادغام‌شده در شاخه استیجینگ؛ بررسی آنلاین پس از پایان Workflow لازم است
Online verification: در انتظار پایان انتشار استیجینگ
Exact next action: بررسی لمسی ریل خودروهای لوکس، منطقه آزاد، نمایشگاه‌ها و کسب‌وکارها در موبایل واقعی
```

```text
Date: 2026-08-21
Requested change: حذف عبارت تزئینی «ویترین نمایشگاه‌ها» از زیر استوری
Implementation: eyebrow و CSS بلااستفاده آن حذف شد و margin بالای عنوان «نمایشگاه‌های منتخب» صفر شد.
Affected files: app/components/HomeFeaturedShowrooms.tsx، app/components/HomeFeaturedShowrooms.module.css، tests/homepage-contract.test.mjs
Verification: 15/15 تست صفحه اصلی موفق؛ TypeScript موفق؛ Build cPanel/Vinext موفق
PR: #40
Merge commit: e0ab46fad7bef4e3fea4b83fda7c6ee3d92e1367
Deployment state: ادغام‌شده در شاخه استیجینگ؛ بررسی آنلاین پس از پایان Workflow لازم است
Online verification: در انتظار پایان انتشار استیجینگ
Exact next action: Hard Refresh موبایل و تأیید نمایش مستقیم عنوان «نمایشگاه‌های منتخب» بدون متن تزئینی بالای آن
```

```text
Date: 2026-08-21
Requested change: جلوگیری از زوم خودکار هنگام تایپ در تمام سایت روی iOS
Root cause: قانون قبلی فقط فیلدهای داخل .appViewport و عرض‌های حداکثر 760px را پوشش می‌داد؛ Portalها و حالت افقی خارج از پوشش بودند.
Implementation: قانون 16px در app/ios-form-runtime.css به تمام inputهای متنی، textarea، select و contenteditable در سند تعمیم یافت؛ محدودیت عرض حذف شد و زوم دستی کاربر محدود نشد.
Affected files: app/ios-form-runtime.css، tests/ios-form-zoom-contract.test.mjs
Verification: تست قرمز قبل از اصلاح ثبت شد؛ سپس 17/17 تست مرتبط موفق؛ TypeScript موفق؛ Build cPanel/Vinext موفق
PR: #42
Merge commit: a62d68fed54d8e40624209688c6bffb90af14626
Deployment state: ادغام‌شده در شاخه استیجینگ؛ بررسی آنلاین پس از پایان Workflow لازم است
Online verification: در انتظار پایان انتشار استیجینگ
Exact next action: تست تمرکز روی جست‌وجوی صفحه اصلی، انتخاب موقعیت Portal و یک فرم حساب در Safari آیفون
```

## شروع سریع در یک چت جدید

هوش مصنوعی باید قبل از هر تغییر این مراحل را به‌ترتیب انجام دهد:

1. این فایل و `AGENTS.md` را کامل بخواند.
2. شاخه `agent/launch-3-local-baseline` را دریافت و وضعیت Git را بررسی کند.
3. `package.json`، فایل‌های مربوط به درخواست و تست‌های قراردادی مرتبط را بخواند.
4. وضعیت زنده `https://staging.chakod.com` را با کد شاخه استیجینگ تطبیق دهد.
5. تغییر را روی یک شاخه مستقل انجام دهد؛ مستقیماً روی شاخه استیجینگ یا `main` کار نکند.
6. TypeScript، تست مرتبط و Build مناسب را اجرا کند.
7. Pull Request را به `agent/launch-3-local-baseline` بسازد و فقط با اجازه مالک ادغام کند.
8. پس از انتشار، نسخه آنلاین را بررسی و همین فایل را با وضعیت جدید به‌روزرسانی کند.

## هویت و مقصدهای پروژه

```text
محصول: چاکود / Chakod
شعار: پلتفرم رشد کسب و کار
Repository: ahmadiyansaeid8700-creator/chakod-car
شاخه فعال استیجینگ: agent/launch-3-local-baseline
آدرس استیجینگ: https://staging.chakod.com
شاخه main: معماری قدیمی‌تر دارد و منبع استیجینگ فعلی نیست
```

نکته حیاتی: ظاهر فعلی استیجینگ از `agent/launch-3-local-baseline` ساخته می‌شود. تغییر صفحه اصلی روی `main` به استیجینگ نمی‌رسد. قبل از هر کار، منبع انتشار دوباره از `.github/workflows/staging-deploy.yml` بررسی شود.

## آخرین نقطه قطعی انتشار

```text
آخرین PR ادغام‌شده مرتبط: #10
Merge commit شاخه استیجینگ: 270bc9ad49edc8a8af4ebf63768496c1826976ef
موضوع: بازطراحی نمایشگاه‌های صفحه اصلی
نتیجه انتشار: موفق
فایل آنلاین جدید:
- HomeFeaturedShowrooms-BJiItoYR.css
- HomeFeaturedShowrooms-DN6yGnyO.js
```

در 2026-08-21 نسخه آنلاین با عبارت‌های `ویترین نمایشگاه‌ها` و `نمایشگاه‌های منتخب چاکود` تأیید شد.

## وضعیت فعلی صفحه اصلی

ترتیب قفل‌شده صفحه اصلی:

1. هدر و جست‌وجوی بازار
2. استوری‌ها، بدون Hero قبل از آن‌ها
3. نمایشگاه‌های منتخب چاکود
4. ریل‌های خودرو مانند خودروهای لوکس و منطقه آزاد
5. ریل کسب‌وکارهای منتخب
6. راهنماها و محتوای تکمیلی

قواعد صفحه اصلی:

- همه ریل‌ها در صفحه اصلی افقی و در موبایل لمسی هستند.
- همه ریل‌ها باید با `direction: rtl` از اولین کارت در سمت راست شروع شوند و موارد بعدی با حرکت به سمت چپ دیده شوند.
- دکمه «مشاهده همه» باید به صفحه فهرست چندردیفی مربوط برود.
- موقعیت پیش‌فرض «سراسر ایران» است و موقعیت انتخابی باید داده ریل‌ها را فیلتر کند.
- بنر تبلیغاتی قدیمی صفحه اصلی حذف شده و نباید برگردد.
- جایگاه «نمایشگاه منتخب» محصول جایگزین بنر است.
- بالای عنوان «نمایشگاه‌های منتخب» نباید eyebrow یا عبارت تزئینی «ویترین نمایشگاه‌ها» دوباره اضافه شود.

### سیاست قفل‌شده موجودی و موقعیت صفحه اصلی

این سیاست مبنای فعلی محصول است و تا دستور صریح مالک نباید تغییر کند:

- فاز فعلی کمبود موجودی است؛ بنابراین همه آگهی‌ها و کسب‌وکارهای فعال و معتبر در صفحه اصلی قابل نمایش هستند.
- خرید «جایگاه ویژه» در فاز فعلی باعث اولویت در مرتب‌سازی می‌شود، نه حذف موارد عادی از صفحه اصلی.
- تغییر به حالت «فقط جایگاه ویژه» فقط زمانی انجام می‌شود که مالک اعلام کند موجودی به حد کافی رسیده است. کلید مرکزی کسب‌وکارها `HOME_BUSINESS_POLICY.visibility` در `app/components/HomeFeaturedBusinesses.tsx` است و مقدار فعلی آن `all` است.
- نمای اولیه و پیش‌فرض مخاطب «سراسر ایران» است.
- پس از انتخاب موقعیت، ترتیب تأمین محتوا چنین است: همان محدوده انتخابی؛ اگر خالی بود همان استان؛ و اگر استان هم خالی بود پیشنهادهای سراسر ایران.
- منبع پیشنهاد باید صادقانه کنار عنوان نوشته شود؛ مورد سراسری نباید با عنوان «نزدیک شما» نمایش داده شود.
- اگر در کل کشور داده معتبر وجود دارد، صفحه اصلی برای یک شهر یا محله کم‌موجودی نباید خالی دیده شود.
- پیشنهاد واقعاً نزدیک براساس فاصله جغرافیایی، نیازمند مختصات معتبر کسب‌وکار و کاربر است و توسعه آینده محسوب می‌شود؛ تا آن زمان نزدیکی اداری محدوده/استان ملاک است.

### آخرین بازطراحی نمایشگاه‌ها

فایل‌های اصلی:

```text
app/components/HomeFeaturedShowrooms.tsx
app/components/HomeFeaturedShowrooms.module.css
app/components/ShowroomCard.tsx
app/components/ShowroomCard.module.css
```

رفتار فعلی:

- سه کارت عمومی و موقت زیر استوری کاملاً حذف شده‌اند.
- داده نمایشگاه‌های منتخب از `/api/featured-showrooms` دریافت می‌شود.
- آگهی‌ها از API عمومی چاکود دریافت و براساس نمایشگاه گروه‌بندی می‌شوند.
- نمایشگاه‌های دارای جایگاه تأییدشده ابتدا نمایش داده می‌شوند.
- نمایشگاه‌های فعال واقعی که جایگاه ویژه ندارند بعد از موارد منتخب می‌آیند.
- نمایشگاه عادی برچسب «فعال» و جایگاه تأییدشده برچسب «منتخب» دارد.
- حالت بارگذاری از Skeleton استفاده می‌کند.
- در خطا یا نبود داده فقط پیام راهنما و لینک فهرست نمایشگاه‌ها نمایش داده می‌شود.
- موبایل یک کارت تقریباً تمام‌عرض را در ریل افقی نشان می‌دهد.

دلیل باگ قبلی: `HomeFeaturedShowrooms` فقط نمایشگاه‌هایی را نگه می‌داشت که شناسه آن‌ها در `placementMap` بود؛ در نتیجه نمایشگاه فعال واقعی مانند «مهر خودرو» از صفحه اصلی حذف می‌شد و سه کارت موقت نمایش داده می‌شد.

## فناوری و معماری اجرایی

```text
Next.js 16 / App Router
React 19
TypeScript
Vinext + Vite
Cloudflare Worker
Drizzle ORM + D1
CSS Modules + CSS عمومی
npm
```

این پروژه Next.js استاندارد آموزشی نیست. قبل از ویرایش APIها یا الگوهای Next، راهنمای نسخه نصب‌شده در `node_modules/next/dist/docs/` خوانده شود.

Buildهای مهم:

```text
npm run check:launch
npm run test:contracts
npm run build:cloudflare
npm run build:cpanel
npm run d1:verify
```

`npm run build` به فایل‌های محیط Sites مانند `.openai/hosting.json` وابسته است. برای کد شاخه استیجینگ، Build واقعی Cloudflare در GitHub Actions با `npm run build:cloudflare` انجام می‌شود. برای کنترل قابل حمل رابط نیز `npm run build:cpanel` قابل استفاده است.

## مسیرها و امکانات موجود

### عمومی

- `/` صفحه اصلی
- `/cars` فهرست خودروها
- `/cars/[id]` جزئیات خودرو
- `/dealerships` فهرست نمایشگاه‌ها
- `/businesses` فهرست کسب‌وکارها
- `/businesses/[slug]` صفحه کسب‌وکار
- `/articles` و مسیرهای مقاله
- `/support`، `/terms`، `/legal` و `/refund-policy`

### حساب و آگهی

- `/account` و `/dashboard`
- `/account/listings/*` ثبت، ویرایش، تصاویر، مدیریت و ارتقای آگهی
- `/account/profile`، `/account/security` و `/account/notifications`
- `/account/saved` و جست‌وجوهای ذخیره‌شده

### کسب‌وکار و نمایشگاه

- `/account/business/*` ساخت و مدیریت کسب‌وکار، رسانه، ساعات، شعب، تیم و تحلیل
- `/account/business/promotions/featured` رزرو جایگاه نمایشگاه منتخب
- `/admin/featured-showrooms` بررسی و تأیید جایگاه‌ها
- `/api/featured-showrooms` خروجی عمومی جایگاه‌های تأییدشده و فعال

### مالی

- کیف پول، پرداخت، فاکتور، سفارش، بازپرداخت، اشتراک و محصولات Commerce
- Checkout واحد برای سفارش موجود
- Verify سمت سرور و Idempotency برای جلوگیری از پرداخت تکراری
- جایگاه نمایشگاه پس از پرداخت وارد `pending_review` می‌شود و نیازمند تأیید مدیر است

### دستیار چاکود

- دستیار در Layout سراسری نصب است.
- در نبود کلید یا خرابی سرویس ابری، هسته آفلاین Rule-based پاسخ می‌دهد.
- اطلاعات حساس ورود، Token و پرداخت نباید وارد گفتگو یا Git شوند.

## وضعیت تست تأییدشده آخرین تغییر

برای بازطراحی نمایشگاه‌ها در 2026-08-21:

```text
TypeScript: موفق
تست‌های مرتبط: 16/16 موفق
Build cPanel/Vinext: موفق
Build و Deploy استیجینگ: موفق از GitHub Actions
Smoke verification آنلاین: موفق
```

مجموعه کامل `test:contracts` در بررسی قبلی 54/54 موفق بود. این عدد برای تغییر بعدی تضمین نیست و باید دوباره اجرا شود.

## قواعد امنیتی و توسعه

- Secret، Token، Password، کلید خصوصی، `.env` واقعی یا اطلاعات اتصال Commit نشود.
- مبلغ محصولات از مرورگر پذیرفته نشود؛ مبلغ canonical باید از سمت سرور تعیین شود.
- Routeهای خصوصی باید احراز هویت و Routeهای مدیریت باید نقش مدیر را بررسی کنند.
- URL و ورودی کاربر بدون اعتبارسنجی وارد Fetch، Redirect، HTML یا Query نشود.
- از `dangerouslySetInnerHTML`، `eval` و ساخت Command از ورودی کاربر استفاده نشود.
- Migrationهای D1 حذف یا بازنویسی نشوند؛ Migration جدید افزایشی باشد.
- `npm audit fix --force` بدون بررسی اثر Breaking Change اجرا نشود.
- تغییرات نامرتبط کاربر در Worktree حفظ شوند.
- ادعای «رفع شد»، «تست شد» یا «منتشر شد» فقط با خروجی تازه و قابل مشاهده بیان شود.

### قانون قفل‌شده بازگشت در موبایل

- کنترل بازگشت در هدر موبایل باید از `app/components/MobileBackButton.tsx` استفاده کند.
- متن دیداری «بازگشت/برگشت» یا نویسه‌های دستی مانند `‹` و `←` در هدر موبایل جدید ساخته نشود.
- در رابط RTL آیکون به سمت راست است؛ برچسب دسترس‌پذیری آن «بازگشت به صفحه قبل» باقی می‌ماند.
- اگر history قابل بازگشت وجود نداشته باشد، `fallbackHref` معتبر داخلی استفاده شود؛ مقدار پیش‌فرض `/` است.
- نسخه تیره فقط با `tone="dark"` استفاده شود و اندازه/فوکوس از CSS مشترک تغییر داده نشود مگر با نیاز مستند همان صفحه.

### قانون قفل‌شده جلوگیری از زوم فرم در iOS

- `app/ios-form-runtime.css` مرجع سراسری فیلدهای تایپی iOS است و باید در Root Layout باقی بماند.
- اندازه محاسبه‌شده input متنی، textarea، select و contenteditable در iOS نباید کمتر از 16px شود؛ Portalها نیز باید پوشش داده شوند.
- برای حل این مسئله `user-scalable=no` یا `maximum-scale=1` اضافه نشود، چون زوم دستی و دسترس‌پذیری کاربر را محدود می‌کند.

## روش انتشار استیجینگ

Workflow: `.github/workflows/staging-deploy.yml`

Trigger:

```yaml
push:
  branches:
    - agent/launch-3-local-baseline
```

روند صحیح:

1. شاخه Feature از آخرین Commit استیجینگ ساخته شود.
2. فقط فایل‌های مربوط تغییر کنند.
3. `git diff --check`، TypeScript، تست مرتبط و Build اجرا شوند.
4. PR با Base برابر `agent/launch-3-local-baseline` ساخته شود.
5. پس از اجازه مالک، PR ادغام شود.
6. Workflow استیجینگ منتظر بماند تا موفق شود.
7. HTML و Hash فایل‌های Asset آنلاین بررسی شوند.
8. در موبایل Hard Refresh یا حالت ناشناس برای حذف Cache استفاده شود.

`main` منبع استیجینگ فعلی نیست. PR اشتباه به `main` ممکن است موفق ادغام شود ولی هیچ تغییری در `staging.chakod.com` ایجاد نکند.

## اسناد مرجع و ترتیب اعتبار

1. `AI_HANDOFF.md` — وضعیت عملیاتی و نقطه ادامه فعلی
2. `AGENTS.md` — قواعد اجباری عامل
3. کد و تست‌های شاخه استیجینگ — حقیقت اجرایی
4. `docs/HOMEPAGE-STRUCTURE-LOCK-FA.md` — قرارداد صفحه اصلی
5. `docs/APPROVED-LAUNCH-DECISIONS-FA.md` — تصمیم‌های محصول
6. `docs/MASTER-SITEMAP-FA.md` — مسیرهای canonical
7. `docs/PROJECT-CHECKLIST-FA.md` — چک‌لیست کلی
8. `PROJECT_CONTEXT.md` و `TODO.md` — تاریخچه؛ ممکن است بخش‌های قدیمی داشته باشند

در تعارض بین سند قدیمی و کد/تست فعلی، ابتدا تناقض گزارش شود. سند قدیمی نباید باعث برگرداندن قابلیت حذف‌شده یا معماری قدیمی شود.

## کار بعدی پیشنهادی

اولویت بعدی پس از این Snapshot:

1. تست بصری واقعی بازطراحی نمایشگاه‌ها در چند عرض موبایل و دسکتاپ با داده زنده.
2. بررسی اینکه «مهر خودرو» و سایر نمایشگاه‌های فعال، `dealer_name` و `dealer_id` معتبر در API آگهی دارند.
3. بررسی لینک کارت نمایشگاه؛ اگر `dealer_slug` موجود است باید به `/businesses/[slug]` برود.
4. سپس ادامه تکمیل صفحه اصلی از بخش بلافاصله بعد از نمایشگاه‌ها، بدون تغییر دوباره ساختار قفل‌شده.

## قالب اجباری پایان هر جلسه

```text
Date: 2026-08-24
Requested change: ایجاد نسخه پایه حرفه‌ای پنل مدیریت با حفظ همه مسیرها و امکانات فعلی
Affected routes/files: تمام مسیرهای /admin از طریق app/admin/layout.tsx، پوسته جدید AdminShell و تست قراردادی آن
Tests actually run: admin-shell-contract، route-access و public-business-contract موفق؛ TypeScript و Build به‌علت خرابی نصب npm در محیط محلی هنوز باید در GitHub Actions اجرا شوند
PR and merge commit: شاخه codex/staging-admin-ux-baseline؛ PR در حال آماده‌سازی و هنوز ادغام نشده
Deployment result: منتشر نشده
Online verification: انجام نشده
Open issue: جریان ثبت کسب‌وکار جدید هنوز باید از D1 حساب به صف تأیید مدیریت، رسانه و API عمومی یکپارچه شود
Exact next action: اجرای CI روی PR، سپس یکپارچه‌سازی صف تأیید کسب‌وکار و آلبوم/پوستر در مرحله بعد همین نسخه پایه
```

```text
Date: 2026-08-24
Requested change: رفع گم‌شدن تعمیرکار ثبت‌شده و اتصال آلبوم/پوستر به انتشار عمومی
Affected routes/files: /admin/businesses، /api/admin/account-activities، /api/businesses، /api/business-resumes/[id] و ویرایشگر رزومه کسب‌وکار
Tests actually run: 11/11 تست admin-shell، native-business-moderation، route-access و public-business موفق؛ git diff --check موفق
PR and merge commit: ادامه PR #65؛ هنوز ادغام نشده
Deployment result: منتشر نشده
Online verification: انجام نشده
Open issue: TypeScript و Build باید در CI مخزن اجرا شوند؛ نصب npm محیط محلی خراب بود
Exact next action: ارسال Commit به PR #65، بررسی CI و رفع هر خطای Workflow پیش از درخواست ادغام
```

قبل از پایان کار، همین فایل با اطلاعات زیر به‌روزرسانی شود:

```text
Date:
Requested change:
Affected routes/files:
Tests actually run:
PR and merge commit:
Deployment result:
Online verification:
Open issue:
Exact next action:
```

اگر تغییر هنوز منتشر نشده، صریحاً «فقط محلی»، «در PR» یا «ادغام‌شده ولی منتشرنشده» ثبت شود؛ این حالت‌ها نباید با «روی سایت فعال است» اشتباه شوند.

```text
Date: 2026-08-26
Requested change: پرکردن امن بخش‌های تست افتتاح شامل استوری، آگهی خودرو، نمایشگاه، کسب‌وکار و کف بازار با تصویر کم‌حجم
Affected routes/files: صفحه اصلی، /api/market-floor/public، lib/prelaunch-fixtures.ts، .env.example و تست قرارداد fixture
Tests actually run: 24/24 تست homepage و prelaunch-fixtures موفق؛ git diff --check موفق؛ TypeScript/Build به‌علت خرابی دریافت بسته‌های npm در محیط محلی اجرا نشد
PR and merge commit: شاخه codex/prelaunch-test-accounts؛ هنوز ادغام نشده
Deployment result: منتشر نشده؛ فلگ‌ها به‌صورت پیش‌فرض خاموش هستند
Online verification: انجام نشده
Open issue: اجرای TypeScript و Build در GitHub Actions و فعال‌سازی موقت دو فلگ فقط روی محیط تست لازم است
Exact next action: Push شاخه، ساخت PR به agent/launch-3-local-baseline، بررسی CI و سپس فعال‌سازی موقت NEXT_PUBLIC_PRELAUNCH_FIXTURES و PRELAUNCH_FIXTURES روی استیجینگ با اجازه مالک
```


```text
Date: 2026-08-28
Requested change: افزودن Gate ایمن برای Build واقعی Production Worker بدون Deploy، DNS، D1 mutation یا استفاده از Secret
Affected routes/files: .github/workflows/launch-3-checks.yml و AI_HANDOFF.md
Tests actually run: GitHub Actions run 33178395639 موفق؛ check:launch، D1 verify، critical audit، preflight build، production Worker build contract و runtime smoke همگی PASS
PR and merge commit: PR #125 روی شاخه gate/production-build-readiness-2026-08-28؛ CI سبز و ادغام هنوز انجام نشده است
Deployment result: منتشر نشده؛ این Gate فقط Build است و هیچ دستور deploy ندارد
Online verification: انجام نشده؛ تغییر Runtime یا دامنه‌ای وجود ندارد
Open issue: Token فعلی Cloudflare برای D1 inventory پاسخ 401 می‌دهد و Worker تولیدی chakod-car در Audit فقط IMAGES binding دارد؛ نام و شناسه D1 تولیدی نباید حدس زده شود
Exact next action: ادغام PR #125، تأیید Deploy و Smoke استیجینگ، سپس دریافت مجوز D1 Read/Edit برای شناسایی یا ساخت دیتابیس تولیدی
```
