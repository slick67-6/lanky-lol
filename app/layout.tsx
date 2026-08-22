import type { Metadata, Viewport } from "next";
import { Geist, Syne, Inter } from "next/font/google";

import { ToastProvider } from "@/components/toast";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/lib/theme-context";
import { SettingsModal } from "@/components/settings-modal";
import { CommandPalette } from "@/components/command-palette";
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
  title: "lanky.lol | Online Chess & AI Tools 2026",
  description:
    "Play online chess with instant matchmaking, then analyse images and documents with AI. No accounts, no friction — everything runs in your browser.",
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
          <ThemeProvider>
            <ToastProvider>
              {children}
              <SettingsModal />
              <CommandPalette />

            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
