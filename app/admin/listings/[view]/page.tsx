import { notFound, permanentRedirect } from "next/navigation";

const allowed = new Set(["pending", "rejected", "reported", "luxury", "free-zone"]);

export default async function AdminListingViewAliasPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!allowed.has(view)) notFound();
  permanentRedirect("/admin/listings");
}
