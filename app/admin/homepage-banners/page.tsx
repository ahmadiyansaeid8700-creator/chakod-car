import { permanentRedirect } from "next/navigation";

export default function LegacyHomepageBannersAdminPage() {
  permanentRedirect("/admin/featured-showrooms");
}
