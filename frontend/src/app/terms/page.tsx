import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/legal-document";
import { TERMS_MD } from "@/content/legal";

export const metadata: Metadata = { title: "利用規約 | Spra Go" };

/** 利用規約(docs/legal/terms.md から作る。docs/legal を直したら node scripts/sync-legal.mjs) */
export default function TermsPage() {
  return <LegalDocument markdown={TERMS_MD} />;
}
