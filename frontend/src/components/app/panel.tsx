import type { ReactNode } from "react";

/** クリーム色のカード(設計書3章)。押せるカードには使わず、白いボタンの形にする */
export function Panel({
  children,
  className,
  as: Tag = "div",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
  "aria-labelledby"?: string;
  "aria-label"?: string;
}) {
  return (
    <Tag
      className={`rounded-3xl bg-[#fffaf0] p-4 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)] ${className ?? ""}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
