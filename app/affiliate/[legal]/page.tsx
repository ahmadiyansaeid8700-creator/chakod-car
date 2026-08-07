import { notFound, permanentRedirect } from "next/navigation";

export default async function AffiliateLegalAliasPage({
  params,
}: {
  params: Promise<{ legal: string }>;
}) {
  const { legal } = await params;
  if (legal === "rules") permanentRedirect("/affiliate");
  if (legal === "privacy") permanentRedirect("/privacy");
  notFound();
}
