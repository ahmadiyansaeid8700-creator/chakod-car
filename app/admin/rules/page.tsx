"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const DIRECT_ADMIN_COMMERCE_URL = "https://api.chakod.com/api/admin-commerce.php";

type SettingValue = string | number | boolean;
type Settings = Record<string, SettingValue>;

type Service = {
  service_key: string;
  title: string;
  audience: string;
  amount_toman: number;
  duration_value: number;
  duration_unit: string;
  is_active: boolean;
  settings: Record<string, unknown>;
};

type CommerceResponse = {
  success?: boolean;
  message?: string;
  capabilities?: {
    pricing_view?: boolean;
    pricing_manage?: boolean;
  };
  services?: Service[];
};

type Field = {
  key: string;
  label: string;
  hint: string;
  type: "number" | "toggle";
  suffix?: string;
  min?: number;
};

type Section = {
  id: string;
  title: string;
  description: string;
  fields: Field[];
};

const DEFAULTS: Settings = {
  personal_free_listings_yearly: 2,
  dealer_free_listings_yearly: 3,
  single_listing_price: 149000,
  economic_listing_count: 25,
  economic_discount_percent: 10,
  economic_price: 3352500,
  smart_listing_count: 50,
  smart_discount_percent: 15,
  smart_price: 6332500,
  professional_listing_count: 100,
  professional_discount_percent: 20,
  professional_price: 11920000,
  service_trial_days: 30,
  service_showcase_6_month_price: 600000,
  service_showcase_12_month_price: 990000,
  bump_price: 12000,
  bump_daily_limit: 1,
  selected_price: 28000,
  selected_duration_days: 3,
  referral_enabled: true,
  referral_buyer_discount_percent: 10,
  referral_commission_percent: 10,
  referral_min_withdrawal: 500000,
  require_listing_approval: true,
  require_dealer_approval: true,
  require_service_business_approval: true,
  restore_credit_on_admin_rejection: true,
  local_first_enabled: true,
  nationwide_fallback_enabled: true,
};

