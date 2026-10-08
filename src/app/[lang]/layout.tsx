import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Anton, Hanken_Grotesk } from "next/font/google";
import "../globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Navigation } from "@/app/components/layout/Navigation";
import Footer from "@/app/components/layout/Footer";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  LANGUAGES,
  TARGET_LANGUAGES,
  isTargetLanguage,
} from "@/lib/i18n/languages";

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

// The `[lang]` segment is filled by src/proxy.ts from the language cookie.
// (No `dynamicParams = false` here: it would also apply to child segments and
// 404 shows added after the build; the notFound() guard below covers bad values.)
export function generateStaticParams() {
  return TARGET_LANGUAGES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isTargetLanguage(lang)) return {};
  const { meta } = getDictionary(lang);
  return { title: meta.title, description: meta.description };
}

// Apply the persisted theme before paint to avoid a flash of the wrong palette.
const themeScript = `(function(){try{var t=localStorage.getItem('cena-theme');document.documentElement.setAttribute('data-theme',t==='warm'?'warm':'noir');}catch(e){document.documentElement.setAttribute('data-theme','noir');}})();`;

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isTargetLanguage(lang)) notFound();

  return (
    <html lang={LANGUAGES[lang].locale} data-theme="noir">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${hankenGrotesk.variable} ${anton.variable} antialiased`}
      >
        <LanguageProvider lang={lang}>
          <AuthProvider>
            <Navigation />
            {children}
            <Footer t={getDictionary(lang).footer} />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
