import type { Metadata } from "next";
import { Darker_Grotesque, Literata } from "next/font/google";
import "./globals.css";

const grotesque = Darker_Grotesque({
  variable: "--font-grotesque",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.FAROL_PUBLIC_URL?.trim() || "http://localhost:3000"),
  title: {
    default: "Estaleiro — monta, lança e acompanha o caixa",
    template: "%s · Estaleiro",
  },
  description:
    "Do brief ao lançamento na Solana: site, carteiras, curva e o caixa de cada projeto, com fonte e horário em cada número.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Estaleiro",
    description: "Monta a moeda, o site e acompanha o caixa.",
    images: ["/og.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${grotesque.variable} ${literata.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
