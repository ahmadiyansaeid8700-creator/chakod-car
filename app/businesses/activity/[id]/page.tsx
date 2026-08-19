"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "./page.module.css";

type GalleryItem = { id: string; url: string; title: string; caption: string };
type PublicBusiness = {
  id: number;
  type: string;
  type_title: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  neighborhood: string;
  address: string;
  is_verified: boolean;
};
type Resume = {
  activity_id: number;
  headline: string;
  about: string;
  specialties: string[];
  gallery: GalleryItem[];
  published: boolean;
  updated_at: string;
};
type ResponseData = { success?: boolean; message?: string; activity?: PublicBusiness; resume?: Resume };

function normalizeMediaUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    return raw
      .replace(/^http:\/\/api\.chakod\.com\//i, "https://api.chakod.com/")
      .replace(/^https:\/\/api\.chakod\.com\/uploads\//i, "https://chakod.com/uploads/");
  }
  if (raw.startsWith("/uploads/")) return `https://chakod.com${raw}`;
  return raw;
}

export default function PublicBusinessResumePage() {
  const params = useParams<{ id: string }>();
  const id = Math.max(0, Math.round(Number(params?.id || 0)));
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/business-resumes/${id}`, {
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const payload = (await response.json().catch(() => null)) as ResponseData | null;
        if (!response.ok || !payload?.success || !payload.activity || !payload.resume) {
          throw new Error(payload?.message || "صفحه این کسب‌وکار در دسترس نیست.");
        }
        setBusiness(payload.activity);
        setResume(payload.resume);
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setError(caught instanceof Error ? caught.message : "صفحه کسب‌وکار دریافت نشد.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id]);

  if (loading) return <main className={styles.state} dir="rtl">در حال دریافت رزومه مجموعه…</main>;
  if (!business || !resume || error) {
    return <main className={styles.state} dir="rtl"><strong>{error || "صفحه کسب‌وکار پیدا نشد."}</strong><a href="/">صفحه اصلی</a></main>;
  }

  const location = [business.neighborhood, business.city, business.province].filter(Boolean).join("، ");
  const phone = business.phone.trim();
  const mapQuery = [business.address, location].filter(Boolean).join(" ").trim();
  const mapHref = mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : "";

  return (
    <main className={styles.page} dir="rtl">
      <header className={styles.topbar}>
        <a href="/" className={styles.brand}><img src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></a>
        <a href="/" className={styles.home}>صفحه اصلی</a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroMark}>{business.name.slice(0, 1)}</div>
        <div className={styles.heroCopy}>
          <span>{business.type_title}</span>
          <h1>{business.name}</h1>
          <p>{resume.headline || location || "کسب‌وکار فعال در چاکود"}</p>
          <div className={styles.heroMeta}>
            {location ? <em>{location}</em> : null}
            {business.is_verified ? <em data-verified="true">تأییدشده چاکود</em> : null}
          </div>
        </div>
      </section>

      <div className={styles.layout}>
        <article className={styles.content}>
          <section className={styles.section}>
            <span className={styles.eyebrow}>درباره مجموعه</span>
            <h2>{resume.headline || `درباره ${business.name}`}</h2>
            <p>{resume.about || "این مجموعه هنوز توضیح کاملی برای رزومه خود ثبت نکرده است."}</p>
          </section>

          {resume.specialties.length ? (
            <section className={styles.section}>
              <span className={styles.eyebrow}>تخصص‌ها و خدمات</span>
              <h2>چه خدماتی ارائه می‌شود؟</h2>
              <div className={styles.tags}>{resume.specialties.map((item) => <span key={item}>{item}</span>)}</div>
            </section>
          ) : null}

          {resume.gallery.length ? (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div><span className={styles.eyebrow}>آلبوم مجموعه</span><h2>تصاویر و نمونه‌کارها</h2></div>
                <strong>{new Intl.NumberFormat("fa-IR").format(resume.gallery.length)} تصویر</strong>
              </div>
              <div className={styles.gallery}>
                {resume.gallery.map((item) => (
                  <figure key={item.id}>
                    <img src={normalizeMediaUrl(item.url)} alt={item.title || business.name} loading="lazy" />
                    {(item.title || item.caption) ? <figcaption>{item.title ? <strong>{item.title}</strong> : null}{item.caption ? <span>{item.caption}</span> : null}</figcaption> : null}
                  </figure>
                ))}
              </div>
            </section>
          ) : null}
        </article>

        <aside className={styles.sidebar}>
          <div><span>موقعیت</span><strong>{business.address || location || "ثبت نشده"}</strong></div>
          {phone ? <a className={styles.primary} href={`tel:${phone}`}>تماس با {business.name}</a> : null}
          {mapHref ? <a href={mapHref} target="_blank" rel="noreferrer">مسیریابی روی نقشه</a> : null}
          <small>این رزومه توسط صاحب کسب‌وکار در چاکود مدیریت می‌شود.</small>
        </aside>
      </div>
    </main>
  );
}
