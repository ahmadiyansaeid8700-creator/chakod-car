import type { Metadata } from "next";
import Link from "next/link";

import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import { articleCategories, articles } from "./article-data";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "مجله و راهنماهای چاکود",
  description: "راهنماهای کاربردی خرید، فروش، قیمت و بازار خودرو در چاکود.",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const query = (await searchParams) || {};
  const rawCategory = query.category;
  const category = Array.isArray(rawCategory) ? rawCategory[0] || "" : rawCategory || "";
  const visible = category ? articles.filter((article) => article.category === category) : articles;

  return (
    <>
      <Header />
      <main className={styles.page} dir="rtl">
        <div className={styles.shell}>
          <section className={styles.hero}>
            <span>CHAKOD MAGAZINE</span>
            <h1>مقالات و راهنماهای چاکود</h1>
            <p>راهنماهای عملی برای بررسی آگهی، مقایسه خودرو و شناخت بهتر بازار؛ بدون جایگزین کردن کارشناسی فنی یا حقوقی.</p>
          </section>

          <nav className={styles.filters} aria-label="دسته‌بندی مقالات">
            <Link className={!category ? styles.active : undefined} href="/articles">همه</Link>
            {articleCategories.map((item) => (
              <Link
                key={item}
                className={category === item ? styles.active : undefined}
                href={`/articles?category=${encodeURIComponent(item)}`}
              >
                {item}
              </Link>
            ))}
          </nav>

          {visible.length ? (
            <section className={styles.grid}>
              {visible.map((article) => (
                <Link className={styles.card} href={`/articles/${article.slug}`} key={article.slug}>
                  <div className={styles.meta}>
                    <span>{article.category}</span>
                    <span>{new Intl.NumberFormat("fa-IR").format(article.readingMinutes)} دقیقه مطالعه</span>
                  </div>
                  <h2>{article.title}</h2>
                  <p>{article.excerpt}</p>
                  <b>مطالعه مقاله ←</b>
                </Link>
              ))}
            </section>
          ) : (
            <div className={styles.empty}>در این دسته هنوز مقاله‌ای منتشر نشده است.</div>
          )}

          <div className={styles.tools}>
            <Link href="/cars/price-guide">راهنمای قیمت بازار</Link>
            <Link href="/cars/compare">مقایسه خودروها</Link>
            <Link href="/cars">بازار خودرو</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
