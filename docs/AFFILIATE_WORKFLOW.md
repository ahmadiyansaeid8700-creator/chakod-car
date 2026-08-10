# Chakod — Affiliate Discount-Code Workflow

Status: APPROVED ARCHITECTURE / IMPLEMENTATION CONTRACT

این سند مدل افیلیت چاکود را تعریف می‌کند. Affiliate یک `account_type` نیست؛ یک نقش/مجوز تکمیلی روی حساب موجود کاربر است و فقط توسط مدیر/ادمین فعال می‌شود.

## مدل اصلی و محدوده محصول

Affiliate چاکود فقط بر پایه **کد تخفیف اختصاصی** کار می‌کند:

1. کاربر درخواست همکاری ارسال می‌کند.
2. ادمین درخواست را بررسی و در صورت تأیید نقش Affiliate را فعال می‌کند.
3. سیستم/ادمین یک کد تخفیف اختصاصی به Affiliate می‌دهد.
4. Affiliate کد را به دیگران معرفی می‌کند.
5. مشتری هنگام خرید معتبر در چاکود کد را وارد می‌کند و تخفیف می‌گیرد.
6. پس از پرداخت موفق، فروش به همان Affiliate نسبت داده می‌شود.
7. سهم/کمیسیون Affiliate در سیستم فروش ثبت می‌شود.
8. پس از قطعی‌شدن فروش و عبور از قواعد لغو/بازپرداخت، کمیسیون از «در انتظار» به «تأییدشده» تبدیل می‌شود.
9. تسویه فقط بر مبنای کمیسیون تأییدشده انجام می‌شود.

### خارج از محدوده

در نسخه فعلی Affiliate موارد زیر نداریم:
- شبکه چندسطحی یا زیرمجموعه‌گیری Affiliate
- کمیسیون بر اساس کلیک، بازدید یا Lead بدون خرید
- ثبت دستی فروش توسط Affiliate
- لینک Referral به‌عنوان منبع مستقل کمیسیون
- تغییر درصد کمیسیون یا مبلغ فروش توسط کاربر/فرانت‌اند
- فعال‌سازی Affiliate توسط خود کاربر

اگر در آینده یکی از این قابلیت‌ها لازم شد باید به‌عنوان تصمیم محصول جدید بررسی و تأیید شود.

## جایگاه در Account V2

### قبل از درخواست

در انتهای Account V2 و در بخش کم‌اولویت «حساب و همکاری»، یک ورودی جمع‌شونده با عنوان `همکاری با چاکود` نمایش داده می‌شود.

این ورودی در Hero، CTA اصلی یا دسترسی‌های سریع قرار نمی‌گیرد.

CTA: `درخواست همکاری`

### بعد از ارسال درخواست

همان ورودی به Status Card تبدیل می‌شود و وضعیت را نشان می‌دهد:
- `در حال بررسی`
- `نیازمند تکمیل اطلاعات`
- `تأیید نشد`
- `تأیید شد — برای فعال‌شدن دسترسی دوباره وارد شوید`

### بعد از فعال‌شدن Affiliate

پس از Logout/Login و دریافت Permission معتبر از سرور، همان بخش به Workspace `همکاری و درآمد` تبدیل می‌شود.

Workspace فقط شامل این موارد است:
- کد تخفیف من
- وضعیت کد: فعال / تعلیق / غیرفعال
- فروش‌های ثبت‌شده با کد
- کمیسیون در انتظار
- کمیسیون تأییدشده
- تسویه‌ها و تاریخچه پرداخت
- پروفایل تسویه
- قوانین همکاری

صفحه Affiliate نباید به داشبورد بازاریابی پیچیده تبدیل شود.

## State Machine درخواست و دسترسی

Backend حداقل این وضعیت‌ها را پشتیبانی کند:
- `none`
- `draft`
- `pending`
- `needs_info`
- `approved`
- `active`
- `rejected`
- `suspended`
- `disabled`

حالت ناشناخته باید Fail Closed باشد و هیچ دسترسی Affiliate ندهد.

## فرم درخواست Affiliate

فرم Mobile First و مرحله‌ای باشد؛ نه یک صفحه بلند.

### مرحله ۱ — اطلاعات پایه
- نام و نام خانوادگی
- شماره موبایل تأییدشده
- استان/شهر
- روش تماس ترجیحی

### مرحله ۲ — زمینه همکاری
- روش اصلی معرفی کد: شبکه اجتماعی، مشتریان کسب‌وکار، جامعه محلی، تولید محتوا، فروش، سایر
- لینک/شناسه شبکه اجتماعی یا وب‌سایت در صورت وجود
- توضیح کوتاه درباره سابقه و روش معرفی
- توضیح کوتاه درباره دلیل درخواست همکاری

### مرحله ۳ — قوانین
کاربر باید نسخه مشخص قوانین Affiliate را ببیند و صریحاً بپذیرد.

Backend ذخیره کند:
- `terms_version`
- `accepted_at`
- `user_id`
- audit metadata لازم

### مرحله ۴ — بازبینی و ارسال
- خلاصه اطلاعات قبل از Submit نمایش داده شود.
- درخواست `pending` تکراری ساخته نشود.
- پس از ارسال، UI به Status Card تبدیل شود.

## اطلاعات مالی

در درخواست اولیه شماره شبا یا اطلاعات بانکی دریافت نشود.

اطلاعات تسویه فقط پس از Active شدن Affiliate در `پروفایل تسویه` دریافت و اعتبارسنجی می‌شود.

## کد تخفیف Affiliate

کد باید در Backend به Affiliate ID/User ID متصل باشد و منبع حقیقت سرور باشد.

