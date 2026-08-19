import { notFound, permanentRedirect } from "next/navigation";

const allowed = new Set(["pending", "approved", "suspended"]);

export default async function AdminBusinessViewAliasPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!allowed.has(view)) notFound();
  permanentRedirect("/admin/businesses");
}
