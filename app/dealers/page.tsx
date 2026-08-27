import { permanentRedirect } from "next/navigation";

export default function LegacyDealersPage() {
  permanentRedirect("/account/business");
}
