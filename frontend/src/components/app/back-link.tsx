import Link from "next/link";

/**
 * 「← ホームに戻る」等の戻り導線。以前は単なる下線付きテキストリンクで
 * 気づきにくいという指摘があったため、ピル型のボタンとして視認性を上げた。
 * 各画面の左上に置く想定。
 */
export function BackLink({
  href = "/",
  label = "ホームに戻る",
  className,
}: {
  href?: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/20 px-3 py-1.5 text-sm font-semibold text-white shadow backdrop-blur-sm hover:bg-black/30 ${className ?? ""}`}
    >
      ← {label}
    </Link>
  );
}
