import type { Metadata } from "next";
import ChakodAiAssistant from "./components/ChakodAiAssistant";
import LocalPublicApiBridge from "./components/LocalPublicApiBridge";
import "./globals.css";

export const metadata: Metadata = {
  title: "چاکود | بازار حرفه‌ای خودرو",
  description:
    "ویترین تخصصی خودروهای لوکس، منطقه آزاد و فروشندگان حرفه‌ای خودرو",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
