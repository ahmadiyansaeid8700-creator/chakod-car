import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import PriceGuideClient from "./PriceGuideClient";

export const dynamic = "force-dynamic";

export default function CarPriceGuidePage() {
  return (
    <>
      <Header />
      <PriceGuideClient />
      <Footer />
    </>
  );
}
