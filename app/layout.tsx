import type { Metadata } from "next";
import ChakodAiAssistant from "./components/ChakodAiAssistant";
import LocalPublicApiBridge from "./components/LocalPublicApiBridge";
import "./globals.css";

const SITE_URL = "https://chakod.com";
const SITE_DESCRIPTION =
  "چاکود پلتفرم جستجو و ثبت آگهی خودرو، نمایشگاه های منتخب و خدمات تخصصی خودرو است.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "چاکود",
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
  alternates: {
    canonical: "/",
  },
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
    card: "summary_large_image",
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
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/brand/chakod-symbol.png",
  },
  other: {
    "codex-preview": "development",
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
        {children}
        <ChakodAiAssistant />
      </body>
    </html>
  );
}
