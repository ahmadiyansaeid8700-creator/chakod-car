import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import SupportCenterClient from "./SupportCenterClient";

export const dynamic = "force-dynamic";

export default function SupportPage() {
  return (
    <>
      <Header />
      <SupportCenterClient />
      <Footer />
    </>
  );
}
