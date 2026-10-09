// スライドパズルに使える国旗の一覧を作る(docs/design/2026-10-09-slide-puzzle-design.md 3-4)。
// 国旗を 2×2・3×3・4×4 に切って、ピースを「見た目が同じ種類」にまとめる(同じ色・同じ模様のピースは同じ種類)。
// 種類が少なすぎる国旗(ハンガリー・フランス・イタリアなど、ピースのほとんどが同じ色になるもの)は使わない。
// 出力は、盤の大きさごとに「国旗の絵 → ピースの種類の並び(ピース1〜の順。同じ見た目は同じ数)」。画面は、見た目が合えば完成とする。
//   node tools/puzzle/flag-allowlist.mjs        → database/data/puzzle/flags.json
// 前提: frontend/node_modules に sharp があること(Next.js が入れている)
import { createRequire } from "node:module";
import { readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sharp = createRequire(path.join(root, "frontend/package.json"))("sharp");

const GRIDS = [[2, 2], [3, 3], [4, 4]];
const CELL = 24; // 1ピースを 24×24 の絵にして比べる
const SAME_BELOW = 18; // ピースどうしの色の違い(0〜255の平均)がこれより小さければ、同じ見た目の種類
const MIN_KINDS_RATIO = 0.6; // 種類の数が、ピースの数のこの割合以上の国旗だけ使う(切り上げ)

const flagDir = path.join(root, "frontend/public/flag");
const files = readdirSync(flagDir).filter((name) => name.endsWith(".svg")).sort();
const result = Object.fromEntries(GRIDS.map(([cols, rows]) => [`${cols}x${rows}`, {}]));
const kindCounts = {};

/** 盤を切ったピースの絵(RGBの並び)を、左上から順に返す */
async function cutTiles(file, cols, rows) {
  const { data } = await sharp(path.join(flagDir, file), { density: 144 })
    .flatten({ background: "#ffffff" })
    .resize(cols * CELL, rows * CELL, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const tiles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const pixels = [];
      for (let y = 0; y < CELL; y++) {
        for (let x = 0; x < CELL; x++) {
          const at = ((r * CELL + y) * cols * CELL + c * CELL + x) * 3;
          pixels.push(data[at], data[at + 1], data[at + 2]);
        }
      }
      tiles.push(pixels);
    }
  }
  return tiles;
}

/** 見た目が近いピースを同じ種類にまとめ、種類の番号(左上から 0,1,2,…)の並びを返す */
function kindsOf(tiles) {
  const parent = tiles.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      let sum = 0;
      for (let k = 0; k < tiles[i].length; k++) sum += Math.abs(tiles[i][k] - tiles[j][k]);
      if (sum / tiles[i].length < SAME_BELOW) parent[find(j)] = find(i);
    }
  }
  const numbers = new Map();
  return tiles.map((_, i) => {
    const root = find(i);
    if (!numbers.has(root)) numbers.set(root, numbers.size);
    return numbers.get(root);
  });
}

for (const file of files) {
  for (const [cols, rows] of GRIDS) {
    const kinds = kindsOf(await cutTiles(file, cols, rows));
    const count = new Set(kinds).size;
    kindCounts[`${cols}x${rows}:${file}`] = count;
    if (count >= Math.ceil(kinds.length * MIN_KINDS_RATIO)) result[`${cols}x${rows}`][`/flag/${file}`] = kinds;
  }
}

writeFileSync(path.join(root, "database/data/puzzle/flags.json"), JSON.stringify(result) + "\n");
console.log(`${files.length}枚の国旗 → ` + GRIDS.map(([c, r]) => `${c}×${r}: ${Object.keys(result[`${c}x${r}`]).length}枚`).join(" / "));
for (const name of ["Hungary", "Italy", "France", "Japan", "Germany", "Brazil", "United-Kingdom", "Korea-South", "Switzerland", "Canada", "United-States"]) {
  console.log(name.padEnd(16), GRIDS.map(([c, r]) => `${c}x${r}=${kindCounts[`${c}x${r}:${name}.svg`]}種類`).join("  "));
}
