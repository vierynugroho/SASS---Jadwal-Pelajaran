import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jadwal Mengajar",
  description: "Aplikasi penyusunan jadwal mengajar sekolah",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} antialiased`}>
      <body className="min-h-screen bg-slate-50 text-slate-800">{children}</body>
    </html>
  );
}
