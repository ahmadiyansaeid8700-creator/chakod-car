"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
import PersianDatePicker, { formatPersianDate } from "../../components/PersianDatePicker";
import styles from "./BannerBookingClient.module.css";

type Dealer = { dealer_id: number; dealer_name: string; role: string; permissions?: string[] };
type Province = {
  province: string;
  is_large: boolean;
  banner_price_toman: number;
  banner_day_capacity: number;
  banner_is_active: boolean;
};
type Reservation = {
  id: number;
  dealer_id: number;
  order_id?: number | null;
  province: string;
  slot_key: string;
  start_date: string;
  end_date: string;
  reserved_days: number;
  daily_price_toman: number;
  total_price_toman: number;
  title: string;
  desktop_image_url?: string | null;
  mobile_image_url?: string | null;
  status: string;
  admin_note?: string | null;
  view_count: number;
  click_count: number;
  created_at: string;
};
type CommerceResponse = {
  success?: boolean;
  message?: string;
  dealers?: Dealer[];
  provinces?: Province[];
  banner_reservations?: Reservation[];
};

type UploadResponse = { success?: boolean; message?: string; url?: string };

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const statusLabels: Record<string, string> = {
  draft: "پیش‌نویس",
  pending_payment: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  pending_review: "در انتظار بررسی",
  approved: "تأییدشده",
  scheduled: "زمان‌بندی‌شده",
  active: "در حال نمایش",
  expired: "پایان‌یافته",
  rejected: "ردشده",
  cancelled: "لغوشده",
  refunded: "بازگشت وجه",
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("پاسخ سرور معتبر نیست.");
  }
}

function countDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

async function uploadImage(file: File, kind: "cover" | "gallery") {
  const body = new FormData();
  body.set("file", file);
  body.set("kind", kind);
  const response = await fetch("/api/auth/professional-profile/upload", {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body,
  });
  const payload = await readJson<UploadResponse>(response);
  if (!response.ok || !payload.success || !payload.url) {
    throw new Error(payload.message || "آپلود تصویر انجام نشد.");
  }
  return payload.url;
}

