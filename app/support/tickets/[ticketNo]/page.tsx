import Footer from "../../../components/layout/Footer";
import Header from "../../../components/layout/Header";
import SupportTicketClient from "./SupportTicketClient";

export const dynamic = "force-dynamic";

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ ticketNo: string }>;
}) {
  const { ticketNo } = await params;
  return (
    <>
      <Header />
      <SupportTicketClient ticketNo={ticketNo} />
      <Footer />
    </>
  );
}
