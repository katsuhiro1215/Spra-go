import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AccessibilityControls } from "@/components/app/accessibility-controls";
import { AccessibilityProvider } from "@/components/app/accessibility-provider";
import { ProfileProvider } from "@/components/app/profile-provider";
import { SoundControls } from "@/components/app/sound-controls";
import { SoundProvider } from "@/components/app/sound-provider";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spra Go — 学ぶほど、世界が広がる。",
  description: "言葉を学ぶと町が育ち、世界を旅できるようになる、家族で遊べる学習ゲーム。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AccessibilityProvider>
          <SoundProvider>
            <ProfileProvider>
              {children}
              <AccessibilityControls />
              <SoundControls />
            </ProfileProvider>
          </SoundProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
