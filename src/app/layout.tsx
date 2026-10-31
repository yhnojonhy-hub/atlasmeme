import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.FAROL_PUBLIC_URL ?? "http://localhost:3000"),
  title: {
    default: "Farol — transparência para comunidades e tokens na Solana",
    template: "%s · Farol",
  },
  description:
    "Sites de projeto, tesouraria declarada, liquidez verificada e taxas do criador em um só lugar. Números com fonte e horário.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Farol",
    description: "Transparência para comunidades e tokens na Solana.",
    images: ["/og.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${bricolage.variable} ${figtree.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
