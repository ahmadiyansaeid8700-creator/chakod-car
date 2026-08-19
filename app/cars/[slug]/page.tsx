import ListingDetailPage from "../../listing/[id]/page";

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return ListingDetailPage({
    params: Promise.resolve({ id: slug }),
    canonical: true,
  });
}
