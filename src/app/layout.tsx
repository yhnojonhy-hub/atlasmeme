import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.FAROL_PUBLIC_URL?.trim() || "http://localhost:3000"),
  title: {
    default: "AtlasMeme. O atlas das memecoins",
    template: "%s | AtlasMeme",
  },
  description:
    "Abre um projeto na Solana com página, duas carteiras, curva na Meteora e o caixa acompanhado até o lucro.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "AtlasMeme",
    description: "O atlas das memecoins: site, carteiras, curva e caixa.",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${outfit.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
