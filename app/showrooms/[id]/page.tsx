import { redirect } from "next/navigation";

const LISTINGS_API = "https://api.chakod.com/api/listings.php";

type Listing = {
  id?: number | string | null;
  dealer_id?: number | string | null;
  dealer_name?: string | null;
  dealer_slug?: string | null;
};

type ListingsResponse = {
  success?: boolean;
  data?: Listing[];
};

type FeaturedPlacement = {
  dealer_id?: number | string | null;
  listing_ids?: Array<number | string> | null;
};

type FeaturedResponse = {
  success?: boolean;
  data?: FeaturedPlacement[];
};

export const dynamic = "force-dynamic";

function decodeLegacyValue(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

function normalizeDealerName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("fa")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[ؤ]/g, "و")
    .replace(/[إأ]/g, "ا")
    .replace(/[\u200c\u200f\u202a-\u202e\s\-_/\\،,.]+/g, "");
}

export default async function LegacyShowroomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const requested = decodeLegacyValue(id);
  const numericDealerId = Number(requested);
  const hasNumericId = Number.isSafeInteger(numericDealerId) && numericDealerId > 0;
  const normalizedRequested = normalizeDealerName(requested);

  if (!requested) {
    redirect("/dealerships");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  let destination = hasNumericId
    ? "/dealerships"
    : `/businesses?type=dealer&q=${encodeURIComponent(requested)}`;

  try {
    if (hasNumericId) {
      const featuredResponse = await fetch("https://staging.chakod.com/api/featured-showrooms", {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const featuredPayload = (await featuredResponse.json().catch(() => null)) as FeaturedResponse | null;
      const placement = (featuredPayload?.data || []).find(
        (item) => Number(item.dealer_id) === numericDealerId,
      );
      const selectedListingId = (placement?.listing_ids || [])
        .map(Number)
        .find((listingId) => Number.isSafeInteger(listingId) && listingId > 0);
      if (selectedListingId) destination = `/cars/${selectedListingId}`;
    }

    const query = new URLSearchParams({ limit: "100", sort: "vip" });
    if (hasNumericId) query.set("dealer_id", String(numericDealerId));
    const response = await fetch(`${LISTINGS_API}?${query.toString()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as ListingsResponse | null;
    const listings = Array.isArray(payload?.data) ? payload.data : [];
    const listing = hasNumericId
      ? listings.find((item) => Number(item.dealer_id) === numericDealerId)
      : listings.find((item) => {
          const slug = item.dealer_slug?.trim() || "";
          const name = item.dealer_name?.trim() || "";
          return (
            (slug && normalizeDealerName(slug) === normalizedRequested) ||
            (name && normalizeDealerName(name) === normalizedRequested)
          );
        });

    if (hasNumericId && listing && destination === "/dealerships") {
      const listingId = Number(listing.id || 0);
      if (Number.isSafeInteger(listingId) && listingId > 0) destination = `/cars/${listingId}`;
    } else if (listing?.dealer_slug?.trim()) {
      destination = `/businesses/${encodeURIComponent(listing.dealer_slug.trim())}`;
    } else if (listing?.dealer_name?.trim()) {
      destination = `/businesses?type=dealer&q=${encodeURIComponent(listing.dealer_name.trim())}`;
    }
  } catch {
    // در قطع API مقصد fallback امن بالا حفظ می شود.
  } finally {
    clearTimeout(timeout);
  }

  redirect(destination);
}
