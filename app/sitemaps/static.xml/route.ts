import { absoluteUrl, urlSet, xmlResponse } from "../../../lib/sitemap-xml";

export const dynamic = "force-dynamic";

const staticPages = [
  { path: "/", priority: 1, changefreq: "daily" as const },
  { path: "/cars", priority: 0.9, changefreq: "hourly" as const },
  { path: "/cars/luxury", priority: 0.8, changefreq: "daily" as const },
  { path: "/cars/free-zone", priority: 0.8, changefreq: "daily" as const },
  { path: "/cars/compare", priority: 0.6, changefreq: "weekly" as const },
  { path: "/cars/price-guide", priority: 0.7, changefreq: "daily" as const },
  { path: "/businesses", priority: 0.8, changefreq: "daily" as const },
  { path: "/dealerships", priority: 0.8, changefreq: "daily" as const },
  { path: "/advertising", priority: 0.5, changefreq: "monthly" as const },
  { path: "/advertising/stories", priority: 0.4, changefreq: "monthly" as const },
  { path: "/advertising/business-placement", priority: 0.4, changefreq: "monthly" as const },
  { path: "/advertising/dealership-placement", priority: 0.5, changefreq: "monthly" as const },
  { path: "/articles", priority: 0.7, changefreq: "weekly" as const },
  { path: "/about", priority: 0.5, changefreq: "monthly" as const },
  { path: "/support", priority: 0.6, changefreq: "weekly" as const },
  { path: "/rules", priority: 0.4, changefreq: "monthly" as const },
  { path: "/privacy", priority: 0.4, changefreq: "monthly" as const },
  { path: "/terms", priority: 0.4, changefreq: "monthly" as const },
  { path: "/refund-policy", priority: 0.4, changefreq: "monthly" as const },
  { path: "/legal", priority: 0.4, changefreq: "monthly" as const },
];

export function GET() {
  return xmlResponse(
    urlSet(
      staticPages.map((item) => ({
        loc: absoluteUrl(item.path),
        priority: item.priority,
        changefreq: item.changefreq,
      })),
    ),
  );
}
