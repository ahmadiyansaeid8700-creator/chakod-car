"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

type ArticleRow = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  editor_body: string;
  reading_minutes: number;
  status: string;
  seo_title: string;
  seo_description: string;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  articles?: ArticleRow[];
  article?: ArticleRow;
};

type Draft = Omit<ArticleRow, "id" | "published_at" | "created_at" | "updated_at"> & { id?: number };

const EMPTY_DRAFT: Draft = {
  slug: "",
  title: "",
  excerpt: "",
  category: "راهنمای خودرو",
  editor_body: "## بخش اول\n\nمتن مقاله را اینجا بنویسید.\n\n- نکته اول",
  reading_minutes: 5,
  status: "draft",
  seo_title: "",
  seo_description: "",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

export default function ArticleAdminClient() {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/articles", { cache: "no-store", credentials: "include" });
      const payload = await readJson<ApiResponse>(response);
      if (!response.ok || !payload?.success) {
        setError(payload?.message || "فهرست مقالات دریافت نشد.");
        return;
      }
      setArticles(payload.articles || []);
    } catch {
      setError("ارتباط با مدیریت محتوا برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? articles : articles.filter((article) => article.status === filter)),
    [articles, filter],
  );

  function edit(article: ArticleRow) {
    setDraft({
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      category: article.category,
      editor_body: article.editor_body,
      reading_minutes: article.reading_minutes,
      status: article.status,
      seo_title: article.seo_title,
      seo_description: article.seo_description,
    });
    setNotice("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setDraft({ ...EMPTY_DRAFT });
    setError("");
    setNotice("");
  }

  async function save(statusOverride?: string) {
    if (working) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/articles", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, status: statusOverride || draft.status, action: "save" }),
      });
      const payload = await readJson<ApiResponse>(response);
      if (!response.ok || !payload?.success) {
        setError(payload?.message || "ذخیره مقاله انجام نشد.");
        return;
      }
      setNotice(payload.message || "مقاله ذخیره شد.");
      if (payload.article) edit(payload.article);
      await load();
    } catch {
      setError("ارتباط با سرویس ذخیره مقاله برقرار نشد.");
    } finally {
      setWorking(false);
    }
  }

  async function setStatus(article: ArticleRow, status: "draft" | "published" | "archived") {
    if (working) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/admin/articles", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_status", id: article.id, status }),
      });
      const payload = await readJson<ApiResponse>(response);
      if (!response.ok || !payload?.success) {
        setError(payload?.message || "تغییر وضعیت انجام نشد.");
        return;
      }
      setNotice(payload.message || "وضعیت مقاله تغییر کرد.");
      await load();
    } catch {
      setError("ارتباط با مدیریت مقاله برقرار نشد.");
    } finally {
      setWorking(false);
    }
  }

  async function remove(article: ArticleRow) {
    if (working || !window.confirm(`مقاله «${article.title}» حذف شود؟`)) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/admin/articles", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: article.id }),
      });
      const payload = await readJson<ApiResponse>(response);
      if (!response.ok || !payload?.success) {
        setError(payload?.message || "حذف مقاله انجام نشد.");
        return;
      }
      if (draft.id === article.id) reset();
      setNotice(payload.message || "مقاله حذف شد.");
      await load();
    } catch {
      setError("ارتباط با مدیریت مقاله برقرار نشد.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span>CONTENT MANAGEMENT</span>
            <h1>مدیریت مجله چاکود</h1>
            <p>مقاله را Draft نگه دارید، پیش از انتشار ویرایش کنید و فقط نسخه Published وارد مجله عمومی شود.</p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/articles" target="_blank">مشاهده مجله</Link>
            <button type="button" onClick={reset}>مقاله جدید</button>
          </div>
        </header>

        {error ? <div className={styles.error}>{error}</div> : null}
        {notice ? <div className={styles.notice}>{notice}</div> : null}

        <section className={styles.editor}>
          <div className={styles.editorHead}>
            <div>
              <span>{draft.id ? `ویرایش مقاله #${draft.id}` : "مقاله جدید"}</span>
              <h2>{draft.title || "عنوان مقاله"}</h2>
            </div>
            <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
              <option value="draft">پیش‌نویس</option>
              <option value="published">منتشرشده</option>
              <option value="archived">آرشیو</option>
            </select>
          </div>

          <div className={styles.formGrid}>
            <label>عنوان<input value={draft.title} maxLength={220} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
            <label>Slug انگلیسی<input dir="ltr" value={draft.slug} maxLength={120} placeholder="used-car-buying-guide" onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} /></label>
            <label>دسته<input value={draft.category} maxLength={80} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} /></label>
            <label>زمان مطالعه<input type="number" min={1} max={60} value={draft.reading_minutes} onChange={(event) => setDraft((current) => ({ ...current, reading_minutes: Number(event.target.value) || 1 }))} /></label>
            <label className={styles.wide}>خلاصه<textarea value={draft.excerpt} maxLength={500} onChange={(event) => setDraft((current) => ({ ...current, excerpt: event.target.value }))} /></label>
            <label className={styles.wide}>
              متن مقاله
              <textarea className={styles.bodyEditor} value={draft.editor_body} maxLength={30000} onChange={(event) => setDraft((current) => ({ ...current, editor_body: event.target.value }))} />
              <small>تیتر بخش: <code>## عنوان</code> · آیتم لیست: <code>- مورد</code> · پاراگراف‌ها را با خط خالی جدا کنید.</small>
            </label>
            <label>عنوان SEO<input value={draft.seo_title} maxLength={220} onChange={(event) => setDraft((current) => ({ ...current, seo_title: event.target.value }))} /></label>
            <label>توضیح SEO<input value={draft.seo_description} maxLength={320} onChange={(event) => setDraft((current) => ({ ...current, seo_description: event.target.value }))} /></label>
          </div>

          <div className={styles.editorActions}>
            <button type="button" disabled={working} onClick={() => void save()}>{working ? "در حال ذخیره…" : "ذخیره"}</button>
            <button className={styles.publish} type="button" disabled={working} onClick={() => void save("published")}>ذخیره و انتشار</button>
          </div>
        </section>

        <section className={styles.listSection}>
          <div className={styles.listHead}>
            <h2>مقالات</h2>
            <div>
              {["all", "draft", "published", "archived"].map((item) => (
                <button key={item} className={filter === item ? styles.activeFilter : undefined} type="button" onClick={() => setFilter(item)}>{item === "all" ? "همه" : item}</button>
              ))}
            </div>
          </div>

          {loading ? <div className={styles.empty}>در حال دریافت مقالات…</div> : visible.length ? (
            <div className={styles.articleList}>
              {visible.map((article) => (
                <article key={article.id}>
                  <div>
                    <span className={`${styles.status} ${styles[article.status]}`}>{article.status}</span>
                    <h3>{article.title}</h3>
                    <p>{article.category} · {article.slug} · آخرین تغییر {formatDate(article.updated_at)}</p>
                  </div>
                  <div className={styles.rowActions}>
                    <button type="button" onClick={() => edit(article)}>ویرایش</button>
                    {article.status !== "published" ? <button type="button" onClick={() => void setStatus(article, "published")}>انتشار</button> : <button type="button" onClick={() => void setStatus(article, "draft")}>برگرداندن به Draft</button>}
                    <button type="button" onClick={() => void setStatus(article, "archived")}>آرشیو</button>
                    <button className={styles.danger} type="button" onClick={() => void remove(article)}>حذف</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <div className={styles.empty}>مقاله‌ای در این وضعیت وجود ندارد.</div>}
        </section>
      </div>
    </main>
  );
}
