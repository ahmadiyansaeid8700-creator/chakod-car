import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import CompareCarsClient from "./CompareCarsClient";

export const dynamic = "force-dynamic";

export default function CarsComparePage() {
  return (
    <>
      <Header />
      <CompareCarsClient />
      <Footer />
    </>
  );
}
