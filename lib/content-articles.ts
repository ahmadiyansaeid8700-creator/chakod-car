import { desc, eq } from "drizzle-orm";

import { getDb } from "../db";
import { contentArticles } from "../db/schema";
import { articles as fallbackArticles, type Article } from "../app/articles/article-data";
import { parseStoredArticleSections } from "./article-content-format";

function rowToArticle(row: typeof contentArticles.$inferSelect): Article {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category as Article["category"],
    readingMinutes: Math.max(1, Number(row.readingMinutes || 5)),
    updatedAt: row.publishedAt || row.updatedAt || row.createdAt,
    sections: parseStoredArticleSections(row.bodyJson),
  };
}

export async function getPublishedArticles(): Promise<Article[]> {
  try {
    const rows = await getDb()
      .select()
      .from(contentArticles)
      .where(eq(contentArticles.status, "published"))
      .orderBy(desc(contentArticles.publishedAt), desc(contentArticles.id));

    if (!rows.length) return fallbackArticles;

    const managed = rows.map(rowToArticle);
    const managedSlugs = new Set(managed.map((article) => article.slug));
    return [...managed, ...fallbackArticles.filter((article) => !managedSlugs.has(article.slug))];
  } catch {
    return fallbackArticles;
  }
}

export async function getPublishedArticle(slug: string): Promise<Article | null> {
  try {
    const [row] = await getDb()
      .select()
      .from(contentArticles)
      .where(eq(contentArticles.slug, slug))
      .limit(1);

    if (row?.status === "published") return rowToArticle(row);
  } catch {
    // Before the content migration is applied, launch fallback articles remain available.
  }

  return fallbackArticles.find((article) => article.slug === slug) || null;
}
