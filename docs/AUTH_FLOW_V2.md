# Chakod — Auth & Onboarding Flow V2

Status: APPROVED PRODUCT FLOW / IMPLEMENTATION CONTRACT

## اصل اصلی

چاکود فقط **یک مسیر ورود** دارد. ثبت‌نام و ورود با شماره موبایل در همان Flow انجام می‌شوند.

ورود جداگانه برای بازاریاب، کسب‌وکار، نمایشگاه، ادمین یا سایر نقش‌ها ساخته نمی‌شود. نوع حساب و Role/Permission بعد از احراز هویت از Backend تعیین می‌شود.

## Flow نهایی

### مرحله ۱ — شماره موبایل

- شماره موبایل ایران دریافت شود.
- ارقام فارسی/عربی Normalize شوند.
- فرمت معتبر: `09xxxxxxxxx`.
- کاربر قوانین/حریم خصوصی/سیاست‌های لازم را صریحاً می‌پذیرد.
- سپس OTP ارسال می‌شود.

صفحه باید Mobile First، کوتاه و بدون انتخاب نوع حساب یا گزینه‌های اضافی باشد.

### مرحله ۲ — OTP

- کد یک‌بارمصرف دریافت شود.
- Resend دارای Countdown و Rate Limit سمت Backend باشد.
- پس از Verify موفق، Backend Session معتبر ایجاد کند.
- Session Token تولیدی نباید به‌عنوان منبع احراز هویت داخل LocalStorage نگهداری شود؛ Cookie امن/HttpOnly باید منبع اصلی Session باشد.
- Client برای تشخیص هویت/Role/Permission از endpoint معتبر Session/`/api/auth/me` استفاده کند.

### مرحله ۳ — تشخیص کاربر کامل یا ناقص

بعد از Verify:

#### کاربر موجود با Profile کامل

- اگر `returnTo` امن و داخلی وجود دارد، به همان مسیر برگردد.
- در غیر این صورت مقصد پیش‌فرض Account V2 باشد.

#### کاربر جدید یا Profile ناقص

به Onboarding کوتاه Account V2 هدایت شود، نه `/account` قدیمی.

مقصد پیشنهادی:

`/account-v2/profile?complete=1`

## Onboarding کوتاه

فقط اطلاعات ضروری برای شروع گرفته شود:

1. نام و نام خانوادگی
2. نوع حساب
   - شخصی
   - نمایشگاه خودرو
   - فروشگاه قطعات
   - تعمیرگاه
   - مرکز خدمات خودرو
3. کد دعوت/معرف — اختیاری و فقط در صورت داشتن کد

اطلاعات حرفه‌ای کسب‌وکار، آدرس کامل، شبکه اجتماعی، ساعات کاری و سایر جزئیات در مرحله ورود گرفته نشوند و بعداً در Business Profile تکمیل شوند.

## کد دعوت در ورود

کد دعوت نباید صفحه اول Login را شلوغ کند.

- فقط برای کاربر جدید/ناقص در Onboarding گزینه کم‌اولویت `کد معرف دارید؟` نمایش داده شود.
- اعتبارسنجی کد فقط سمت Backend انجام شود.
- Self-referral ممنوع باشد.
- Referral policy مستقل طبق `docs/REFERRAL_REWARDS.md` اجرا شود.

## Role و Workspace

`account_type` و Role دو مفهوم جدا هستند.

پس از Login، Backend باید Role/Permissionهای معتبر را برگرداند. UI صرفاً بر اساس Permission صریح Workspaceها را نمایش دهد.

نمونه‌ها:

- User عادی → Account V2
- Business account → Account V2 + Business Profile
- Sales Partner فعال → Account V2 + `فروش و درآمد`
- Admin → Admin Workspace در صورت Permission معتبر

هیچ Role از LocalStorage، URL، account_type یا حدس Client استخراج نشود.

## همکاری در فروش

`همکاری در فروش` مسیر Login مستقل ندارد.

کاربر ابتدا با Login عادی وارد می‌شود، سپس از Account V2 درخواست همکاری می‌دهد. بعد از تأیید Admin و Refresh Session/Logout-Login، Permission جدید از Backend دریافت و Workspace `فروش و درآمد` فعال می‌شود.

جزئیات طبق `docs/SALES_PARTNER_WORKFLOW.md`.

## Redirect Policy

- `returnTo` فقط مسیر داخلی و امن باشد.
- کاربر ناقص همیشه قبل از مقصدهای عادی به Onboarding هدایت شود.
- بعد از تکمیل Onboarding، مقصد ذخیره‌شده امن در صورت وجود قابل بازیابی است.
- مسیر قدیمی `/account?complete=1` باید از Flow جدید حذف شود و به Account V2 مهاجرت کند.

## Session Security

هدف نهایی:

- Cookie امن/HttpOnly منبع احراز هویت باشد.
- Session Token تولیدی در Production داخل LocalStorage ذخیره نشود.
- اطلاعات نمایشی Client در صورت Cache شدن هرگز منبع Authorization نباشند.
- `/api/auth/me` یا Session endpoint منبع حقیقت User/Role/Permission باشد.
- Logout باید Session سرور/Cookie را invalidate کند.
- Mutationهای حساس Cross-Site/CSRF protection داشته باشند.

### Migration Rule

در کد فعلی Login، `session_token` هنوز در LocalStorage نوشته می‌شود. حذف آن فقط بعد از بررسی تمام مصرف‌کننده‌های Legacy انجام شود تا Login/Panelها شکسته نشوند. این Migration باید یک تغییر مستقل و قابل تست باشد؛ Patch ناقص مجاز نیست.

## UX نهایی موبایل

Login فقط سه تجربه قابل مشاهده دارد:

1. `شماره موبایل`
2. `کد تأیید`
3. `خوش آمدید / انتقال`

Onboarding صفحه/مرحله بعدی و مستقل است.

در Login نباید گزینه‌هایی مثل «ورود بازاریاب»، «ورود نمایشگاه»، انتخاب Account Type، فرم اطلاعات کسب‌وکار یا اطلاعات بانکی نمایش داده شوند.

## Definition of Done

Flow ورود زمانی بسته محسوب می‌شود که:

- OTP موجود روی Staging سالم باشد.
- کاربر قدیمی بعد از Login به مقصد صحیح برسد.
- کاربر جدید به Account V2 onboarding برود.
- `returnTo` امن حفظ شود.
- Account Type در Onboarding ذخیره شود.
- Referral code اختیاری Backend-validated باشد.
- Role/Permission بعد از Login از Backend خوانده شود.
- مسیر `/account?complete=1` از Login حذف شده باشد.
- Migration حذف Production session token از LocalStorage بدون شکستن Legacy کامل شده باشد.
- Logout/Login Role جدید Sales Partner را صحیح Refresh کند.
