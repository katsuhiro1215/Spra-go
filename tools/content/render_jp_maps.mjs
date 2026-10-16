// 日本の地図の画像(問題に付ける絵)を、アプリの県の形データから作る。ChatGPTだと日本の形がくずれるため
// 使い方: node tools/content/render_jp_maps.mjs  (リポジトリのルートで。frontend の sharp を使う)
// 出力: frontend/public/quiz/jp/{jp02-main-islands,jp02-surrounding-seas,jp03-eight-regions,jp03-inland-prefectures,jp03-peninsulas}.webp
// 画像には文字を入れない。形データ(japan-map.ts)は、tools/prefecture-map/build_map.py が作る(Natural Earth・パブリックドメイン)
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sharp = createRequire(path.join(root, "frontend/package.json"))("sharp");
const source = readFileSync(path.join(root, "frontend/src/components/prefecture-map/japan-map.ts"), "utf8");

const shapes = {};
for (const m of source.matchAll(/^ {2}(\w+): \{ name: "([^"]+)", region: "([^"]+)", d: "([^"]+)" \},/gm)) shapes[m[1]] = m[4];
const inset = source.match(/OKINAWA_INSET: \[number, number, number, number\] = \[([^\]]+)\]/)[1].split(",").map(Number);
if (Object.keys(shapes).length !== 47) throw new Error("県の形が47ありません");

// 全国の範囲(japan-map.ts の MAP_VIEWS.japan)を正方形に広げる。北に余白(オホーツク海)・南に少し余白
const [vx, vy, vw] = [-743.8, -2745.2, 1177.6];
const view = `${vx} ${vy - 150} ${vw} ${vw}`;

const GROUPS = {
  hokkaido: ["hokkaido"],
  tohoku: ["aomori", "iwate", "miyagi", "akita", "yamagata", "fukushima"],
  kanto: ["ibaraki", "tochigi", "gunma", "saitama", "chiba", "tokyo", "kanagawa"],
  chubu: ["niigata", "toyama", "ishikawa", "fukui", "yamanashi", "nagano", "gifu", "shizuoka", "aichi"],
  kinki: ["mie", "shiga", "kyoto", "osaka", "hyogo", "nara", "wakayama"],
  chugoku: ["tottori", "shimane", "okayama", "hiroshima", "yamaguchi"],
  shikoku: ["tokushima", "kagawa", "ehime", "kochi"],
  kyushu: ["fukuoka", "saga", "nagasaki", "kumamoto", "oita", "miyazaki", "kagoshima"],
  okinawa: ["okinawa"],
};
const groupOf = Object.fromEntries(Object.entries(GROUPS).flatMap(([g, keys]) => keys.map((k) => [k, g])));

function land(fillOf, { okinawa = true, strokeOf } = {}) {
  const paths = Object.keys(shapes)
    .filter((k) => okinawa || k !== "okinawa")
    .map((k) => `<path d="${shapes[k]}" fill="${fillOf(k)}" stroke="${strokeOf ? strokeOf(k) : "#ffffff"}" stroke-width="1.6" stroke-linejoin="round"/>`)
    .join("");
  const [ix, iy, iw, ih] = inset;
  const frame = okinawa ? `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="none" stroke="#9fb7c9" stroke-width="2" rx="8"/>` : "";
  return frame + `<g>${paths}</g>`;
}
const svg = (inner, sea = "#cfe6f3") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" width="1280" height="1280"><rect x="${vx - 10}" y="${vy - 160}" width="${vw + 20}" height="${vw + 20}" fill="${sea}"/>${inner}</svg>`;

const REGION_COLORS = { hokkaido: "#f4a6a6", tohoku: "#f6c177", kanto: "#f2e394", chubu: "#a8d89a", kinki: "#86cfc3", chugoku: "#8fb7ea", shikoku: "#b9a3e6", kyushu: "#eba0cf", okinawa: "#eba0cf" };
const ISLAND_COLORS = { hokkaido: "#f6b26b", tohoku: "#93c47d", kanto: "#93c47d", chubu: "#93c47d", kinki: "#93c47d", chugoku: "#93c47d", shikoku: "#8fb4e8", kyushu: "#e8a0c8", okinawa: "#d9d9d9" };
const INLAND = new Set(["tochigi", "gunma", "saitama", "yamanashi", "nagano", "gifu", "shiga", "nara"]);

const lastPoint = (key, pick) => {
  const pts = [...shapes[key].matchAll(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  return pts.reduce((best, p) => (pick(p, best) ? p : best));
};

const images = {
  "jp03-eight-regions": svg(land((k) => REGION_COLORS[groupOf[k]])),
  "jp02-main-islands": svg(land((k) => ISLAND_COLORS[groupOf[k]], { strokeOf: (k) => (ISLAND_COLORS[groupOf[k]] === "#93c47d" ? "#93c47d" : "#ffffff") })),
  "jp03-inland-prefectures": svg(land((k) => (INLAND.has(k) ? "#f2b632" : "#d6e8c6"), { strokeOf: (k) => (INLAND.has(k) ? "#d99a12" : "#ffffff") })),
};

// 房総半島(千葉の南のはし)と能登半島(石川の北のはし)の位置を、丸い印で示す
const boso = lastPoint("chiba", (p, b) => p[1] > b[1]);
const noto = lastPoint("ishikawa", (p, b) => p[1] < b[1]);
const mark = ([x, y]) => `<circle cx="${x}" cy="${y}" r="34" fill="#e5484d" fill-opacity="0.25"/><circle cx="${x}" cy="${y}" r="17" fill="#e5484d" stroke="#ffffff" stroke-width="5"/>`;
images["jp03-peninsulas"] = svg(land((k) => (k === "chiba" || k === "ishikawa" ? "#f6d365" : "#d6e8c6"), { okinawa: true }) + mark(boso) + mark(noto));

// 日本の周りの海: 問題で聞いている海(北のオホーツク海)だけを、ふちをぼかして色づける。
// 4色に塗り分けると、どの色がどの海か分からず、境目の線も目立つので、聞かれる海だけにした。ほかの海は、ほかの地図と同じ水色
// 640×640 の画面での位置(px)で決める。海のさかいは目安(くわしい線ではない)。沖縄の枠は出さない
const px = ([x, y]) => `${vx + (x * vw) / 640},${vy - 150 + (y * vw) / 640}`;
const okhotsk = [[395, -40], [700, -40], [700, 215], [560, 125], [525, 95], [470, 60]].map(px).join(" ");
const blur = `<defs><filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${(26 * vw) / 640}"/></filter></defs>`;
const highlight = `${blur}<polygon points="${okhotsk}" fill="#ffb84d" fill-opacity="0.85" filter="url(#soft)"/>`;
images["jp02-surrounding-seas"] = svg(highlight + land(() => "#d9e8c0", { okinawa: false }));

for (const [name, content] of Object.entries(images)) {
  const out = path.join(root, `frontend/public/quiz/jp/${name}.webp`);
  await sharp(Buffer.from(content)).resize(640, 640).webp({ quality: 85 }).toFile(out);
  console.log(name);
}
