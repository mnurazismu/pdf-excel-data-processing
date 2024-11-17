import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pembanding Dokumen | PDF & Excel Merger",
  description:
    "Aplikasi untuk membandingkan dan menggabungkan dokumen PDF dan Excel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
