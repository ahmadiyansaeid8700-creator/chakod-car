import { permanentRedirect } from "next/navigation";

function decodeDealer(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function LegacyDealerPublicPage({
  params,
}: {
  params: Promise<{ dealer: string }>;
}) {
  const { dealer } = await params;
  const query = new URLSearchParams({ q: decodeDealer(dealer) });
  permanentRedirect(`/dealerships?${query.toString()}`);
}
