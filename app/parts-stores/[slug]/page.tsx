import { redirect } from "next/navigation";

export default async function LegacyPartsStoreProfile({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/businesses/${encodeURIComponent(slug)}`);
}
