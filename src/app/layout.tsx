import type { Metadata } from "next";
import { Anton, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { RTPImportProvider } from "@/contexts/RTPImportContext";
import { Navigation } from "@/app/components/layout/Navigation";
import Footer from "@/app/components/layout/Footer";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "CENA — Aprende português com televisão",
  description:
    "Aprende português através de frases extraídas das tuas séries favoritas. Explora, estuda com repetição espaçada e exporta para Anki.",
};

// Apply the persisted theme before paint to avoid a flash of the wrong palette.
const themeScript = `(function(){try{var t=localStorage.getItem('cena-theme');document.documentElement.setAttribute('data-theme',t==='warm'?'warm':'noir');}catch(e){document.documentElement.setAttribute('data-theme','noir');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" data-theme="noir">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${hankenGrotesk.variable} ${anton.variable} antialiased`}
      >
        <AuthProvider>
          <RTPImportProvider>
            <Navigation />
            {children}
            <Footer />
          </RTPImportProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