const SECTIONS: Section[] = [
  {
    id: "credits",
    title: "ثبت آگهی و اعتبار رایگان",
    description: "سهمیه کاربران و قیمت خرید تک‌آگهی",
    fields: [
      { key: "personal_free_listings_yearly", label: "سهمیه رایگان کاربر شخصی", hint: "تعداد آگهی رایگان در هر سال", type: "number", suffix: "آگهی", min: 0 },
      { key: "dealer_free_listings_yearly", label: "سهمیه رایگان نمایشگاه", hint: "تعداد آگهی رایگان در هر سال", type: "number", suffix: "آگهی", min: 0 },
      { key: "single_listing_price", label: "قیمت تک‌آگهی", hint: "پس از پایان سهمیه رایگان", type: "number", suffix: "تومان", min: 0 },
    ],
  },
  {
    id: "packages",
    title: "پکیج‌های نمایشگاهی",
    description: "تعداد آگهی، تخفیف و قیمت نهایی هر پکیج",
    fields: [
      { key: "economic_listing_count", label: "اقتصادی؛ تعداد آگهی", hint: "اعتبار یک‌ساله", type: "number", suffix: "آگهی", min: 1 },
      { key: "economic_discount_percent", label: "اقتصادی؛ تخفیف", hint: "نسبت به قیمت تک‌آگهی", type: "number", suffix: "درصد", min: 0 },
      { key: "economic_price", label: "اقتصادی؛ قیمت", hint: "قیمت نهایی پکیج", type: "number", suffix: "تومان", min: 0 },
      { key: "smart_listing_count", label: "هوشمند؛ تعداد آگهی", hint: "اعتبار یک‌ساله", type: "number", suffix: "آگهی", min: 1 },
      { key: "smart_discount_percent", label: "هوشمند؛ تخفیف", hint: "نسبت به قیمت تک‌آگهی", type: "number", suffix: "درصد", min: 0 },
      { key: "smart_price", label: "هوشمند؛ قیمت", hint: "قیمت نهایی پکیج", type: "number", suffix: "تومان", min: 0 },
      { key: "professional_listing_count", label: "حرفه‌ای؛ تعداد آگهی", hint: "اعتبار یک‌ساله", type: "number", suffix: "آگهی", min: 1 },
      { key: "professional_discount_percent", label: "حرفه‌ای؛ تخفیف", hint: "نسبت به قیمت تک‌آگهی", type: "number", suffix: "درصد", min: 0 },
      { key: "professional_price", label: "حرفه‌ای؛ قیمت", hint: "قیمت نهایی پکیج", type: "number", suffix: "تومان", min: 0 },
    ],
  },
  {
    id: "businesses",
    title: "ویترین کسب‌وکارها",
    description: "دوره آزمایشی و اشتراک کسب‌وکارهای خدماتی",
    fields: [
      { key: "service_trial_days", label: "استفاده آزمایشی", hint: "پس از تکمیل و تأیید حساب", type: "number", suffix: "روز", min: 0 },
      { key: "service_showcase_6_month_price", label: "ویترین ۶ ماهه", hint: "قیمت دوره شش‌ماهه", type: "number", suffix: "تومان", min: 0 },
      { key: "service_showcase_12_month_price", label: "ویترین ۱۲ ماهه", hint: "قیمت دوره یک‌ساله", type: "number", suffix: "تومان", min: 0 },
    ],
  },
  {
    id: "promotion",
    title: "افزایش دیده‌شدن",
    description: "بالابَر و جایگاه منتخب صفحه اول",
    fields: [
      { key: "bump_price", label: "قیمت بالابَر", hint: "انتقال به ابتدای آگهی‌های شهر", type: "number", suffix: "تومان", min: 0 },
      { key: "bump_daily_limit", label: "محدودیت روزانه بالابَر", hint: "برای هر آگهی", type: "number", suffix: "بار", min: 1 },
      { key: "selected_price", label: "قیمت جایگاه منتخب", hint: "نمایش در منتخب‌های صفحه اول", type: "number", suffix: "تومان", min: 0 },
      { key: "selected_duration_days", label: "مدت جایگاه منتخب", hint: "از زمان پرداخت موفق", type: "number", suffix: "روز", min: 1 },
    ],
  },
  {
    id: "referral",
    title: "همکار فروش چاکود",
    description: "تخفیف خریدار و پورسانت معرف فقط برای پکیج‌ها",
    fields: [
      { key: "referral_enabled", label: "فعال‌بودن طرح", hint: "در صورت خاموش‌بودن هیچ کدی اعمال نمی‌شود", type: "toggle" },
      { key: "referral_buyer_discount_percent", label: "تخفیف خریدار", hint: "روی قیمت پکیج", type: "number", suffix: "درصد", min: 0 },
      { key: "referral_commission_percent", label: "پورسانت معرف", hint: "پس از قطعی‌شدن پرداخت", type: "number", suffix: "درصد", min: 0 },
      { key: "referral_min_withdrawal", label: "حداقل برداشت", hint: "حداقل موجودی قابل تسویه", type: "number", suffix: "تومان", min: 0 },
    ],
  },
  {
    id: "approvals",
    title: "تأییدها و انتشار",
    description: "قوانین بررسی محتوا پیش از نمایش عمومی",
    fields: [
      { key: "require_listing_approval", label: "تأیید آگهی خودرو", hint: "آگهی قبل از انتشار توسط مدیر بررسی شود", type: "toggle" },
      { key: "require_dealer_approval", label: "تأیید نمایشگاه", hint: "اطلاعات، لوگو و بنر بررسی شود", type: "toggle" },
      { key: "require_service_business_approval", label: "تأیید کسب‌وکار خدماتی", hint: "اطلاعات و تصاویر قبل از نمایش بررسی شود", type: "toggle" },
      { key: "restore_credit_on_admin_rejection", label: "بازگشت اعتبار آگهی ردشده", hint: "در صورت رد مدیریتی، اعتبار به حساب بازگردد", type: "toggle" },
    ],
  },
  {
    id: "location",
    title: "قانون محدوده نمایش",
    description: "اولویت آگهی‌های شهر انتخاب‌شده در صفحه اصلی",
    fields: [
      { key: "local_first_enabled", label: "اولویت محدوده انتخابی", hint: "ابتدا آگهی‌های همان شهر نمایش داده شوند", type: "toggle" },
      { key: "nationwide_fallback_enabled", label: "ادامه با سراسر ایران", hint: "پس از پایان آگهی‌های محدوده، آگهی‌های ایران نمایش داده شوند", type: "toggle" },
    ],
  },
];

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("پاسخ سرور قابل خواندن نیست.");
  }
}

