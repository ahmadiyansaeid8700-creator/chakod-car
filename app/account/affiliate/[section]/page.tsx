import { notFound, permanentRedirect } from "next/navigation";

const allowed = new Set(["links", "sales", "commissions", "payouts", "profile"]);

export default async function AffiliateSectionAliasPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!allowed.has(section)) notFound();
  permanentRedirect("/account/affiliate");
}
