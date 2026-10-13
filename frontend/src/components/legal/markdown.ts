/** 規約・プライバシーポリシーの Markdown を、画面に出すための形にする(必要な書き方だけ。docs/legal の下書きの書き方に合わせる) */
export type Inline =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "code"; text: string }
  | { type: "link"; text: string; href: string };

export type ListItem = { inlines: Inline[]; children?: Block[] };

export type Block =
  | { type: "heading"; level: number; inlines: Inline[] }
  | { type: "paragraph"; inlines: Inline[] }
  | { type: "quote"; inlines: Inline[] }
  | { type: "hr" }
  | { type: "list"; ordered: boolean; items: ListItem[] }
  | { type: "table"; header: Inline[][]; rows: Inline[][][] };

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) out.push({ type: "text", text: text.slice(last, at) });
    if (match[1] !== undefined) out.push({ type: "bold", text: match[1] });
    else if (match[2] !== undefined) out.push({ type: "code", text: match[2] });
    else out.push({ type: "link", text: match[3], href: match[4] });
    last = at + match[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

const LIST_LINE = /^(\s*)(\d+\.|-)\s+(.*)$/;

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  return parseLines(lines);
}

function parseLines(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, inlines: parseInline(heading[2].trim()) });
      i++;
      continue;
    }
    if (/^---+\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }
    if (line.startsWith(">")) {
      const text: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) text.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push({ type: "quote", inlines: parseInline(text.join(" ").trim()) });
      continue;
    }
    if (line.trimStart().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) rows.push(splitRow(lines[i++]));
      const body = rows.filter((row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell)));
      const [header, ...rest] = body;
      blocks.push({ type: "table", header: header.map(parseInline), rows: rest.map((row) => row.map(parseInline)) });
      continue;
    }
    const item = LIST_LINE.exec(line);
    if (item) {
      const baseIndent = item[1].length;
      const ordered = item[2] !== "-";
      const items: ListItem[] = [];
      while (i < lines.length) {
        const current = LIST_LINE.exec(lines[i]);
        if (!current || current[1].length !== baseIndent) break;
        const entry: ListItem = { inlines: parseInline(current[3].trim()) };
        i++;
        const nested: string[] = [];
        while (i < lines.length) {
          const next = LIST_LINE.exec(lines[i]);
          if (!next || next[1].length <= baseIndent) break;
          nested.push(lines[i++]);
        }
        if (nested.length > 0) entry.children = parseLines(nested.map((l) => l.slice(Math.min(l.length - l.trimStart().length, nested.reduce((m, n) => Math.min(m, n.length - n.trimStart().length), 99)))));
        items.push(entry);
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    const text: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,6}\s|---+\s*$|>|\s*\|)/.test(lines[i]) && !LIST_LINE.test(lines[i])) text.push(lines[i++].trim());
    blocks.push({ type: "paragraph", inlines: parseInline(text.join(" ")) });
  }
  return blocks;
}
