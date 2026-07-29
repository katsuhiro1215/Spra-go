import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QuizPreview } from "./quiz-preview";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost";

type SampleQuiz = {
  country: { code: string; name: string; mood_emoji: string | null };
  questions: {
    id: number;
    prompt: string;
    choices: { id: number; label: string; is_correct: boolean }[];
  }[];
};

async function getSampleQuiz(code: string): Promise<SampleQuiz | null> {
  const res = await fetch(
    `${API_URL}/api/public/countries/${code}/sample-quiz`,
    { next: { revalidate: 3600 } },
  );

  if (!res.ok) return null;
  return res.json();
}

type PageProps = { params: Promise<{ code: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { code } = await params;
  const data = await getSampleQuiz(code);

  if (!data) {
    return { title: "クイズが見つかりません | SpraGo" };
  }

  const name = data.country.name;

  return {
    title: `${name}クイズ | 世界を冒険しながら図鑑を完成させるRPG SpraGo`,
    description: `${name}の国旗・首都・地理を無料で学べるミニクイズに挑戦。SpraGoは世界中を旅しながら自分だけの世界図鑑を完成させる無料のWebRPGです。`,
  };
}

export default async function Page({ params }: PageProps) {
  const { code } = await params;
  const data = await getSampleQuiz(code);

  if (!data || data.questions.length === 0) {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-8 bg-linear-to-b from-indigo-950 via-purple-900 to-orange-900 px-6 py-12">
      <div>
        <Link href="/" className="text-sm text-white/80 hover:underline">
          ← SpraGoトップへ
        </Link>

        <div className="mt-3 flex items-center gap-3">
          <div className="relative h-12 w-18 shrink-0 overflow-hidden rounded-md border border-white/40 shadow-lg">
            <Image
              src={`/flag/${data.country.code}.svg`}
              alt={data.country.name}
              fill
              className="object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold text-white drop-shadow">
            {data.country.mood_emoji ? `${data.country.mood_emoji} ` : ""}
            {data.country.name}のクイズに挑戦！
          </h1>
        </div>

        <p className="mt-3 text-sm text-white/85">
          国旗・首都・地理・言語まで、{data.country.name}
          について{data.questions.length}
          問の無料お試しクイズ。SpraGoは世界を冒険しながら自分だけの「世界図鑑」を完成させるRPGです。
        </p>
      </div>

      <QuizPreview data={data} />
    </div>
  );
}
