import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/legal-document";
import { PRIVACY_MD } from "@/content/legal";

export const metadata: Metadata = { title: "プライバシーポリシー | Spra Go" };

/** プライバシーポリシー(docs/legal/privacy.md から作る) */
export default function PrivacyPage() {
  return <LegalDocument markdown={PRIVACY_MD} />;
}
