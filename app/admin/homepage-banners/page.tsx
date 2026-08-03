"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = "https://api.chakod.com";

type BannerStatus = "draft" | "active" | "disabled";
type ScopeMode = "all" | "province" | "city";
type BannerType = "internal" | "sponsored";

type Banner = {
  id: number;
  title: string;
  alt_text: string;
  image_url?: string;
  desktop_image_url: string;
  mobile_image_url: string;
  destination_url: string;
  banner_type: BannerType;
  scope_mode: ScopeMode;
  province: string;
  city: string;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  status: BannerStatus;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  banners?: Banner[];
  banner?: Banner;
};

type FormState = {
  id: number | null;
  title: string;
  altText: string;
  destinationUrl: string;
  bannerType: BannerType;
  scopeMode: ScopeMode;
  province: string;
  city: string;
  startsAt: string;
  endsAt: string;
  priority: string;
  status: BannerStatus;
  desktopImage: File | null;
  mobileImage: File | null;
};

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  altText: "",
  destinationUrl: "",
  bannerType: "internal",
  scopeMode: "all",
  province: "",
  city: "",
  startsAt: "",
  endsAt: "",
  priority: "0",
  status: "draft",
  desktopImage: null,
  mobileImage: null,
};

const statusLabels: Record<BannerStatus, string> = {
  draft: "پیش‌نویس",
  active: "فعال",
  disabled: "غیرفعال",
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function authHeaders() {
  const token = getToken();
  return {
    Authorization: `Bearer ${token}`,
    "X-Session-Token": token,
    Accept: "application/json",
  };
}

function toInputDateTime(value: string | null) {
  if (!value) return "";
  return value.replace(" ", "T").slice(0, 16);
}

async function readJson(response: Response): Promise<ApiResponse> {
  const text = await response.text();
  try {
    return JSON.parse(text) as ApiResponse;
  } catch {
    throw new Error(`پاسخ سرور معتبر نیست: ${text.slice(0, 160)}`);
  }
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return url;
}

export default function AdminHomepageBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const desktopPreviewUrl = useObjectUrl(form.desktopImage);
  const mobilePreviewUrl = useObjectUrl(form.mobileImage);

  const loadBanners = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      if (!token) throw new Error("ابتدا وارد حساب مدیریت شوید.");
      const response = await fetch(`${API_BASE}/api/admin-homepage-banners.php`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      const data = await readJson(response);
      if (!response.ok || !data.success) {
        throw new Error(data.message || "دریافت بنرها انجام نشد.");
      }
      setBanners(data.banners || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "خطا در دریافت بنرها.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBanners();
  }, [loadBanners]);

  const editingBanner = useMemo(
    () => banners.find((item) => item.id === form.id) || null,
    [banners, form.id],
  );

  function resetForm() {
    setForm(EMPTY_FORM);
    setMessage("");
    setError("");
  }

  function editBanner(banner: Banner) {
    setForm({
      id: banner.id,
      title: banner.title,
      altText: banner.alt_text,
      destinationUrl: banner.destination_url,
      bannerType: banner.banner_type,
      scopeMode: banner.scope_mode,
      province: banner.province,
      city: banner.city,
      startsAt: toInputDateTime(banner.starts_at),
      endsAt: toInputDateTime(banner.ends_at),
      priority: String(banner.priority),
      status: banner.status,
      desktopImage: null,
      mobileImage: null,
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!form.id && (!form.desktopImage || !form.mobileImage)) {
        throw new Error("برای بنر جدید، هر دو تصویر دسکتاپ و موبایل را انتخاب کنید.");
      }

      const body = new FormData();
      if (form.id) body.append("id", String(form.id));
      body.append("title", form.title);
      body.append("alt_text", form.altText);
      body.append("destination_url", form.destinationUrl);
      body.append("banner_type", form.bannerType);
      body.append("scope_mode", form.scopeMode);
      body.append("province", form.province);
      body.append("city", form.city);
      body.append("starts_at", form.startsAt);
      body.append("ends_at", form.endsAt);
      body.append("priority", form.priority || "0");
      body.append("status", form.status);
      if (form.desktopImage) body.append("desktop_image", form.desktopImage);
      if (form.mobileImage) body.append("mobile_image", form.mobileImage);

      const response = await fetch(`${API_BASE}/api/admin-homepage-banners.php`, {
        method: "POST",
        headers: authHeaders(),
        body,
      });
      const data = await readJson(response);
      if (!response.ok || !data.success || !data.banner) {
        throw new Error(data.message || "ذخیره بنر انجام نشد.");
      }

      setBanners((current) => {
        const exists = current.some((item) => item.id === data.banner?.id);
        const next = exists
          ? current.map((item) => (item.id === data.banner?.id ? data.banner! : item))
          : [data.banner!, ...current];
        return next.sort((a, b) => b.priority - a.priority || b.id - a.id);
      });
      setMessage(data.message || "بنر ذخیره شد.");
      setForm(EMPTY_FORM);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "خطای ناشناخته");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: number, status: BannerStatus) {
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/admin-homepage-banners.php`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await readJson(response);
      if (!response.ok || !data.success || !data.banner) {
        throw new Error(data.message || "تغییر وضعیت انجام نشد.");
      }
      setBanners((current) => current.map((item) => (item.id === id ? data.banner! : item)));
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "خطای تغییر وضعیت");
    }
  }

  async function deleteBanner(banner: Banner) {
    if (!window.confirm(`بنر «${banner.title || banner.id}» حذف شود؟`)) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/admin-homepage-banners.php`, {
        method: "DELETE",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id: banner.id }),
      });
      const data = await readJson(response);
      if (!response.ok || !data.success) {
        throw new Error(data.message || "حذف بنر انجام نشد.");
      }
      setBanners((current) => current.filter((item) => item.id !== banner.id));
      if (form.id === banner.id) resetForm();
      setMessage("بنر حذف شد.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "خطای حذف بنر");
    }
  }

  const currentDesktopPreview =
    desktopPreviewUrl || editingBanner?.desktop_image_url || editingBanner?.image_url || "";
  const currentMobilePreview =
    mobilePreviewUrl || editingBanner?.mobile_image_url || currentDesktopPreview;

  return (
    <main className="bannerAdmin" dir="rtl">
      <header className="bannerAdminHeader">
        <div>
          <span>مدیریت محتوای صفحه اصلی</span>
          <h1>بنر زیر استوری‌ها</h1>
          <p>برای هر بنر، یک تصویر دسکتاپ و یک تصویر موبایل ثبت می‌شود.</p>
        </div>
        <nav>
          <Link href="/admin">مدیریت</Link>
          <Link href="/">صفحه اصلی</Link>
        </nav>
      </header>

      <section className="bannerEditor">
        <form onSubmit={submit}>
          <div className="editorTitle">
            <div>
              <span>{form.id ? "ویرایش بنر" : "بنر جدید"}</span>
              <h2>{form.id ? form.title || `بنر شماره ${form.id}` : "افزودن بنر صفحه اصلی"}</h2>
            </div>
            {form.id && (
              <button type="button" className="quietButton" onClick={resetForm}>لغو ویرایش</button>
            )}
          </div>

          <div className="formGrid">
            <label>عنوان مدیریتی<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="مثلاً کمپین نمایشگاه‌های تهران" maxLength={160} /></label>
            <label>متن جایگزین تصویر<input value={form.altText} onChange={(event) => setForm((current) => ({ ...current, altText: event.target.value }))} placeholder="توضیح کوتاه تصویر" maxLength={200} /></label>

            <label className="uploadField">
              <span>تصویر دسکتاپ</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setForm((current) => ({ ...current, desktopImage: event.target.files?.[0] || null }))} />
              <small>پیشنهاد: ۱۶۰۰×۳۶۰ یا مشابه؛ افقی، حداکثر ۳ مگابایت.</small>
            </label>

            <label className="uploadField">
              <span>تصویر موبایل</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setForm((current) => ({ ...current, mobileImage: event.target.files?.[0] || null }))} />
              <small>پیشنهاد: ۹۰۰×۳۲۰ یا مشابه؛ افقی، حداکثر ۳ مگابایت.</small>
            </label>

            <label className="fullField">لینک مقصد اختیاری<input dir="ltr" value={form.destinationUrl} onChange={(event) => setForm((current) => ({ ...current, destinationUrl: event.target.value }))} placeholder="https://..." inputMode="url" /><small>دکمه نمایش داده نمی‌شود؛ در صورت ثبت لینک، کل تصویر قابل کلیک است.</small></label>
            <label>نوع بنر<select value={form.bannerType} onChange={(event) => setForm((current) => ({ ...current, bannerType: event.target.value as BannerType }))}><option value="internal">داخلی چاکود</option><option value="sponsored">تبلیغ پولی</option></select></label>
            <label>محدوده نمایش<select value={form.scopeMode} onChange={(event) => setForm((current) => ({ ...current, scopeMode: event.target.value as ScopeMode }))}><option value="all">سراسری</option><option value="province">یک استان</option><option value="city">یک شهر</option></select></label>
            {form.scopeMode !== "all" && <label>استان<input value={form.province} onChange={(event) => setForm((current) => ({ ...current, province: event.target.value }))} placeholder="مثلاً گیلان" required /></label>}
            {form.scopeMode === "city" && <label>شهر<input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} placeholder="مثلاً رشت" required /></label>}
            <label>شروع نمایش<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} /></label>
            <label>پایان نمایش<input type="datetime-local" min={form.startsAt || undefined} value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} /></label>
            <label>اولویت نمایش<input type="number" min={-1000} max={1000} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} /></label>
            <label>وضعیت<select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as BannerStatus }))}><option value="draft">پیش‌نویس</option><option value="active">فعال</option><option value="disabled">غیرفعال</option></select></label>
          </div>

          {(currentDesktopPreview || currentMobilePreview) && (
            <div className="previewGrid">
              {currentDesktopPreview && <div className="bannerPreview desktopPreview"><span>پیش‌نمایش دسکتاپ</span><img src={currentDesktopPreview} alt="پیش‌نمایش دسکتاپ" /></div>}
              {currentMobilePreview && <div className="bannerPreview mobilePreview"><span>پیش‌نمایش موبایل</span><img src={currentMobilePreview} alt="پیش‌نمایش موبایل" /></div>}
            </div>
          )}

          {form.id && <p className="editHint">در زمان ویرایش، فقط تصویری را انتخاب کن که باید عوض شود؛ تصویر دیگر حفظ می‌شود.</p>}
          {error && <p className="formNotice error">{error}</p>}
          {message && <p className="formNotice success">{message}</p>}
          <button className="saveButton" disabled={saving}>{saving ? "در حال ذخیره..." : form.id ? "ذخیره تغییرات" : "ثبت بنر"}</button>
        </form>
      </section>

      <section className="bannerListSection">
        <div className="listHeading"><div><span>بنرهای ثبت‌شده</span><h2>مدیریت نمایش و حذف</h2></div><button type="button" className="quietButton" onClick={() => void loadBanners()}>به‌روزرسانی</button></div>
        {loading ? <div className="emptyBox">در حال دریافت بنرها...</div> : banners.length ? (
          <div className="bannerList">{banners.map((banner) => (
            <article key={banner.id}>
              <div className="listPreviews">
                <img className="listDesktop" src={banner.desktop_image_url || banner.image_url} alt={banner.alt_text || banner.title} />
                <img className="listMobile" src={banner.mobile_image_url || banner.desktop_image_url || banner.image_url} alt="نسخه موبایل" />
              </div>
              <div className="bannerMeta"><div><span className={`status status--${banner.status}`}>{statusLabels[banner.status]}</span>{banner.banner_type === "sponsored" && <span className="sponsored">تبلیغ</span>}</div><h3>{banner.title || `بنر شماره ${banner.id}`}</h3><p>{banner.scope_mode === "all" ? "نمایش سراسری" : banner.scope_mode === "province" ? `استان ${banner.province}` : `${banner.province}، ${banner.city}`}</p><small>اولویت {new Intl.NumberFormat("fa-IR").format(banner.priority)}{banner.starts_at ? ` · شروع ${banner.starts_at}` : ""}{banner.ends_at ? ` · پایان ${banner.ends_at}` : ""}</small></div>
              <div className="bannerActions"><button type="button" onClick={() => editBanner(banner)}>ویرایش</button>{banner.status === "active" ? <button type="button" onClick={() => void changeStatus(banner.id, "disabled")}>غیرفعال‌کردن</button> : <button type="button" onClick={() => void changeStatus(banner.id, "active")}>فعال‌کردن</button>}<button type="button" className="danger" onClick={() => void deleteBanner(banner)}>حذف</button></div>
            </article>
          ))}</div>
        ) : <div className="emptyBox">هنوز بنری ثبت نشده است.</div>}
      </section>
      <style>{styles}</style>
    </main>
  );
}

