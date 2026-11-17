import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { MotionProvider } from "@/components/ui/motion-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeSync } from "@/components/layout/theme-sync";
import { themeInitScript } from "@/lib/theme";

import "./globals.css";

const geist = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-ui",
});

const geistMono = Geist_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-code",
});

export const metadata: Metadata = {
  title: "SignuDoc",
  description:
    "Free e-signature software for small businesses. Upload, send, sign — no enterprise circus required.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${geist.variable} ${geistMono.variable} antialiased`}>
        <ThemeSync />
        <MotionProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
