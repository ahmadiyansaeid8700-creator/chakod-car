import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import SavedSearchesClient from "./SavedSearchesClient";

export const dynamic = "force-dynamic";

export default function SavedCarSearchesPage() {
  return (
    <>
      <Header />
      <SavedSearchesClient />
      <Footer />
    </>
  );
}
