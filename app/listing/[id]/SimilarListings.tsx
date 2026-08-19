import Link from "next/link";

import ListingCard, { type ListingCardData } from "../../components/ListingCard";
import type { ListingData } from "./listing-data";

const API_URL = "https://api.chakod.com/api/listings.php";

type ApiResponse = {
  success?: boolean;
  data?: ListingCardData[];
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalized(value: unknown) {
  return text(value)
    .toLocaleLowerCase("fa")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\s\-_،,.]+/g, "");
}

function relevance(item: ListingCardData, current: ListingData) {
  let score = 0;
  const currentBrand = normalized(current.brand_name || current.vehicle_brand || current.brand);
  const currentModel = normalized(current.model_name || current.vehicle_model || current.model);
  const currentProvince = normalized(current.province_name || current.province);

  if (currentBrand && normalized(item.brand) === currentBrand) score += 4;
  if (currentModel && normalized(item.model) === currentModel) score += 6;
  if (currentProvince && normalized(item.province) === currentProvince) score += 2;

  const currentPrice = Number(current.price_toman || 0);
  const candidatePrice = Number(item.price_toman || 0);
  if (currentPrice > 0 && candidatePrice > 0) {
    const ratio = Math.abs(candidatePrice - currentPrice) / currentPrice;
    if (ratio <= 0.15) score += 3;
    else if (ratio <= 0.3) score += 1;
  }

  return score;
}

export default async function SimilarListings({
  listingId,
  listing,
}: {
  listingId: number;
  listing?: ListingData | null;
}) {
  if (!listing) return null;

  const params = new URLSearchParams({
    limit: "24",
    sort: "vip",
  });

  const brand = text(listing.brand || listing.brand_name || listing.vehicle_brand);
  const model = text(listing.model || listing.model_name || listing.vehicle_model);
  const province = text(listing.province || listing.province_name);

  if (brand) params.set("brand", brand);
  if (model) params.set("model", model);
  if (province) params.set("province", province);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  let items: ListingCardData[] = [];
  try {
    const response = await fetch(`${API_URL}?${params.toString()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as ApiResponse | null;
    if (response.ok && payload?.success && Array.isArray(payload.data)) {
      items = payload.data
        .filter((item) => String(item.id) !== String(listingId))
        .map((item) => ({ item, score: relevance(item, listing) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(({ item }) => item);
    }
  } catch {
    items = [];
  } finally {
    clearTimeout(timeout);
  }

  if (!items.length) return null;

  return (
    <section
      dir="rtl"
      style={{
        width: "min(1180px, calc(100% - 24px))",
        margin: "0 auto 34px",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "end",
          justifyContent: "space-between",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div>
          <span style={{ color: "#7c3aed", fontSize: 11, fontWeight: 900 }}>
            پیشنهادهای مرتبط
          </span>
          <h2 style={{ margin: "5px 0 0", color: "#291b35", fontSize: 22 }}>
            آگهی‌های مشابه
          </h2>
        </div>
        <Link
          href="/cars"
          style={{ color: "#6d28d9", fontSize: 12, fontWeight: 900, textDecoration: "none" }}
        >
          مشاهده بازار خودرو ←
        </Link>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 14,
        }}
      >
        {items.map((item) => (
          <ListingCard key={item.id} listing={item} variant="grid" />
        ))}
      </div>
    </section>
  );
}
