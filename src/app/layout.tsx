import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "./map.css";
import "./brand.css";

export const metadata: Metadata = {
  title: "Assumption College Thonburi | Smart City Dashboard",
  description: "แดชบอร์ด Smart City โรงเรียนอัสสัมชัญธนบุรี",
  icons: { icon: "/act-logo.png" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
