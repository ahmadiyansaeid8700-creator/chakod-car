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

export default async function LegacyShowroomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dealerId = Number(id);

  if (!Number.isSafeInteger(dealerId) || dealerId <= 0) {
    redirect("/dealerships");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  let destination = "/dealerships";

  try {
    const response = await fetch(LISTINGS_API, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as ListingsResponse | null;
    const listing = Array.isArray(payload?.data)
      ? payload.data.find((item) => Number(item.dealer_id) === dealerId)
      : undefined;

    if (listing?.dealer_slug?.trim()) {
      destination = `/businesses/${encodeURIComponent(listing.dealer_slug.trim())}`;
    } else if (listing?.dealer_name?.trim()) {
      destination = `/businesses?type=dealer&q=${encodeURIComponent(listing.dealer_name.trim())}`;
    }
  } catch {
    // در صورت قطع API کاربر به دایرکتوری canonical نمایشگاه ها هدایت می شود.
  } finally {
    clearTimeout(timeout);
  }

  redirect(destination);
}
