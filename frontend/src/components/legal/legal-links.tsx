import Link from "next/link";

/** 利用規約・プライバシーポリシーへのリンク(ログイン・登録・LP・「じぶん」のパネルの下に置く) */
export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <p className={`flex justify-center gap-4 text-xs font-bold ${className}`}>
      <Link href="/terms" className="underline">
        利用規約
      </Link>
      <Link href="/privacy" className="underline">
        プライバシーポリシー
      </Link>
    </p>
  );
}
