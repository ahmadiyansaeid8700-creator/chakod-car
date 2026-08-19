import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import SupportCenterClient from "./SupportCenterClient";

export const dynamic = "force-dynamic";

export default function SupportPage() {
  return (
    <>
      <Header />
      <div
        dir="rtl"
        style={{
          maxWidth: 1180,
          margin: "18px auto 0",
          padding: "0 18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
            padding: "14px 16px",
            border: "1px solid rgba(109,40,217,.16)",
            borderRadius: 18,
            background: "linear-gradient(135deg,#faf7ff,#fff)",
          }}
        >
          <div>
            <strong style={{ display: "block", color: "#3b1f5e", marginBottom: 4 }}>
              شماره رسمی پشتیبانی چاکود
            </strong>
            <span style={{ color: "#7b6a96", fontSize: 13 }}>
              برای راهنمایی پرداخت، بازپرداخت، حساب و پیگیری تیکت
            </span>
          </div>
          <a
            href="tel:+989104600602"
            dir="ltr"
            style={{
              textDecoration: "none",
              color: "#6d28d9",
              fontWeight: 900,
              border: "1px solid #dfccff",
              borderRadius: 13,
              padding: "10px 14px",
              background: "#fff",
            }}
          >
            09104600602
          </a>
        </div>
      </div>
      <SupportCenterClient />
      <Footer />
    </>
  );
}
