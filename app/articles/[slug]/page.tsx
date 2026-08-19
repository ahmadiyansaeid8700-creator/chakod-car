import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import { articles as fallbackArticles } from "../article-data";
import { seoArticles } from "../seo";
import { getPublishedArticle } from "../../../lib/content-articles";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const SITE_URL = "https://chakod.com";

export function generateStaticParams() {
  return [...seoArticles, ...fallbackArticles].map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) return { title: "مقاله پیدا نشد | چاکود" };

  const title = article.seoTitle || `${article.title} | چاکود`;
  const description = article.seoDescription || article.excerpt;
  const canonical = `${SITE_URL}/articles/${article.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      locale: "fa_IR",
      siteName: "چاکود",
      url: canonical,
      title,
      description,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
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

  const canonical = `${SITE_URL}/articles/${article.slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    inLanguage: "fa-IR",
    mainEntityOfPage: canonical,
    author: {
      "@type": "Organization",
      name: "چاکود",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "چاکود",
      url: SITE_URL,
    },
  };

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
    </>
  );
}
