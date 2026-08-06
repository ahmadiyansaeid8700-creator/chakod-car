type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://chakod.com")
    .replace(/\/+$/, "");
}

export function absoluteUrl(pathname: string) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${siteOrigin()}${path}`;
}

export function xmlResponse(body: string) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function sitemapIndex(paths: string[]) {
  const items = paths
    .map((path) => `  <sitemap><loc>${escapeXml(absoluteUrl(path))}</loc></sitemap>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`;
}

export function urlSet(entries: SitemapEntry[]) {
  const unique = Array.from(new Map(entries.map((entry) => [entry.loc, entry])).values());
  const items = unique
    .map((entry) => {
      const lines = [`    <loc>${escapeXml(entry.loc)}</loc>`];
      if (entry.lastmod) lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
      if (entry.changefreq) lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
      if (entry.priority !== undefined) lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
      return `  <url>\n${lines.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;
}

export async function safeJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const parsed: unknown = await response.json();
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function collection(payload: Record<string, unknown> | null, keys: string[]) {
  if (!payload) return [] as Record<string, unknown>[];
  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item && typeof item === "object" && !Array.isArray(item)),
      );
    }
  }
  return [] as Record<string, unknown>[];
}

export function itemSlug(item: Record<string, unknown>) {
  const candidate = item.slug || item.public_slug || item.seo_slug || item.id;
  return typeof candidate === "string" || typeof candidate === "number"
    ? String(candidate).trim()
    : "";
}

export function itemDate(item: Record<string, unknown>) {
  const candidate = item.updated_at || item.updatedAt || item.published_at || item.created_at;
  if (typeof candidate !== "string" || !candidate.trim()) return undefined;
  const date = new Date(candidate.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
