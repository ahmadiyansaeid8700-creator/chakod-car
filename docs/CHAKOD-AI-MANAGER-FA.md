# Chakod AI Manager — Foundation

## هدف

Chakod AI Manager یک لایه مدیریتی جدا از هسته اصلی سایت است. این لایه نباید ورود، آگهی، پروفایل، پرداخت یا مسیرهای اصلی را برای کارکرد عادی سایت به AI وابسته کند.

## اصول معماری

- AI Manager به‌صورت پیش‌فرض غیرفعال است.
- Provider قابل تعویض است: `disabled`، `openai` یا `local`.
- Mode فعلی فقط `read_suggest` است.
- Write Action خودکار مجاز نیست.
- Chatbot سراسری در RootLayout وجود ندارد.
- Moderation آگهی سرویس مستقل باقی می‌ماند.
- Secret، API Key و Token در UI یا Status نمایش داده نمی‌شوند.
- مسیرهای مدیریت AI زیر `app/admin/ai` و `app/api/ai/manager` از هسته سایت جدا هستند.

## Foundation v0.3

### Provider Adapter

`lib/chakod-ai-manager/provider.ts`

- OpenAI و Local Provider از قرارداد مشترک استفاده می‌کنند.
- Timeout محدود و قابل تنظیم است.
- Failure isolation و fail-closed behavior اعمال می‌شود.
- Local endpoint فقط برای Loopback معتبر پذیرفته می‌شود.
- ورودی و خروجی اندازه محدود دارند.
- OpenAI request با `store: false` ارسال می‌شود.

### Read-only Tool Registry

`lib/chakod-ai-manager/tools.ts`

Registry وضعیت سه مرحله را نگه می‌دارد:

- `available`: قابلیت Read-only در Foundation فعلی قابل مشاهده است.
- `registered`: قرارداد ابزار ثبت شده ولی Executor آن هنوز به API واقعی متصل نشده است.
- `planned`: ابزار در معماری تعریف شده ولی هنوز وارد مرحله اتصال نشده است.

ابزارهای فعلی شامل وضعیت Manager، وضعیت Moderation، صف آگهی‌ها، کسب‌وکارها، سلامت تجاری و خلاصه عملیات سایت هستند.

### Status API

`GET /api/ai/manager/status`

این Route فقط برای ادمین معتبر پاسخ می‌دهد و اطلاعات غیرمحرمانه زیر را برمی‌گرداند:

- Feature Flag و Provider
- Mode و وضعیت آمادگی
- Timeout و نام Model غیرمحرمانه
- خلاصه Tool Registry
- وضعیت Moderation بدون Secret

کاربر فاقد دسترسی پاسخ 404 می‌گیرد.

### صفحه مدیریت AI

`/admin/ai`

صفحه اختصاصی AI Center شامل موارد زیر است:

- وضعیت Provider و Runtime
- Tool Registry و Stage هر ابزار
- معماری پردازش از Admin Request تا Human Decision
- Guardrailهای استقلال سایت
- نمایش صریح ممنوع بودن Auto-write

### داشبورد مدیریت

`/admin`

داشبورد مدیریت بازطراحی شده و اکنون Command Center واحد برای این بخش‌ها است:

- آگهی‌ها
- کسب‌وکارها
- مالی و تجاری
- AI Center
- وضعیت دسترسی و Governance
- نمای فشرده معماری AI

## Environment contract

فقط نام تنظیمات در `.env.example` نگهداری می‌شود؛ مقدار واقعی خارج از Git است.

```text
CHAKOD_AI_MANAGER_ENABLED=false
CHAKOD_AI_MANAGER_PROVIDER=disabled
CHAKOD_AI_MANAGER_TIMEOUT_MS=12000
CHAKOD_AI_MANAGER_OPENAI_MODEL=
CHAKOD_AI_LOCAL_ENDPOINT=
```

برای Provider `openai` از `OPENAI_API_KEY` سرور استفاده می‌شود.

## مراحل بعدی

1. اجرای Regression Test برای Cleanup، Provider Adapter، Tool Registry و صفحات مدیریت.
2. ساخت Executor برای Toolهای `registered` فقط روی APIهای Read-only تأییدشده.
3. اضافه‌کردن Audit event برای درخواست‌های AI بدون ذخیره Secret یا Token.
4. ساخت Suggestion endpoint مدیریتی پس از آماده‌شدن حداقل یک Tool واقعی.
5. هر Write Action احتمالی آینده فقط با Permission، Human Approval و Audit مستقل.

## نقطه بازگشت

AI Manager باید همیشه از هسته سایت جدا بماند تا در صورت مشکل با غیرفعال‌کردن Feature Flag یا Revert Commit، سرویس اصلی بدون AI ادامه دهد.
