import type { Metadata, Viewport } from "next";
import "./globals.css";
import MobileBottomNav from "./components/MobileBottomNav";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.chakod.com"),
  title: {
    default: "چاکود | پلتفرم رشد کسب‌وکار و بازار خودرو",
    template: "%s | چاکود",
  },
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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/chakod-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/chakod-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/chakod-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "چاکود | پلتفرم رشد کسب‌وکار و بازار خودرو",
    description: "ثبت، بررسی و نمایش حرفه‌ای آگهی خودرو در چاکود.",
    siteName: "چاکود",
    type: "website",
    locale: "fa_IR",
    url: "/",
    images: [
      {
        url: "/brand/chakod-og.jpg",
        width: 1200,
        height: 630,
        alt: "چاکود؛ پلتفرم رشد کسب‌وکار",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "چاکود | پلتفرم رشد کسب‌وکار و بازار خودرو",
    description: "ثبت، بررسی و نمایش حرفه‌ای آگهی خودرو در چاکود.",
    images: ["/brand/chakod-og.jpg"],
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