async function fetchCommerce(options: RequestInit = {}) {
  const token = getToken();
  const query = "?section=pricing";
  const endpoints = [`/api/admin/commerce${query}`, `${DIRECT_ADMIN_COMMERCE_URL}${query}`];
  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    const direct = endpoint.startsWith("https://");
    try {
      const response = await fetch(endpoint, {
        ...options,
        cache: "no-store",
        credentials: direct ? "omit" : "include",
        mode: direct ? "cors" : "same-origin",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "X-Session-Token": token,
          ...(options.headers || {}),
        },
      });
      if (!direct && response.status === 502) {
        lastError = new Error("ارتباط داخلی با سرور مدیریت برقرار نشد.");
        continue;
      }
      return response;
    } catch (caught) {
      lastError = caught;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("ارتباط با مدیریت تجاری برقرار نشد.");
}

function formatValue(value: SettingValue) {
  if (typeof value === "number") return new Intl.NumberFormat("fa-IR").format(value);
  return String(value);
}

export default function AdminRulesPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [savedSettings, setSavedSettings] = useState<Settings>(DEFAULTS);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [serviceAnchor, setServiceAnchor] = useState<Service | null>(null);

  const dirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const token = getToken();

    if (!token) {
      setError("برای مدیریت قوانین ابتدا وارد حساب مدیر شوید.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetchCommerce({ method: "GET" });
      const result = await readJson<CommerceResponse>(response);

      if (!response.ok || !result.success) {
        throw new Error(result.message || "قوانین از سرور مدیریت دریافت نشد.");
      }

      if (!result.capabilities?.pricing_manage) {
        throw new Error("دسترسی ویرایش قوانین برای این حساب فعال نیست.");
      }

      const anchor =
        (result.services || []).find((service) => service.service_key === "listing_personal") ||
        (result.services || [])[0];

      if (!anchor) {
        throw new Error("تعرفه پایه برای نگهداری قوانین پیدا نشد.");
      }

      const stored = anchor.settings?.platform_rules;
      const platformRules =
        stored && typeof stored === "object" && !Array.isArray(stored)
          ? (stored as Settings)
          : {};

      const next = { ...DEFAULTS, ...platformRules };
      setServiceAnchor(anchor);
      setAllowed(true);
      setSettings(next);
      setSavedSettings(next);
      setUpdatedAt(typeof anchor.settings?.platform_rules_updated_at === "string" ? anchor.settings.platform_rules_updated_at : null);
    } catch (caught) {
      setAllowed(false);
      setError(caught instanceof Error ? caught.message : "خطا در دریافت قوانین.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleSections = useMemo(() => {
    const normalized = query.trim();
    if (!normalized) return SECTIONS;
    return SECTIONS.map((section) => ({
      ...section,
      fields: section.fields.filter((field) => `${section.title} ${field.label} ${field.hint}`.includes(normalized)),
    })).filter((section) => section.fields.length > 0);
  }, [query]);

  const changedCount = useMemo(
    () => Object.keys(settings).filter((key) => settings[key] !== savedSettings[key]).length,
    [savedSettings, settings]
  );

  function update(key: string, value: SettingValue) {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  async function save() {
    if (!dirty || saving || !serviceAnchor) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const savedAt = new Date().toISOString();
      const response = await fetchCommerce({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_service",
          ...serviceAnchor,
          settings: {
            ...(serviceAnchor.settings || {}),
            platform_rules: settings,
            platform_rules_updated_at: savedAt,
          },
        }),
      });
      const result = await readJson<{ success?: boolean; message?: string }>(response);

      if (!response.ok || !result.success) {
        throw new Error(result.message || "ذخیره قوانین انجام نشد.");
      }

      setServiceAnchor((current) => current ? {
        ...current,
        settings: {
          ...(current.settings || {}),
          platform_rules: settings,
          platform_rules_updated_at: savedAt,
        },
      } : current);
      setSavedSettings({ ...settings });
      setUpdatedAt(savedAt);
      setMessage("تغییرات قوانین با موفقیت ذخیره و در تنظیمات مرکزی ثبت شد.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "خطا در ذخیره قوانین.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="rulesPage" dir="rtl"><section className="state"><span className="spinner" /><h1>در حال دریافت قوانین...</h1><p>دسترسی مدیر و آخرین تنظیمات بررسی می‌شود.</p></section><style>{styles}</style></main>;
  }

  if (!allowed) {
    return <main className="rulesPage" dir="rtl"><section className="state denied"><span className="stateIcon">!</span><h1>امکان ویرایش قوانین وجود ندارد</h1><p>{error}</p><div><Link href="/admin">بازگشت به مدیریت</Link><button onClick={() => void loadData()}>بررسی دوباره</button></div></section><style>{styles}</style></main>;
  }

  return (
    <main className="rulesPage" dir="rtl">
      <header className="topbar">
        <div>
          <span className="eyebrow">تنظیمات مرکزی چاکود</span>
          <h1>قوانین و قیمت‌ها</h1>
          <p>همه اعداد و قواعد اجرایی سایت از یک صفحه، بدون نیاز به تغییر کد.</p>
        </div>
        <div className="topActions">
          <Link href="/admin">بازگشت به داشبورد</Link>
          <button className="save" disabled={!dirty || saving} onClick={() => void save()}>
            {saving ? "در حال ذخیره..." : dirty ? `ذخیره ${changedCount} تغییر` : "همه‌چیز ذخیره است"}
          </button>
        </div>
      </header>

      {(message || error) && <div className={error ? "notice error" : "notice success"}>{error || message}</div>}

      <section className="summary">
        <article><span>وضعیت</span><strong>{dirty ? "تغییر ذخیره‌نشده" : "به‌روز"}</strong><small>{dirty ? `${changedCount} مقدار تغییر کرده` : "همه قوانین ذخیره شده‌اند"}</small></article>
        <article><span>آخرین ویرایش</span><strong>{updatedAt ? new Date(updatedAt).toLocaleDateString("fa-IR") : "ثبت نشده"}</strong><small>زمان از سرور مدیریت دریافت می‌شود</small></article>
        <article><span>دسته‌های قابل مدیریت</span><strong>{SECTIONS.length}</strong><small>قیمت، سهمیه، تأیید و نمایش</small></article>
      </section>

      <section className="workspace">
        <aside>
          <label className="search"><span>جست‌وجو</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثلاً پورسانت یا بالابَر" /></label>
          <nav aria-label="دسته‌بندی قوانین">
            {SECTIONS.map((section) => (
              <button key={section.id} className={activeSection === section.id ? "active" : ""} onClick={() => { setActiveSection(section.id); document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                <b>{section.title}</b><small>{section.fields.length} تنظیم</small>
              </button>
            ))}
          </nav>
        </aside>

        <div className="sections">
          {visibleSections.map((section) => (
            <section className="ruleSection" id={section.id} key={section.id}>
              <div className="sectionHead"><div><h2>{section.title}</h2><p>{section.description}</p></div><span>{section.fields.length} مورد</span></div>
              <div className="fields">
                {section.fields.map((field) => {
                  const value = settings[field.key] ?? DEFAULTS[field.key];
                  const changed = value !== savedSettings[field.key];
                  return (
                    <label className={`field ${changed ? "changed" : ""}`} key={field.key}>
                      <span className="fieldText"><b>{field.label}</b><small>{field.hint}</small>{changed && <em>تغییر کرده</em>}</span>
                      {field.type === "toggle" ? (
                        <button type="button" className={`toggle ${value ? "on" : ""}`} onClick={() => update(field.key, !value)} aria-pressed={!!value}><i /><span>{value ? "فعال" : "غیرفعال"}</span></button>
                      ) : (
                        <span className="inputWrap"><input type="number" min={field.min} value={Number(value)} onChange={(event) => update(field.key, Number(event.target.value))} /><em>{field.suffix}</em><small>{formatValue(value)}</small></span>
                      )}
                    </label>
                  );
                })}
              </div>
            </section>
          ))}
          {!visibleSections.length && <section className="empty">تنظیمی با این عبارت پیدا نشد.</section>}
        </div>
      </section>

      {dirty && <div className="saveBar"><div><strong>{changedCount} تغییر ذخیره نشده</strong><span>تا زمان ذخیره، این تغییرات روی سایت اعمال نمی‌شوند.</span></div><button className="discard" onClick={() => setSettings(savedSettings)}>لغو تغییرات</button><button onClick={() => void save()} disabled={saving}>{saving ? "در حال ذخیره..." : "ذخیره و اعمال"}</button></div>}

      <style>{styles}</style>
    </main>
  );
}

const styles = `
*{box-sizing:border-box}.rulesPage{min-height:100vh;padding:24px 24px 120px;color:#20132f;font-family:Tahoma,Arial,sans-serif;background:#f7f5fb}.topbar,.summary,.workspace,.notice{width:min(1320px,100%);margin-inline:auto}.topbar{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:18px}.eyebrow{display:inline-flex;padding:6px 10px;color:#6d28d9;font-size:11px;font-weight:900;border-radius:999px;background:#eee5ff}.topbar h1{margin:8px 0 2px;font-size:30px}.topbar p{margin:0;color:#776887;font-size:13px}.topActions{display:flex;gap:9px}.topActions a,.topActions button,.saveBar button,.state a,.state button{padding:11px 15px;color:#5b21b6;font:900 12px inherit;text-decoration:none;border:1px solid #decdf7;border-radius:13px;background:#fff;cursor:pointer}.topActions .save,.saveBar button:not(.discard){color:#fff;border-color:#6d28d9;background:#6d28d9}.topActions button:disabled{color:#8b7c9b;border-color:#e4dfea;background:#e4dfea;cursor:not-allowed}.notice{margin-bottom:14px;padding:12px 15px;font-size:13px;font-weight:700;border-radius:14px}.notice.success{color:#08785b;background:#ddf8ef}.notice.error{color:#a32929;background:#ffebeb}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}.summary article{padding:16px;border:1px solid #e7def2;border-radius:18px;background:#fff}.summary span,.summary small{display:block;color:#82748e;font-size:11px}.summary strong{display:block;margin:7px 0 4px;font-size:18px}.workspace{display:grid;grid-template-columns:255px minmax(0,1fr);gap:16px;align-items:start}.workspace aside{position:sticky;top:16px;padding:12px;border:1px solid #e7def2;border-radius:20px;background:#fff}.search span{display:block;margin:2px 4px 7px;color:#6f607e;font-size:11px;font-weight:900}.search input{width:100%;padding:11px;border:1px solid #e7def2;border-radius:12px;outline:0}.search input:focus{border-color:#8b5cf6}.workspace nav{display:grid;gap:5px;margin-top:10px}.workspace nav button{display:flex;align-items:center;justify-content:space-between;padding:11px;color:#4c3d59;text-align:right;border:0;border-radius:12px;background:transparent;cursor:pointer}.workspace nav button:hover,.workspace nav button.active{color:#5b21b6;background:#f3edff}.workspace nav b{font-size:12px}.workspace nav small{font-size:10px}.sections{display:grid;gap:14px}.ruleSection{scroll-margin-top:20px;border:1px solid #e7def2;border-radius:22px;background:#fff;overflow:hidden}.sectionHead{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #eee7f4}.sectionHead h2{margin:0;font-size:17px}.sectionHead p{margin:5px 0 0;color:#82748e;font-size:11px}.sectionHead>span{padding:6px 9px;color:#6d28d9;font-size:10px;font-weight:900;border-radius:999px;background:#f2ebff}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.field{display:flex;min-height:104px;align-items:center;justify-content:space-between;gap:14px;padding:16px 20px;border-bottom:1px solid #f0ebf4}.field:nth-child(odd){border-left:1px solid #f0ebf4}.field.changed{background:#fffaf0}.fieldText{display:block;min-width:0}.fieldText b,.fieldText small{display:block}.fieldText b{font-size:12px}.fieldText small{max-width:310px;margin-top:6px;color:#897b94;font-size:10px;line-height:1.7}.fieldText em{display:inline-flex;margin-top:7px;padding:3px 7px;color:#a05b00;font-size:9px;font-style:normal;font-weight:900;border-radius:999px;background:#fff0cf}.inputWrap{display:grid;grid-template-columns:120px auto;align-items:center;gap:6px;direction:ltr}.inputWrap input{width:120px;padding:10px;color:#29183b;font:700 13px inherit;text-align:left;border:1px solid #ded3e8;border-radius:11px;outline:0}.inputWrap input:focus{border-color:#7c3aed}.inputWrap>em{color:#776887;font-size:10px;font-style:normal;direction:rtl}.inputWrap>small{grid-column:1/-1;color:#9a8da4;font-size:9px;text-align:left}.toggle{display:flex;min-width:112px;align-items:center;gap:7px;padding:7px 9px;color:#8b7d97;font:900 10px inherit;border:1px solid #e3dce9;border-radius:999px;background:#f5f2f7;cursor:pointer}.toggle i{position:relative;width:34px;height:20px;border-radius:999px;background:#cfc6d7}.toggle i:after{position:absolute;top:3px;right:3px;width:14px;height:14px;border-radius:50%;background:#fff;content:"";transition:.18s}.toggle.on{color:#08785b;border-color:#b8eadc;background:#e5faf4}.toggle.on i{background:#10a77e}.toggle.on i:after{right:17px}.saveBar{position:fixed;right:24px;bottom:18px;left:24px;z-index:50;display:flex;max-width:900px;align-items:center;gap:10px;margin:auto;padding:11px 14px;color:#fff;border-radius:18px;background:#241435;box-shadow:0 18px 45px #24143555}.saveBar div{display:grid;margin-left:auto}.saveBar strong{font-size:12px}.saveBar span{margin-top:3px;color:#d8cde3;font-size:9px}.saveBar .discard{color:#fff;border-color:#ffffff33;background:#ffffff12}.state{width:min(520px,calc(100% - 30px));margin:80px auto;padding:30px;text-align:center;border:1px solid #e3d8ee;border-radius:24px;background:#fff}.state h1{font-size:20px}.state p{color:#806f8d;line-height:1.9}.state div{display:flex;justify-content:center;gap:8px}.stateIcon{display:grid;width:46px;height:46px;margin:auto;place-items:center;color:#fff;font-size:24px;font-weight:900;border-radius:15px;background:#ef4444}.spinner{display:block;width:44px;height:44px;margin:0 auto 18px;border:4px solid #e9def5;border-top-color:#7c3aed;border-radius:50%;animation:spin .8s linear infinite}.empty{padding:40px;text-align:center;border:1px dashed #d9cbe8;border-radius:20px;background:#fff}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:900px){.rulesPage{padding:16px 14px 130px}.topbar{align-items:stretch;flex-direction:column}.topActions>*{flex:1;text-align:center}.summary{grid-template-columns:1fr}.workspace{grid-template-columns:1fr}.workspace aside{position:static}.workspace nav{display:flex;overflow-x:auto}.workspace nav button{min-width:max-content;gap:8px}.fields{grid-template-columns:1fr}.field:nth-child(odd){border-left:0}.saveBar{right:12px;bottom:12px;left:12px;flex-wrap:wrap}.saveBar div{width:100%;margin:0}.saveBar button{flex:1}}@media(max-width:560px){.field{align-items:stretch;flex-direction:column}.inputWrap{grid-template-columns:minmax(0,1fr) auto}.inputWrap input{width:100%}.toggle{width:100%;justify-content:center}}
`;
