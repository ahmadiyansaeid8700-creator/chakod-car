import { permanentRedirect } from "next/navigation";

import { ACCOUNT_LISTINGS_PATH } from "../../../lib/listing-routes";

export default function LegacyDashboardListingsPage() {
  permanentRedirect(ACCOUNT_LISTINGS_PATH);
}
