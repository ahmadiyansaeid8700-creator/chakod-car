import { absoluteUrl } from "../../lib/sitemap-xml";

export const dynamic = "force-dynamic";

export function GET() {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /account/",
    "Disallow: /login",
    "Disallow: /logout",
    "Disallow: /auth/",
    "Disallow: /api/",
    "Disallow: /support/tickets/",
    "Disallow: /cars/saved-searches",
    "Disallow: /*?*returnTo=",
    `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    "",
  ].join("\n");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
