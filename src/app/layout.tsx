import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "E-Commerce Генератор — Карточки для маркетплейсов",
  description: "Генерация готовых карточек товаров для Wildberries, Ozon, Яндекс Маркет.",
  keywords: ["e-commerce", "генератор контента", "маркетинг", "товары", "карточки"],
  authors: [{ name: "Azar" }],
  openGraph: {
    title: "E-Commerce Генератор",
    description: "Готовые карточки для маркетплейсов",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "E-Commerce Генератор",
    description: "Готовые карточки для маркетплейсов",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
