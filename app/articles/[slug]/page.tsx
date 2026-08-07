import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import { articles as fallbackArticles } from "../article-data";
import { getPublishedArticle } from "../../../lib/content-articles";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return fallbackArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) return { title: "مقاله پیدا نشد | چاکود" };

  return {
    title: article.seoTitle || `${article.title} | چاکود`,
    description: article.seoDescription || article.excerpt,
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) notFound();

  return (
    <>
      <Header />
      <main className={styles.page} dir="rtl">
        <div className={styles.shell}>
          <nav className={styles.breadcrumb} aria-label="مسیر مقاله">
            <Link href="/">خانه</Link><span>/</span>
            <Link href="/articles">مجله چاکود</Link><span>/</span>
            <span>{article.category}</span>
          </nav>

          <article>
            <header className={styles.hero}>
              <div className={styles.meta}>
                <span>{article.category}</span>
                <span>{new Intl.NumberFormat("fa-IR").format(article.readingMinutes)} دقیقه مطالعه</span>
                <span>به‌روزرسانی {article.updatedAt}</span>
              </div>
              <h1>{article.title}</h1>
              <p>{article.excerpt}</p>
            </header>

            <div className={styles.content}>
              {article.sections.map((section, sectionIndex) => (
                <section className={styles.section} key={`${sectionIndex}-${section.heading}`}>
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((paragraph, paragraphIndex) => (
                    <p key={`${paragraphIndex}-${paragraph}`}>{paragraph}</p>
                  ))}
                  {section.items?.length ? (
                    <ul>{section.items.map((item, itemIndex) => <li key={`${itemIndex}-${item}`}>{item}</li>)}</ul>
                  ) : null}
                </section>
              ))}
            </div>
          </article>

          <section className={styles.cta}>
            <div>
              <h2>از راهنما به بازار بروید</h2>
              <p>آگهی‌ها را جست‌وجو، قیمت‌ها را بررسی و خودروهای منتخب را کنار هم مقایسه کنید.</p>
            </div>
            <div>
              <Link href="/cars">بازار خودرو</Link>
              <Link href="/cars/price-guide">راهنمای قیمت</Link>
              <Link href="/cars/compare">مقایسه</Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
