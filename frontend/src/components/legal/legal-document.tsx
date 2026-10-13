import Link from "next/link";
import type { ReactNode } from "react";

import { SkyPage } from "@/components/app/sky-page";

import { parseMarkdown, type Block, type Inline } from "./markdown";

function Inlines({ inlines }: { inlines: Inline[] }) {
  return (
    <>
      {inlines.map((part, index) => {
        if (part.type === "bold") return <strong key={index}>{part.text}</strong>;
        if (part.type === "code") return <code key={index} className="rounded bg-[#f1e9d8] px-1 text-[0.9em]">{part.text}</code>;
        if (part.type === "link") {
          return (
            <a key={index} href={part.href} className="font-bold text-[#2b5d7a] underline">
              {part.text}
            </a>
          );
        }
        return <span key={index}>{part.text}</span>;
      })}
    </>
  );
}

function Blocks({ blocks }: { blocks: Block[] }): ReactNode {
  return blocks.map((block, index) => {
    switch (block.type) {
      case "heading": {
        const classes = block.level === 1 ? "text-2xl font-black" : block.level === 2 ? "mt-8 text-lg font-black" : "mt-5 text-base font-black";
        const Tag = block.level === 1 ? "h1" : block.level === 2 ? "h2" : "h3";
        return (
          <Tag key={index} className={classes}>
            <Inlines inlines={block.inlines} />
          </Tag>
        );
      }
      case "paragraph":
        return (
          <p key={index} className="mt-3 text-sm leading-7">
            <Inlines inlines={block.inlines} />
          </p>
        );
      case "quote":
        return (
          <p key={index} className="mt-3 rounded-xl bg-[#f5efe1] px-3 py-2 text-sm leading-7">
            <Inlines inlines={block.inlines} />
          </p>
        );
      case "hr":
        return <hr key={index} className="my-6 border-[#e8dfcf]" />;
      case "list": {
        const Tag = block.ordered ? "ol" : "ul";
        return (
          <Tag key={index} className={`mt-2 flex flex-col gap-1.5 pl-6 text-sm leading-7 ${block.ordered ? "list-decimal" : "list-disc"}`}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <Inlines inlines={item.inlines} />
                {item.children && <Blocks blocks={item.children} />}
              </li>
            ))}
          </Tag>
        );
      }
      case "table":
        return (
          <div key={index} className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm leading-6">
              <thead>
                <tr>
                  {block.header.map((cell, cellIndex) => (
                    <th key={cellIndex} className={`border border-[#e8dfcf] bg-[#f5efe1] px-2 py-1.5 font-black ${cellIndex === 0 ? "min-w-[7rem]" : "min-w-[12rem]"}`}>
                      <Inlines inlines={cell} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="border border-[#e8dfcf] px-2 py-1.5 align-top">
                        <Inlines inlines={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  });
}

/** 利用規約・プライバシーポリシーのページ。ログインなしで読める */
export function LegalDocument({ markdown }: { markdown: string }) {
  return (
    <SkyPage className="items-center px-4 py-8">
      <div className="relative z-10 flex w-full max-w-2xl flex-col gap-4">
        <article className="rounded-3xl bg-[#fffaf0] p-6 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
          <Blocks blocks={parseMarkdown(markdown)} />
        </article>
        <nav className="flex flex-wrap justify-center gap-3 text-sm font-black">
          <Link href="/terms" className="rounded-full bg-[#fffaf0] px-3 py-1.5 text-[#2b5d7a]">
            利用規約
          </Link>
          <Link href="/privacy" className="rounded-full bg-[#fffaf0] px-3 py-1.5 text-[#2b5d7a]">
            プライバシーポリシー
          </Link>
          <Link href="/" className="rounded-full bg-[#fffaf0] px-3 py-1.5 text-[#2b5d7a]">
            もどる
          </Link>
        </nav>
      </div>
    </SkyPage>
  );
}
