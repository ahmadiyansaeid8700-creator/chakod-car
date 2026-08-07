import { desc, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { contentArticles } from "../../../../db/schema";
import {
  articleSectionsToEditorText,
  parseArticleEditorText,
  parseStoredArticleSections,
} from "../../../../lib/article-content-format";
import { jsonResponse, rejectCrossSiteMutation } from "../../../../lib/chakod-auth-proxy";
import { readServerIdentity } from "../../../../lib/server-route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 120;
}

async function requireContentAdmin() {
  const identity = await readServerIdentity("/api/admin-me.php");
  if (!identity?.success || !identity.is_admin) return false;

  const permissions = Array.isArray(identity.admin?.permissions)
    ? identity.admin.permissions.map(String)
    : [];
  const role = String(identity.admin?.role || identity.admin?.role_key || "");

  return (
    identity.is_site_owner === true ||
    permissions.includes("*") ||
    permissions.includes("settings.manage") ||
    permissions.includes("content.manage") ||
    ["site_owner", "super_admin", "admin"].includes(role)
  );
}

function publicAdminRow(row: typeof contentArticles.$inferSelect) {
  const sections = parseStoredArticleSections(row.bodyJson);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    editor_body: articleSectionsToEditorText(sections),
    reading_minutes: row.readingMinutes,
    status: row.status,
    seo_title: row.seoTitle,
    seo_description: row.seoDescription,
    published_at: row.publishedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export async function GET() {
  if (!(await requireContentAdmin())) {
    return jsonResponse({ success: false, message: "دسترسی مدیریت محتوا مجاز نیست." }, 403);
  }

  try {
    const rows = await getDb().select().from(contentArticles).orderBy(desc(contentArticles.updatedAt), desc(contentArticles.id));
    return jsonResponse({ success: true, articles: rows.map(publicAdminRow) });
  } catch {
    return jsonResponse({ success: false, message: "فهرست مقالات در دسترس نیست. Migration محتوا را بررسی کنید." }, 503);
  }
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  if (!(await requireContentAdmin())) {
    return jsonResponse({ success: false, message: "دسترسی مدیریت محتوا مجاز نیست." }, 403);
  }

  let input: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    input = value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات مقاله معتبر نیست." }, 400);
  }

  const action = clean(input.action, 30) || "save";
  const id = Math.round(Number(input.id || 0));

  try {
    const db = getDb();

    if (action === "delete") {
      if (!Number.isSafeInteger(id) || id <= 0) {
        return jsonResponse({ success: false, message: "شناسه مقاله معتبر نیست." }, 400);
      }
      await db.delete(contentArticles).where(eq(contentArticles.id, id));
      return jsonResponse({ success: true, message: "مقاله حذف شد." });
    }

    if (action === "set_status") {
      const status = clean(input.status, 20);
      if (!Number.isSafeInteger(id) || id <= 0 || !["draft", "published", "archived"].includes(status)) {
        return jsonResponse({ success: false, message: "وضعیت مقاله معتبر نیست." }, 400);
      }
      await db
        .update(contentArticles)
        .set({
          status,
          publishedAt: status === "published" ? sql`COALESCE(${contentArticles.publishedAt}, CURRENT_TIMESTAMP)` : undefined,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(contentArticles.id, id));
      return jsonResponse({ success: true, message: status === "published" ? "مقاله منتشر شد." : "وضعیت مقاله تغییر کرد." });
    }

    const slug = clean(input.slug, 120).toLowerCase();
    const title = clean(input.title, 220);
    const excerpt = clean(input.excerpt, 500);
    const category = clean(input.category, 80) || "راهنمای خودرو";
    const editorBody = clean(input.editor_body, 30_000);
    const readingMinutes = Math.min(60, Math.max(1, Math.round(Number(input.reading_minutes || 5))));
    const seoTitle = clean(input.seo_title, 220);
    const seoDescription = clean(input.seo_description, 320);
    const requestedStatus = clean(input.status, 20) || "draft";
    const status = ["draft", "published", "archived"].includes(requestedStatus) ? requestedStatus : "draft";
    const sections = parseArticleEditorText(editorBody);

    if (!validSlug(slug)) {
      return jsonResponse({ success: false, message: "Slug باید فقط از حروف انگلیسی کوچک، عدد و خط تیره ساخته شود." }, 400);
    }
    if (title.length < 5 || excerpt.length < 20 || sections.length === 0) {
      return jsonResponse({ success: false, message: "عنوان، خلاصه و متن مقاله را کامل کنید." }, 400);
    }

    const [sameSlug] = await db.select({ id: contentArticles.id }).from(contentArticles).where(eq(contentArticles.slug, slug)).limit(1);
    if (sameSlug && sameSlug.id !== id) {
      return jsonResponse({ success: false, message: "این Slug قبلا استفاده شده است." }, 409);
    }

    const values = {
      slug,
      title,
      excerpt,
      category,
      bodyJson: JSON.stringify(sections),
      readingMinutes,
      status,
      seoTitle,
      seoDescription,
      publishedAt: status === "published" ? sql`CURRENT_TIMESTAMP` : null,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    };

    if (Number.isSafeInteger(id) && id > 0) {
      await db.update(contentArticles).set(values).where(eq(contentArticles.id, id));
      const [row] = await db.select().from(contentArticles).where(eq(contentArticles.id, id)).limit(1);
      if (!row) return jsonResponse({ success: false, message: "مقاله پیدا نشد." }, 404);
      return jsonResponse({ success: true, message: "مقاله ذخیره شد.", article: publicAdminRow(row) });
    }

    const [row] = await db.insert(contentArticles).values({ ...values, createdAt: sql`CURRENT_TIMESTAMP` }).returning();
    return jsonResponse({ success: true, message: "مقاله ساخته شد.", article: publicAdminRow(row) }, 201);
  } catch {
    return jsonResponse({ success: false, message: "عملیات مدیریت مقاله کامل نشد." }, 503);
  }
}
