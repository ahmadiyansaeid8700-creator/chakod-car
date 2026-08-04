import { permanentRedirect } from "next/navigation";

import { NEW_ACCOUNT_LISTING_PATH } from "../../lib/listing-routes";

export default function LegacySubmitPage() {
  permanentRedirect(NEW_ACCOUNT_LISTING_PATH);
}
