import { reviewPrompt } from "./companions";
import { gardenPrompt } from "./garden";
import type { WorldErrand, WorldErrands, WorldGarden, WorldReview } from "./types";

type ErrandText = Pick<WorldErrand, "kind" | "target">;

/** おつかいの名前(設計書3-1) */
export function errandTitle(errand: ErrandText): string {
  switch (errand.kind) {
    case "correct":
      return `問題に${errand.target}問正解する`;
    case "stage_clear":
      return "ステージを1つクリアする";
    case "water":
      return "芽に水をあげる";
    case "review":
      return "仲間の復習をやりきる";
    case "decorate":
      return "町のもようがえ（置く・動かす）";
    case "family_greet":
      return "家族の町にあいさつに行く";
  }
}

/** 頼む人のひとこと(設計書5-2) */
export function errandLine(errand: ErrandText): string {
  switch (errand.kind) {
    case "correct":
      return `問題に${errand.target}問正解してきてね`;
    case "stage_clear":
      return "ステージを1つクリアしてこよう！";
    case "water":
      return "芽に水をあげてほしいな";
    case "review":
      return "この前まちがえた問題、復習してみよう";
    case "decorate":
      return "町のもようがえをしてみない？";
    case "family_greet":
      return "家族の町に、あいさつに行ってみよう";
  }
}

export function isErrandDone(errand: Pick<WorldErrand, "progress" | "target">): boolean {
  return errand.progress >= errand.target;
}

export function errandProgressText(errand: Pick<WorldErrand, "progress" | "target">): string {
  return `${Math.min(errand.progress, errand.target)}/${errand.target}`;
}

export function claimableErrands(errands: WorldErrands): WorldErrand[] {
  return errands.items.filter((errand) => !errand.claimed && isErrandDone(errand));
}

export function claimedCount(errands: WorldErrands): number {
  return errands.items.filter((errand) => errand.claimed).length;
}

export type ErrandGo = { kind: "link"; href: string } | { kind: "say"; line: string };

/** ［やりに行く］の行き先。水やりともようがえ(バッグが空)は、カードを閉じてスプルが教える(設計書5-2) */
export function errandGo(
  errand: Pick<WorldErrand, "kind">,
  ctx: { continueHref: string; learnedToday: boolean; bagCount: number },
): ErrandGo {
  switch (errand.kind) {
    case "correct":
    case "stage_clear":
      return { kind: "link", href: ctx.continueHref };
    case "review":
      return { kind: "link", href: "/review" };
    case "family_greet":
      return { kind: "link", href: "/family" };
    case "water":
      return { kind: "say", line: ctx.learnedToday ? "畑をタップして水をあげよう" : "1問正解したら、水をあげられるよ" };
    case "decorate":
      return ctx.bagCount > 0 ? { kind: "link", href: "/bag" } : { kind: "say", line: "アイテムをタップすると動かせるよ" };
  }
}

/** 受け取れるおつかいがあるときのひとこと(設計書3-5) */
export function errandPrompt(errands: WorldErrands): string | null {
  return claimableErrands(errands).length > 0 ? "おつかいができたね！受け取ろう" : null;
}

/** スプルのふだんのひとことの優先順: おつかい → 畑 → 復習(設計書3-5) */
export function townPrompt({
  errands,
  garden,
  review,
}: {
  errands: WorldErrands;
  garden: WorldGarden;
  review: WorldReview;
}): string | null {
  return errandPrompt(errands) ?? gardenPrompt(garden) ?? reviewPrompt(review);
}
