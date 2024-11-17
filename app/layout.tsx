import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Document Merger | PDF & Excel",
  description:
    "Aplikasi pintar untuk menggabungkan dan menyinkronkan data dari dokumen PDF dan Excel berdasarkan kesamaan kolom",
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
