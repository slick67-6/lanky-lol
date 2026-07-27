import type { Metadata, Viewport } from "next";
import { Geist, Syne, Inter } from "next/font/google";
import { RookAudioButton } from "@/components/rook-audio-button";
import { ToastProvider } from "@/components/toast";
import { ErrorBoundary } from "@/components/error-boundary";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "lanky.lol | Tools for the Fools",
  description:
    "The lankiest, sleekest AI vision, document analysis, and browser arcade suite — engineered for lightning speed on desktop and mobile.",
};

export const viewport: Viewport = {
  themeColor: "#030712",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${syne.variable} ${inter.variable} h-full scroll-smooth`}
    >
      <body className="min-h-dvh antialiased font-[family-name:var(--font-inter)] bg-[#030712] text-slate-100">
        <ErrorBoundary>
          <ToastProvider>
            {children}
            <RookAudioButton />
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
