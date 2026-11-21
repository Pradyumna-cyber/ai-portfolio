import type { Metadata } from "next";

import { PageTransition } from "@/components/page-transition";
import { Providers } from "@/components/providers";
import { SiteChrome } from "@/components/site-chrome";
import { portfolio } from "@/content/portfolio";

import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${portfolio.person.name} — Applied AI Systems`,
    template: `%s — ${portfolio.person.name}`,
  },
  description:
    "Portfolio of Pradyumna Aher: practical AI systems, full-stack engineering, and product-minded technical work.",
  openGraph: {
    type: "website",
    locale: "en_IN",
    title: `${portfolio.person.name} — Applied AI Systems`,
    description: portfolio.thesis,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: `${portfolio.person.name} — Applied AI Systems`,
    description: portfolio.thesis,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="min-h-dvh">
            <a href="#main" className="skip-link">
              Skip to content
            </a>
            <SiteChrome>
              <PageTransition>{children}</PageTransition>
            </SiteChrome>
          </div>
        </Providers>
      </body>
    </html>
  );
}
