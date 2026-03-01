import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ThemeProvider } from "@/components/theme-provider";
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

export const metadata: Metadata = {
  title: {
    default: "XeniOS — Xenia for Apple devices",
    template: "%s — XeniOS",
  },
  description:
    "XeniOS is based on has207/xenia-edge for Apple devices. Play Xbox 360 games on iPhone, iPad, and Mac. Free, open source, and community-driven.",
  metadataBase: new URL("https://xenios.jp"),
  openGraph: {
    title: "XeniOS — Xenia for Apple devices",
    description:
      "Play Xbox 360 games on iPhone, iPad, and Mac. Free, open source, and community-driven.",
    url: "https://xenios.jp",
    siteName: "XeniOS",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "XeniOS — Xenia for Apple devices",
    description:
      "Play Xbox 360 games on iPhone, iPad, and Mac. Free, open source, and community-driven.",
  },
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
      </body>
    </html>
  );
}
