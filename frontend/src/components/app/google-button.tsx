import { AutoFurigana } from "@/components/app/auto-furigana";

/** 「Googleで続ける」。APIへ、ブラウザごと移る(docs/design/2026-10-12-google-auth-design.md 3章)。押せないときは、理由(hint)を出す */
export function GoogleButton({ href, disabled, hint }: { href: string; disabled: boolean; hint: string | null }) {
  const classes =
    "flex h-12 w-full items-center justify-center gap-3 rounded-2xl border-2 border-[#e8dfcf] bg-white text-base font-black text-[#3b3226] shadow-[0_2px_6px_rgba(59,50,38,0.12)]";
  const content = (
    <>
      <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
        <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
      </svg>
      <span>Googleで続ける</span>
    </>
  );

  return (
    <div className="flex flex-col gap-1.5">
      {disabled ? (
        <button type="button" disabled className={`${classes} cursor-not-allowed opacity-60`}>
          {content}
        </button>
      ) : (
        <a href={href} className={`${classes} hover:bg-[#fffdf6]`}>
          {content}
        </a>
      )}
      {hint && (
        <p className="text-center text-xs font-bold text-[#6b5d45]">
          <AutoFurigana text={hint} />
        </p>
      )}
    </div>
  );
}
