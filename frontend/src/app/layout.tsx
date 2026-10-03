import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AccessibilityControls } from "@/components/app/accessibility-controls";
import { AccessibilityProvider } from "@/components/app/accessibility-provider";
import { PlayTimeTracker } from "@/components/app/play-time-tracker";
import { ProfileProvider } from "@/components/app/profile-provider";
import { ServiceWorkerRegister } from "@/components/app/service-worker-register";
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

const TITLE = "Spra Go — 学ぶほど、世界が広がる。";
const DESCRIPTION = "言葉を学ぶと町が育ち、世界を旅できるようになる、家族で遊べる学習ゲーム。";

// SNSで共有したときのカード(docs/design/2026-09-29-spru-icons-design.md 6章)。画像は app/opengraph-image.jpg・twitter-image.jpg。
// 画像のURLのもとになるドメインは NEXT_PUBLIC_SITE_URL(本番の値はブランドとドメインの設計で決める)
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, siteName: "Spra Go", locale: "ja_JP", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
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
              <ServiceWorkerRegister />
              <PlayTimeTracker />
            </ProfileProvider>
          </SoundProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
