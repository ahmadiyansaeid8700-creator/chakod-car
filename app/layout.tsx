import type { Metadata, Viewport } from "next";
import "./globals.css";
import MobileBottomNav from "./components/MobileBottomNav";

export const metadata: Metadata = {
  metadataBase: new URL("https://chakod.com"),
  title: {
    default: "چاکود | بازار خودرو و خدمات خودرویی",
    template: "%s | چاکود",
  },
  description:
    "چاکود؛ بازار خودرو، ثبت آگهی، نمایشگاه‌ها و خدمات خودرویی.",
  applicationName: "چاکود",
  keywords: [
    "چاکود",
    "بازار خودرو",
    "ثبت آگهی خودرو",
    "نمایشگاه خودرو",
    "خرید خودرو",
    "فروش خودرو",
    "خدمات خودرویی",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/brand/chakod-icon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/brand/chakod-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/brand/chakod-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "چاکود",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "چاکود | بازار خودرو و خدمات خودرویی",
    description:
      "ثبت، بررسی و نمایش حرفه‌ای آگهی خودرو و معرفی نمایشگاه‌ها در چاکود.",
    siteName: "چاکود",
    type: "website",
    locale: "fa_IR",
    url: "/",
    images: [
      {
        url: "/brand/chakod-og.jpg",
        width: 1200,
        height: 630,
        alt: "چاکود؛ بازار خودرو و خدمات خودرویی",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "چاکود | بازار خودرو و خدمات خودرویی",
    description:
      "ثبت، بررسی و نمایش حرفه‌ای آگهی خودرو و معرفی نمایشگاه‌ها در چاکود.",
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
