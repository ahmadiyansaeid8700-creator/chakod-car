import { desc, eq } from "drizzle-orm";

import { getDb } from "../db";
import { contentArticles } from "../db/schema";
import { articles as fallbackArticles, type Article } from "../app/articles/article-data";
import { parseStoredArticleSections } from "./article-content-format";

export type PublishedArticle = Article & {
  seoTitle?: string;
  seoDescription?: string;
};

function rowToArticle(row: typeof contentArticles.$inferSelect): PublishedArticle {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category as Article["category"],
    readingMinutes: Math.max(1, Number(row.readingMinutes || 5)),
    updatedAt: row.publishedAt || row.updatedAt || row.createdAt,
    sections: parseStoredArticleSections(row.bodyJson),
    seoTitle: row.seoTitle || row.title,
    seoDescription: row.seoDescription || row.excerpt,
  };
}

export async function getPublishedArticles(): Promise<PublishedArticle[]> {
  try {
    const rows = await getDb()
      .select()
      .from(contentArticles)
      .orderBy(desc(contentArticles.publishedAt), desc(contentArticles.id));

    if (!rows.length) return fallbackArticles;

    const managedSlugs = new Set(rows.map((row) => row.slug));
    const publishedManaged = rows
      .filter((row) => row.status === "published")
      .map(rowToArticle);

    return [
      ...publishedManaged,
      ...fallbackArticles.filter((article) => !managedSlugs.has(article.slug)),
    ];
  } catch {
    return fallbackArticles;
  }
}

export async function getPublishedArticle(slug: string): Promise<PublishedArticle | null> {
  try {
    const [row] = await getDb()
      .select()
      .from(contentArticles)
      .where(eq(contentArticles.slug, slug))
      .limit(1);

    if (row) {
      return row.status === "published" ? rowToArticle(row) : null;
    }
  } catch {
    // Before the content migration is applied, launch fallback articles remain available.
  }

  return fallbackArticles.find((article) => article.slug === slug) || null;
}
