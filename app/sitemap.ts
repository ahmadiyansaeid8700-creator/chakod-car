import type { MetadataRoute } from "next";

const BASE_URL = "https://chakod.com";

const PUBLIC_ROUTES = [
  "",
  "/cars",
  "/cars/luxury",
  "/cars/free-zone",
  "/showrooms",
  "/businesses",
  "/rules",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PUBLIC_ROUTES.map((route, index) => ({
    url: `${BASE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === "" || route === "/cars" ? "daily" : "weekly",
    priority: index === 0 ? 1 : route === "/cars" ? 0.9 : 0.7,
  }));
}
