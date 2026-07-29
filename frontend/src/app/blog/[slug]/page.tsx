import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { blogPosts, getBlogPost } from "@/lib/blog-posts";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return { title: "記事が見つかりません | SpraGo" };
  }

  return {
    title: `${post.title} | SpraGo`,
    description: post.description,
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <div>
        <Link href="/blog" className="text-sm text-muted-foreground hover:underline">
          ← ブログ一覧へ
        </Link>
        <p className="mt-3 text-xs text-muted-foreground">
          {post.publishedAt}
        </p>
        <h1 className="mt-1 text-3xl font-bold">{post.title}</h1>
      </div>

      <article className="flex flex-col gap-4 text-sm leading-relaxed">
        {post.body.map((block, i) => {
          if (block.type === "heading") {
            return (
              <h2 key={i} className="mt-2 text-lg font-semibold">
                {block.text}
              </h2>
            );
          }
          if (block.type === "list") {
            return (
              <ul key={i} className="list-inside list-disc">
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            );
          }
          return <p key={i}>{block.text}</p>;
        })}
      </article>

      {post.countryCode && (
        <Link
          href={`/world/${post.countryCode}`}
          className="rounded-xl border border-border p-4 text-sm font-medium hover:bg-muted/50"
        >
          この国のクイズに挑戦してみる →
        </Link>
      )}
    </div>
  );
}
