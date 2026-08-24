import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "../../../db";
import { accountActivities } from "../../../db/schema";
import { readBusinessResume } from "../../../lib/business-resume";

const API_BASE = (process.env.CHAKOD_API_BASE || "https://api.chakod.com").replace(/\/+$/, "");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function typeTitle(type: string) {
  if (type === "parts_store") return "فروشگاه قطعات و لوازم یدکی";
  if (type === "repair_shop") return "تعمیرگاه خودرو";
  if (type === "car_service") return "مرکز خدمات خودرو";
  return "کسب‌وکار خودرو";
}

async function nativeBusinesses(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") || "";
  const activityMatch = slug.match(/^activity-(\d+)$/);
  const requestedType = request.nextUrl.searchParams.get("type")?.trim() || "";
  const query = request.nextUrl.searchParams.get("q")?.trim().toLocaleLowerCase("fa") || "";
  const province = request.nextUrl.searchParams.get("province")?.trim().toLocaleLowerCase("fa") || "";
  const city = request.nextUrl.searchParams.get("city")?.trim().toLocaleLowerCase("fa") || "";
  const rows = activityMatch
    ? await getDb().select().from(accountActivities).where(eq(accountActivities.id, Number(activityMatch[1]))).limit(1)
    : await getDb().select().from(accountActivities).where(eq(accountActivities.status, "active"));

  const items = await Promise.all(rows
    .filter((row) => {
      if (row.activityType === "dealer" || row.status !== "active") return false;
      if (activityMatch) return true;
      if (requestedType && row.activityType !== requestedType) return false;

      const searchable = `${row.name} ${row.province} ${row.city} ${row.neighborhood}`.toLocaleLowerCase("fa");
      if (query && !searchable.includes(query)) return false;
      if (province && !String(row.province || "").toLocaleLowerCase("fa").includes(province)) return false;
      if (city && !String(row.city || "").toLocaleLowerCase("fa").includes(city)) return false;
      return true;
    })
    .map(async (row) => {
      const resume = await readBusinessResume(row.id);
      const gallery = resume?.published ? resume.gallery : [];
      const specialties = resume?.published ? resume.specialties : [];
      return {
        id: -row.id,
        slug: `activity-${row.id}`,
        business_type: row.activityType,
        business_type_title: typeTitle(row.activityType),
        name: row.name,
        phone: row.phone,
        whatsapp_phone: "",
        email: "",
        website_url: "",
        instagram_url: "",
        province: row.province,
        city: row.city,
        neighborhood: row.neighborhood,
        address: row.address,
        latitude: null,
        longitude: null,
        logo_url: gallery[0]?.url || "",
        cover_url: gallery[0]?.url || "",
        description: resume?.about || resume?.headline || "",
        category_labels: specialties,
        services: specialties,
        business_hours: [],
        gallery: gallery.map((item) => item.url),
        mobile_service: false,
        price_range_text: "",
        is_verified: row.verificationStatus === "verified",
      };
    }));
  return items;
}

export async function GET(request: NextRequest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const upstream = await fetch(
      `${API_BASE}/api/public-businesses.php${request.nextUrl.search}`,
      {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      },
    );
    const text = await upstream.text();
    let payload: Record<string, unknown> | null = null;
    try { payload = JSON.parse(text) as Record<string, unknown>; } catch { payload = null; }
    const nativeItems = await nativeBusinesses(request);
    if (payload && upstream.ok) {
      const slug = request.nextUrl.searchParams.get("slug") || "";
      if (slug.startsWith("activity-")) {
        return NextResponse.json(nativeItems[0]
          ? { success: true, item: nativeItems[0] }
          : { success: false, message: "کسب‌وکار پیدا نشد." },
        { status: nativeItems[0] ? 200 : 404, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
      }
      const externalItems = Array.isArray(payload.items) ? payload.items : [];
      payload.items = [...nativeItems, ...externalItems];
      payload.total = Number(payload.total || externalItems.length) + nativeItems.length;
    }
    return new NextResponse(payload ? JSON.stringify(payload) : text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "ارتباط با سرویس کسب‌وکارهای خودرو برقرار نشد." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    clearTimeout(timeout);
  }
}
