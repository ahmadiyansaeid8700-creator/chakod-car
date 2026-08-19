import { redirect } from "next/navigation";

const LISTINGS_API = "https://api.chakod.com/api/listings.php?limit=100&sort=vip";

type Listing = {
  dealer_id?: number | string | null;
  dealer_name?: string | null;
  dealer_slug?: string | null;
};

type ListingsResponse = {
  success?: boolean;
  data?: Listing[];
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
    const response = await fetch(LISTINGS_API, {
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

    if (listing?.dealer_slug?.trim()) {
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
