import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SpraGoについて | 世界を冒険しながら図鑑を完成させるRPG",
  description:
    "SpraGoのコンセプトと運営情報。興味が世界を広げ、世界が言葉を教えてくれる——世界中を旅しながら自分だけの世界図鑑を完成させる、無料のWebRPGです。",
};

export default function Page() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-10 px-6 py-16">
      <div>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← SpraGoトップへ
        </Link>
        <h1 className="mt-3 text-3xl font-bold">SpraGoについて</h1>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">コンセプト</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          興味が世界を広げ、世界が言葉を教えてくれる。SpraGoは単なる言語学習アプリではありません。「世界を冒険するゲーム」を通して、自然と言語・文化・歴史・地理に興味を持ち、学習へつながる新しい教育プラットフォームを目指しています。
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          プレイヤーは「世界探検隊」の一員として、国旗や首都、地理、簡単な言葉のクイズに挑戦しながら世界中を旅し、自分だけの「世界図鑑」を完成させていきます。
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">運営方針</h2>
        <ul className="list-inside list-disc text-sm leading-relaxed text-muted-foreground">
          <li>老若男女、誰でも楽しめることを最優先に開発しています</li>
          <li>現在はWebアプリとして無料で提供しています</li>
          <li>クイズの内容は事実確認のうえで作成し、継続的に見直しています</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">お問い合わせ</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          お問い合わせ窓口は準備中です。しばらくお待ちください。
        </p>
      </section>
    </div>
  );
}
