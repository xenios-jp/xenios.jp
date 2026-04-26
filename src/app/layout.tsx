import Script from "next/script";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ThemeProvider } from "@/components/theme-provider";
import { withCanonical } from "@/lib/metadata";
import {
  DISCORD_URL,
  EMULATOR_GITHUB_URL,
  SITE_URL,
} from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = withCanonical(
  {
    title: {
      default: "XeniOS — Xbox 360 Emulator for iPhone, iPad & Mac",
      template: "%s — XeniOS",
    },
    description:
      "Xbox 360 emulation on iPhone, iPad, and Mac. Play your favorite Xbox 360 games on Apple devices. Free, open source, and community-driven.",
    metadataBase: new URL(SITE_URL),
    openGraph: {
      title: "XeniOS — Xbox 360 Emulator for iPhone, iPad & Mac",
      description:
        "Play Xbox 360 games on iPhone, iPad, and Mac. Free, open source, and community-driven.",
      siteName: "XeniOS",
      locale: "en_US",
      type: "website",
      images: [
        {
          url: "/og-image.svg",
          width: 1200,
          height: 630,
          alt: "XeniOS — Xbox 360 Emulator for iPhone, iPad & Mac",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "XeniOS — Xbox 360 Emulator for iPhone, iPad & Mac",
      description:
        "Play Xbox 360 games on iPhone, iPad, and Mac. Free, open source, and community-driven.",
      images: ["/og-image.svg"],
    },
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    },
  },
  "/"
);

const softwareApplicationLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "XeniOS",
  description:
    "Xbox 360 emulator for iPhone, iPad, and Mac. Free, open source, and community-driven.",
  applicationCategory: "GameApplication",
  operatingSystem: "iOS, iPadOS, macOS",
  url: SITE_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  sameAs: [EMULATOR_GITHUB_URL, DISCORD_URL],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <Navbar />
          <main id="main-content" className="min-h-screen">{children}</main>
          <Footer />
        </ThemeProvider>
        <Script
          id="ld-software-application"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareApplicationLd),
          }}
        />
        <Script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "c6a93f64730d401e9f90e0b87231270f"}'
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
