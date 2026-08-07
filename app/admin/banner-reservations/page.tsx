import { permanentRedirect } from "next/navigation";

export default function LegacyBannerReservationsAdminPage() {
  permanentRedirect("/admin/featured-showrooms");
}
