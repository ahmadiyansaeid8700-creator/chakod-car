import type { Metadata, Viewport } from "next";
import "./globals.css";
import MobileBottomNav from "./components/MobileBottomNav";

export const metadata: Metadata = {
  title: "چاکود | پلتفرم رشد کسب‌وکار و بازار خودرو",
  description:
    "چاکود؛ پلتفرم رشد کسب‌وکار، ثبت آگهی معتبر خودرو، نمایش حرفه‌ای و ابزارهای هوشمند برای فروشندگان و نمایشگاه‌ها.",
  applicationName: "چاکود",
  keywords: [
    "چاکود",
    "بازار خودرو",
    "ثبت آگهی خودرو",
    "نمایشگاه خودرو",
    "خرید خودرو",
    "فروش خودرو",
  ],
  openGraph: {
    title: "چاکود | پلتفرم رشد کسب‌وکار و بازار خودرو",
    description:
      "ثبت، بررسی و نمایش حرفه‌ای آگهی خودرو در چاکود.",
    siteName: "چاکود",
    type: "website",
    locale: "fa_IR",
    url: "",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#6d28d9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        {children}
        <MobileBottomNav />
      </body>
    </html>
  );
}