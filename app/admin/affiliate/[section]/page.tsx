import { notFound, permanentRedirect } from "next/navigation";

const allowed = new Set(["accounts", "commissions", "payouts", "settings", "legal"]);

export default async function AdminAffiliateSectionAliasPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!allowed.has(section)) notFound();
  permanentRedirect("/admin/affiliate");
}
