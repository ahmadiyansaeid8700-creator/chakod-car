import { permanentRedirect } from "next/navigation";

export default function AdminSettingsPage() {
  permanentRedirect("/admin/commerce");
}
