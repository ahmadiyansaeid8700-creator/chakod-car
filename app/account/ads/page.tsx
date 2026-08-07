import { permanentRedirect } from "next/navigation";

export default function LegacyAdsPage() {
  permanentRedirect("/account/business/promotions/featured");
}
