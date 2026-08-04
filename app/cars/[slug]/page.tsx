import ListingDetailPage from "../../listing/[id]/page";

export default function CarDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return ListingDetailPage({
    params: params.then(({ slug }) => ({ id: slug })),
    canonical: true,
  });
}
