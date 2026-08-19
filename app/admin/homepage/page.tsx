import { permanentRedirect } from "next/navigation";

export default function AdminHomepagePage() {
  permanentRedirect("/admin/featured-showrooms");
}
