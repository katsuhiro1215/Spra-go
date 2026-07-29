import type { Metadata } from "next";
import Link from "next/link";

import { blogPosts } from "@/lib/blog-posts";

export const metadata: Metadata = {
  title: "ブログ | SpraGo",
  description:
    "国旗・地理・文化にまつわる豆知識をSpraGoが発信するブログです。",
};

export default function Page() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <div>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← SpraGoトップへ
        </Link>
        <h1 className="mt-3 text-3xl font-bold">ブログ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          国旗・地理・文化にまつわる豆知識をお届けします。
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {blogPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="rounded-xl border border-border p-4 transition-colors hover:bg-muted/50"
          >
            <p className="text-xs text-muted-foreground">
              {post.publishedAt}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{post.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {post.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
