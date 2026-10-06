import Link from "next/link";

/**
 * 「← ホームに戻る」等の戻り導線。以前は単なる下線付きテキストリンクで
 * 気づきにくいという指摘があったため、ピル型のボタンとして視認性を上げた。
 * 各画面の左上に置く想定。狭い画面(320px)でも折り返さず1行に収める(whitespace-nowrap)。
 * 縦に並べる親(flex-col)の中でも、ボタンの幅だけにする(self-start)。
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
      className={`inline-flex shrink-0 items-center gap-1 self-start rounded-full whitespace-nowrap bg-[#fffaf0] px-3 py-1.5 text-sm font-black text-[#2b5d7a] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white ${className ?? ""}`}
    >
      ← {label}
    </Link>
  );
}