export default function BannerBookingClient() {
  const [data, setData] = useState<CommerceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [uploading, setUploading] = useState<"desktop" | "mobile" | "">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dealerId, setDealerId] = useState(0);
  const [province, setProvince] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [desktopImageUrl, setDesktopImageUrl] = useState("");
  const [mobileImageUrl, setMobileImageUrl] = useState("");
  const [destinationType, setDestinationType] = useState<"dealer" | "listing" | "url">("dealer");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [checkingDiscount, setCheckingDiscount] = useState(false);
  const [discountQuote, setDiscountQuote] = useState<{ original_amount_toman: number; discount_amount_toman: number; final_amount_toman: number; code?: string | null; title?: string | null } | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/commerce", {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = await readJson<CommerceResponse>(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || "اطلاعات رزرو بنر دریافت نشد.");
      setData(payload);
      if (!dealerId && payload.dealers?.[0]) setDealerId(payload.dealers[0].dealer_id);
      const firstProvince = payload.provinces?.find((item) => item.banner_is_active);
      if (!province && firstProvince) setProvince(firstProvince.province);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedProvince = useMemo(
    () => data?.provinces?.find((item) => item.province === province) || null,
    [data?.provinces, province],
  );
  const days = useMemo(() => countDays(startDate, endDate), [startDate, endDate]);
  const total = (selectedProvince?.banner_price_toman || 0) * days;
  const finalTotal = discountQuote?.final_amount_toman ?? total;

  useEffect(() => { setDiscountQuote(null); }, [province, startDate, endDate]);

  async function handleImage(event: ChangeEvent<HTMLInputElement>, target: "desktop" | "mobile") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(target);
    setError("");
    try {
      const url = await uploadImage(file, target === "desktop" ? "cover" : "gallery");
      if (target === "desktop") setDesktopImageUrl(url);
      else setMobileImageUrl(url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "خطای آپلود");
    } finally {
      setUploading("");
    }
  }

  async function validateDiscount() {
    if (!discountCode.trim() || !selectedProvince || total <= 0) return;
    setCheckingDiscount(true);
    setError("");
    try {
      const response = await fetch("/api/auth/commerce", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          action: "validate_discount",
          discount_code: discountCode.trim(),
          service_key: selectedProvince.is_large ? "home_banner_large" : "home_banner_regular",
          amount_toman: total,
          province,
        }),
      });
      const payload = await readJson<{ success?: boolean; message?: string; discount?: typeof discountQuote }>(response);
      if (!response.ok || !payload.success || !payload.discount) throw new Error(payload.message || "کد تخفیف معتبر نیست.");
      setDiscountQuote(payload.discount);
    } catch (discountError) {
      setDiscountQuote(null);
      setError(discountError instanceof Error ? discountError.message : "بررسی کد تخفیف انجام نشد.");
    } finally {
      setCheckingDiscount(false);
    }
  }

  async function reserve() {
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/commerce", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          action: "reserve_banner",
          dealer_id: dealerId,
          province,
          slot_key: "home_primary",
          start_date: startDate,
          end_date: endDate,
          title,
          subtitle,
          desktop_image_url: desktopImageUrl,
          mobile_image_url: mobileImageUrl,
          destination_type: destinationType,
          destination_url: destinationUrl,
          discount_code: discountCode.trim() || undefined,
        }),
      });
      const payload = await readJson<{
        success?: boolean;
        message?: string;
        order?: { order_no: string; amount_toman: number; original_amount_toman?: number; discount_amount_toman?: number; discount_code?: string | null };
      }>(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || "رزرو بنر انجام نشد.");
      const discountText = payload.order && Number(payload.order.discount_amount_toman || 0) > 0
        ? ` تخفیف ${formatToman(Number(payload.order.discount_amount_toman || 0))} با کد ${payload.order.discount_code}.`
        : "";
      setNotice(`${payload.message || "رزرو ثبت شد."}${payload.order ? ` شماره سفارش ${payload.order.order_no}.` : ""}${discountText}`);
      setTitle("");
      setSubtitle("");
      setDesktopImageUrl("");
      setMobileImageUrl("");
      setDestinationUrl("");
      setDiscountCode("");
      setDiscountQuote(null);
      await load();
    } catch (reserveError) {
      setError(reserveError instanceof Error ? reserveError.message : "خطای ناشناخته");
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return <main className={styles.page} dir="rtl"><section className={styles.stateCard}><span className={styles.loader}/><h1>در حال آماده‌سازی تقویم بنر</h1><p>ظرفیت و قیمت استان‌ها در حال دریافت است.</p></section></main>;
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <Link href="/account" className={styles.back}>← حساب من</Link>
            <span>تبلیغات صفحه اصلی</span>
            <h1>رزرو بنر استانی</h1>
            <p>نمایشگاه، تاریخ و استان را انتخاب کنید؛ ظرفیت و مبلغ همان لحظه محاسبه می‌شود.</p>
          </div>
          <Link href="/account/business" className={styles.commandLink}>مرکز فرمان نمایشگاه</Link>
        </header>

        {error && <div className={styles.error}>{error}</div>}
        {notice && <div className={styles.notice}>{notice}</div>}

        {!data?.dealers?.length ? (
          <section className={styles.stateCard}>
            <h2>نمایشگاه تأییدشده‌ای پیدا نشد</h2>
            <p>رزرو بنر صفحه اصلی فقط از حساب نمایشگاهی انجام می‌شود.</p>
            <Link href="/account">تکمیل پروفایل نمایشگاه</Link>
          </section>
        ) : (
          <section className={styles.bookingGrid}>
            <div className={styles.formPanel}>
              <div className={styles.stepHeader}><b>۱</b><div><h2>نمایشگاه و محدوده نمایش</h2><p>بنر فقط در صفحه اصلی کاربران استان انتخاب‌شده دیده می‌شود.</p></div></div>
              <div className={styles.twoCols}>
                <label>نمایشگاه<select value={dealerId} onChange={(event)=>setDealerId(Number(event.target.value))}>{data.dealers.map((dealer)=><option key={dealer.dealer_id} value={dealer.dealer_id}>{dealer.dealer_name}</option>)}</select></label>
                <label>استان<select value={province} onChange={(event)=>setProvince(event.target.value)}>{(data.provinces||[]).filter((item)=>item.banner_is_active).map((item)=><option key={item.province} value={item.province}>{item.province}{item.is_large?" — استان بزرگ":""}</option>)}</select></label>
              </div>
              <div className={styles.twoCols}>
                <label>تاریخ شروع<PersianDatePicker min={localDateValue()} value={startDate} onChange={setStartDate} placeholder="انتخاب تاریخ شروع"/></label>
                <label>تاریخ پایان<PersianDatePicker min={startDate||localDateValue()} value={endDate} onChange={setEndDate} placeholder="انتخاب تاریخ پایان"/></label>
              </div>

              <div className={styles.stepHeader}><b>۲</b><div><h2>محتوای بنر</h2><p>نسخه موبایل و دسکتاپ جداگانه بارگذاری شود تا نمایش حرفه‌ای بماند.</p></div></div>
              <label>عنوان بنر<input value={title} onChange={(event)=>setTitle(event.target.value)} placeholder="مثلاً فروش ویژه خودروهای وارداتی" maxLength={180}/></label>
              <label>متن کوتاه<textarea value={subtitle} onChange={(event)=>setSubtitle(event.target.value)} placeholder="پیام کوتاه و شفاف تبلیغ" maxLength={300}/></label>
              <div className={styles.uploadGrid}>
                <label className={styles.uploadBox}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event)=>void handleImage(event,"desktop")}/>
                  {desktopImageUrl?<img src={desktopImageUrl} alt="پیش‌نمایش دسکتاپ"/>:<><b>{uploading==="desktop"?"در حال آپلود...":"تصویر دسکتاپ"}</b><span>نسبت پیشنهادی ۳ به ۱</span></>}
                </label>
                <label className={styles.uploadBox}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event)=>void handleImage(event,"mobile")}/>
                  {mobileImageUrl?<img src={mobileImageUrl} alt="پیش‌نمایش موبایل"/>:<><b>{uploading==="mobile"?"در حال آپلود...":"تصویر موبایل"}</b><span>نسبت پیشنهادی ۴ به ۵</span></>}
                </label>
              </div>
              <div className={styles.twoCols}>
                <label>نوع مقصد<select value={destinationType} onChange={(event)=>setDestinationType(event.target.value as typeof destinationType)}><option value="dealer">صفحه نمایشگاه</option><option value="listing">یک آگهی خاص</option><option value="url">لینک دیگر</option></select></label>
                <label>لینک مقصد<input dir="ltr" value={destinationUrl} onChange={(event)=>setDestinationUrl(event.target.value)} placeholder="/dealer/... یا https://..."/></label>
              </div>
              <div className={styles.couponBox}>
                <div><b>کد تخفیف</b><span>پس از بررسی، مبلغ نهایی به‌روزرسانی می‌شود.</span></div>
                <input dir="ltr" value={discountCode} onChange={(event)=>{setDiscountCode(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,""));setDiscountQuote(null);}} placeholder="CHAKOD20"/>
                <button type="button" disabled={checkingDiscount||!discountCode||!total} onClick={()=>void validateDiscount()}>{checkingDiscount?"در حال بررسی...":"اعمال کد"}</button>
              </div>
              {discountQuote && <div className={styles.couponSuccess}><span>{discountQuote.title || discountQuote.code}</span><strong>{formatToman(discountQuote.discount_amount_toman)} تخفیف</strong></div>}
              <button className={styles.submitButton} disabled={working||uploading!==""||!dealerId||!province||!days||!title||!desktopImageUrl} onClick={()=>void reserve()}>{working?"در حال ساخت رزرو...":"ثبت رزرو و ساخت پیش‌فاکتور"}</button>
            </div>

            <aside className={styles.summaryPanel}>
              <span>پیش‌فاکتور زنده</span>
              <h2>{province || "استان انتخاب نشده"}</h2>
              <dl><div><dt>تعرفه روزانه</dt><dd>{formatToman(selectedProvince?.banner_price_toman||0)}</dd></div><div><dt>تعداد روز</dt><dd>{formatNumber(days)}</dd></div><div><dt>ظرفیت روزانه</dt><dd>{formatNumber(selectedProvince?.banner_day_capacity||0)} جایگاه</dd></div></dl>
              <div className={styles.total}>{discountQuote&&<><span>مبلغ اولیه</span><del>{formatToman(total)}</del><span>تخفیف</span><b>{formatToman(discountQuote.discount_amount_toman)}</b></>}<span>مبلغ نهایی</span><strong>{formatToman(finalTotal)}</strong></div>
              <p>پس از پرداخت، بنر برای بررسی مدیریت ارسال می‌شود. تغییر تصویر پس از تأیید نیازمند بررسی دوباره است.</p>
            </aside>
          </section>
        )}

        <section className={styles.historyPanel}>
          <header><div><span>سوابق تبلیغات</span><h2>رزروهای بنر من</h2></div><button onClick={()=>void load()}>به‌روزرسانی</button></header>
          {data?.banner_reservations?.length ? <div className={styles.historyGrid}>{data.banner_reservations.map((item)=><article key={item.id}>{item.desktop_image_url?<img src={item.desktop_image_url} alt=""/>:<div className={styles.placeholder}/>}<div><span>{item.province} · {formatPersianDate(item.start_date)} تا {formatPersianDate(item.end_date)}</span><h3>{item.title}</h3><strong>{formatToman(item.total_price_toman)}</strong><small className={`${styles.status} ${styles[`status_${item.status}`]||""}`}>{statusLabels[item.status]||item.status}</small>{item.admin_note&&<p>{item.admin_note}</p>}<footer><span>{formatNumber(item.view_count)} نمایش</span><span>{formatNumber(item.click_count)} کلیک</span></footer></div></article>)}</div>:<div className={styles.empty}>هنوز بنری رزرو نشده است.</div>}
        </section>
      </div>
      <MobileBottomNav />
    </main>
  );
}
