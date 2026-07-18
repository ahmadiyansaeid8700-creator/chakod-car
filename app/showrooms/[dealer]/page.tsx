import type { Metadata } from "next";
import DealerPublicClient from "./DealerPublicClient";

function decodeDealer(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ dealer: string }>;
}): Promise<Metadata> {
  const { dealer } = await params;
  const dealerName = decodeDealer(dealer);

  return {
    title: `نمایشگاه ${dealerName}`,
    description: `مشاهده خودروهای فعال ${dealerName} در چاکود.`,
  };
}

export default async function DealerPublicPage({
  params,
}: {
  params: Promise<{ dealer: string }>;
}) {
  const { dealer } = await params;
  return <DealerPublicClient rawDealer={dealer} />;
}
