import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
});

const govde = Figtree({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Rve — Birlikte İzle",
  description:
    "Arkadaşlarınla senkronize video gecesi: oda kur, kodu paylaş, aynı anda izleyin.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={`${display.variable} ${govde.variable}`}>
      <body className="tanecik bg-perde font-body text-isik antialiased">
        {children}
      </body>
    </html>
  );
}
