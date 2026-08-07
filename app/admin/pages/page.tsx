import { permanentRedirect } from "next/navigation";

export default function AdminPagesPage() {
  permanentRedirect("/admin/articles");
}
