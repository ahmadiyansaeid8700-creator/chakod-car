import { permanentRedirect } from "next/navigation";

export default function LegacyDealerManagementPage() {
  permanentRedirect("/account/business");
}
