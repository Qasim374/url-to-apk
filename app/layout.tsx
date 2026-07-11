import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "URL → APK",
  description: "Paste a website URL and get an installable Android APK.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