حداقل ویژگی‌ها:
- code
- affiliate/user id
- status: active/suspended/disabled
- discount rule/value
- commission rule/value
- eligible products/services
- start/end date در صورت نیاز
- usage rules در صورت نیاز

Affiliate نباید بتواند درصد تخفیف، درصد کمیسیون، وضعیت کد یا قواعد اعتبار را از سمت Client تغییر دهد.

## نسبت‌دادن فروش و کمیسیون

فروش Affiliate فقط زمانی ثبت شود که:
- کد معتبر در Checkout پذیرفته شده باشد.
- پرداخت با موفقیت نهایی شده باشد.
- سفارش/تراکنش شناسه یکتا داشته باشد.

برای هر فروش حداقل ثبت شود:
- affiliate id
- discount code id/code snapshot
- order/payment id
- gross amount
- discount amount
- commission amount/rate snapshot
- commission status
- created/confirmed/cancelled timestamps

کمیسیون در ابتدا `pending` باشد و فقط طبق قواعد مالی سیستم به `approved` برسد.

در Refund/Cancel، کمیسیون باید حذف/برگشت/باطل شود و این تغییر Audit شود.

### کنترل سوءاستفاده

به‌صورت پیش‌فرض پیشنهاد می‌شود خرید خود Affiliate با کد خودش کمیسیون ایجاد نکند. هر استثنا باید تصمیم صریح محصول باشد.

Backend باید از ثبت تکراری کمیسیون برای یک Order/Payment جلوگیری کند.

## Admin Workflow

هویت کاربر از `/admin/users` مرجع است و Affiliate با همان User ID مدیریت می‌شود.

ادمین باید بتواند:
- درخواست‌های Affiliate را فیلتر و مشاهده کند.
- اطلاعات درخواست و نسخه قوانین پذیرفته‌شده را ببیند.
- نتیجه تماس/پیام را ثبت کند.
- اطلاعات بیشتر درخواست کند.
- درخواست را تأیید یا رد کند.
- Affiliate را فعال، تعلیق یا غیرفعال کند.
- کد تخفیف اختصاصی را ایجاد/اختصاص/تعلیق کند.
- فروش‌ها، کمیسیون‌ها و تسویه‌های Affiliate را مشاهده کند.

اگر تعداد درخواست‌ها زیاد شد، Queue مستقل `/admin/affiliate-requests` ساخته شود؛ ولی هویت همچنان به `/admin/users` متصل بماند.

تمام Mutationهای مدیریتی باید Audit Log داشته باشند.

## Approval & Session Refresh

پس از تأیید مدیر:
1. Backend نقش Affiliate را فعال می‌کند.
2. کد تخفیف اختصاصی ایجاد/اختصاص داده می‌شود.
3. کاربر با تماس/پیام یا پیام داخل سایت مطلع می‌شود.
4. نشست قدیمی فقط پیام `برای فعال‌شدن امکانات یک‌بار خارج و دوباره وارد شوید` نشان می‌دهد.
5. پس از Login جدید، Permission معتبر Affiliate از سرور دریافت می‌شود.
6. Workspace `همکاری و درآمد` نمایش داده می‌شود.

Logout/Login فقط برای Refresh تجربه کاربر است؛ امنیت واقعی باید در تمام Affiliate APIها سمت Backend enforce شود.

## Permission Contract

قرارداد واقعی Backend باید explicit باشد، از جنس مفهومی:
- `permissions.affiliate = true | false`
- `affiliate.status = ...`

نام دقیق فیلدها بعد از قرارداد Backend نهایی می‌شود؛ فرانت نباید فلگ حدسی تولید کند.

ادمین نیز Permission مستقل مانند `can_manage_affiliates` نیاز دارد.

## API Contract مورد نیاز

### User
- دریافت وضعیت درخواست/دسترسی
- ذخیره Draft درخواست
- Submit درخواست
- تکمیل اطلاعات در `needs_info`

### Admin
- Queue/Filter درخواست‌ها
- Detail درخواست
- request_more_info
- approve/reject
- activate/suspend/disable
- create/assign/suspend discount code

### Affiliate Active
- دریافت کد تخفیف
- خلاصه فروش و کمیسیون
- فهرست فروش‌های منتسب به کد
- فهرست کمیسیون‌ها
- تسویه‌ها
- payout profile

## Security Rules

- Authorization سمت سرور الزامی است.
- LocalStorage منبع Permission نیست.
- کد تخفیف و Affiliate باید سمت Backend validate شوند.
- مبلغ سفارش، تخفیف و کمیسیون از Client قابل اعتماد نیست.
- هر Order/Payment حداکثر یک Attribution معتبر ایجاد کند.
- Refund/Cancel باید روی Commission اثر قطعی داشته باشد.
- Admin mutations permission-checked و audit-logged باشند.
- درخواست `pending` تکراری ایجاد نشود.

## ترتیب اجرا

1. مدل داده Affiliate Application + Affiliate Permission
2. مدل Discount Code متصل به Affiliate
3. User API درخواست همکاری
4. Admin API بررسی/تأیید/فعال‌سازی + Audit
5. Permission صریح در Session/Me
6. Account V2: «همکاری با چاکود» + Status Card
7. فرم درخواست Mobile First
8. Admin Users/Queue درخواست‌ها
9. Approval + Logout/Login refresh
10. اتصال کد تخفیف به Checkout و ثبت Attribution فروش
11. Commission ledger با Pending/Approved/Cancelled
12. Workspace ساده «همکاری و درآمد»
13. Payout profile و Settlements
