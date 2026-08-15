import type { Metadata, Viewport } from "next";
import AppViewport from "./components/AppViewport";
import ChakodAiAssistant from "./components/ChakodAiAssistant";
import LocalPublicApiBridge from "./components/LocalPublicApiBridge";
import "./globals.css";
import "./mobile-runtime.css";

const SITE_URL = "https://chakod.com";
const SITE_DESCRIPTION =
  "چاکود پلتفرم جستجو و ثبت آگهی خودرو، نمایشگاه های منتخب و خدمات تخصصی خودرو است.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbfbfd",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "چاکود",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "چاکود",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  title: {
    default: "چاکود | پلتفرم رشد کسب و کار خودرو",
    template: "%s | چاکود",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "چاکود",
    "خرید خودرو",
    "فروش خودرو",
    "آگهی خودرو",
    "خودروهای لوکس",
    "خودروهای منطقه آزاد",
    "نمایشگاه خودرو",
    "خدمات خودرو",
  ],
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: SITE_URL,
    siteName: "چاکود",
    title: "چاکود | پلتفرم رشد کسب و کار خودرو",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/brand/chakod-logo-horizontal.png",
        alt: "چاکود؛ پلتفرم رشد کسب و کار خودرو",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "چاکود | پلتفرم رشد کسب و کار خودرو",
    description: SITE_DESCRIPTION,
    images: ["/brand/chakod-logo-horizontal.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/chakod-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/chakod-icon-48.png", sizes: "48x48", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: [
      { url: "/brand/chakod-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <LocalPublicApiBridge />
        <AppViewport>{children}</AppViewport>
        <ChakodAiAssistant />
      </body>
    </html>
  );
}