const styles = `
.bannerAdmin{min-height:100vh;background:#f8f6fb;color:#20142a;padding:34px 20px 70px;font-family:inherit}.bannerAdminHeader,.bannerEditor,.bannerListSection{width:min(1180px,100%);margin:0 auto}.bannerAdminHeader{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:22px}.bannerAdminHeader span,.editorTitle span,.listHeading span{color:#7137d1;font-size:12px;font-weight:800}.bannerAdminHeader h1{margin:7px 0 5px;font-size:32px}.bannerAdminHeader p{margin:0;color:#72687a}.bannerAdminHeader nav{display:flex;gap:8px}.bannerAdminHeader nav a,.quietButton{border:1px solid #ded3e8;background:#fff;color:#3e2453;border-radius:12px;padding:10px 13px;text-decoration:none;font:inherit;cursor:pointer}.bannerEditor,.bannerListSection{background:#fff;border:1px solid #e5dced;border-radius:24px;box-shadow:0 18px 50px rgba(52,32,74,.08);padding:24px}.bannerListSection{margin-top:24px}.editorTitle,.listHeading{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:20px}.editorTitle h2,.listHeading h2{margin:4px 0 0;font-size:22px}.formGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.formGrid label{display:flex;flex-direction:column;gap:7px;font-size:13px;font-weight:750}.formGrid input,.formGrid select{width:100%;border:1px solid #ddd3e6;border-radius:12px;background:#fff;padding:11px 12px;font:inherit;outline:none}.formGrid input:focus,.formGrid select:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.08)}.formGrid small{font-weight:400;color:#756c7c}.fullField{grid-column:1/-1}.uploadField{padding:14px;border:1px solid #e4d9ec;border-radius:16px;background:#faf8fc}.previewGrid{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(220px,.8fr);gap:14px;margin-top:18px}.bannerPreview{padding:12px;border:1px dashed #d9c9e8;border-radius:16px;background:#faf8fc}.bannerPreview span{display:block;margin-bottom:8px;font-size:12px;font-weight:800;color:#6d28d9}.bannerPreview img{display:block;width:100%;object-fit:cover;border-radius:13px;background:#eee}.desktopPreview img{height:120px}.mobilePreview img{height:120px}.editHint{margin:14px 0 0;color:#6d6474;font-size:12px}.saveButton{margin-top:18px;border:0;border-radius:13px;background:linear-gradient(135deg,#4c1d95,#7c3aed);color:#fff;padding:12px 22px;font:inherit;font-weight:850;cursor:pointer}.saveButton:disabled{opacity:.55;cursor:not-allowed}.formNotice{margin:14px 0 0;padding:11px 13px;border-radius:11px}.formNotice.error{background:#fff0f0;color:#a32121}.formNotice.success{background:#effcf4;color:#17653a}.bannerList{display:grid;gap:14px}.bannerList article{display:grid;grid-template-columns:250px 1fr auto;gap:18px;align-items:center;border:1px solid #e7deee;border-radius:18px;padding:12px}.listPreviews{position:relative;width:250px;height:86px}.listPreviews img{object-fit:cover;background:#eee;border:1px solid #e5dced}.listDesktop{width:230px;height:76px;border-radius:13px}.listMobile{position:absolute;left:0;bottom:0;width:76px;height:46px;border-radius:10px;box-shadow:0 5px 16px rgba(35,20,48,.22)}.bannerMeta h3{margin:7px 0 4px;font-size:17px}.bannerMeta p,.bannerMeta small{margin:0;color:#766c7d}.status,.sponsored{display:inline-flex;margin-left:6px;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:850}.status--active{background:#e9f9ef;color:#166534}.status--draft{background:#f4effa;color:#6b21a8}.status--disabled{background:#f1f1f1;color:#555}.sponsored{background:#fff3d7;color:#8a5200}.bannerActions{display:flex;flex-direction:column;gap:7px}.bannerActions button{border:1px solid #ddd2e7;background:#fff;border-radius:10px;padding:8px 10px;font:inherit;cursor:pointer;white-space:nowrap}.bannerActions .danger{border-color:#ffd0d0;color:#a52121;background:#fff7f7}.emptyBox{padding:30px;text-align:center;color:#766d7c;border:1px dashed #ddd2e7;border-radius:16px}@media(max-width:760px){.bannerAdmin{padding:20px 10px 50px}.bannerAdminHeader{display:block}.bannerAdminHeader nav{margin-top:15px}.formGrid{grid-template-columns:1fr}.fullField{grid-column:auto}.bannerEditor,.bannerListSection{padding:16px;border-radius:18px}.previewGrid{grid-template-columns:1fr}.desktopPreview img,.mobilePreview img{height:92px}.bannerList article{grid-template-columns:1fr}.listPreviews{width:100%;height:98px}.listDesktop{width:100%;height:88px}.listMobile{width:92px;height:54px}.bannerActions{flex-direction:row;flex-wrap:wrap}}
`;
