// Googleでのログイン・登録の画面の計算(docs/design/2026-10-12-google-auth-design.md)。画面を描かない部分だけをここに置く
import type { RegistrationInfo } from "@/lib/registration";

/** 「Googleで続ける」の行き先。APIへ、ブラウザごと移る。招待コードがあれば code= で渡す */
export function googleStartUrl(apiUrl: string, inviteCode: string, termsAccepted = false): string {
  const code = inviteCode.trim();
  const params = [code ? `code=${encodeURIComponent(code)}` : "", termsAccepted ? "terms=1" : ""].filter(Boolean);
  return `${apiUrl}/auth/google${params.length > 0 ? `?${params.join("&")}` : ""}`;
}

const MESSAGES: Record<string, string> = {
  denied: "Googleでのログインを中止しました。もう一度ためしてください。",
  unverified: "Googleのメールアドレスを確かめられませんでした。メールアドレスの確認がすんだGoogleアカウントでためしてください。",
  link_unverified:
    "このメールアドレスは、メールとパスワードで登録されています。メールの確認をすませてから、またためしてください（メールとパスワードでのログインもできます）。",
  need_terms: "はじめての登録には、利用規約とプライバシーポリシーへの同意が必要です。下の欄にチェックを入れて、もう一度「Googleで続ける」を押してください。",
  need_code: "はじめての登録には、招待コードが必要です。下の欄に招待コードを入れて、もう一度「Googleで続ける」を押してください。",
  closed: "いまは登録をおやすみしています。ひらいたら、またきてね。",
};

/** 戻ってきたときの ?google=○○ を、やさしい言葉にする。知らない言葉・off は何も出さない */
export function googleMessage(status: string | null | undefined): string | null {
  if (!status || !Object.prototype.hasOwnProperty.call(MESSAGES, status)) return null;
  return MESSAGES[status];
}

/** ボタンを出すか・押せるか。登録の画面で招待コードが要るのに空なら、押せない（先にコードを入れてもらう） */
export function googleButtonState(
  info: RegistrationInfo | null,
  inviteCode: string,
  mode: "login" | "register",
  termsAccepted = true,
): { show: boolean; disabled: boolean; hint: string | null } {
  if (!info?.google) return { show: false, disabled: false, hint: null };
  if (mode === "register" && !info.open) return { show: false, disabled: false, hint: null };
  if (mode === "register" && info.invite_required && inviteCode.trim() === "") {
    return { show: true, disabled: true, hint: "先に、招待コードを入れてください" };
  }
  if (mode === "register" && !termsAccepted) {
    return { show: true, disabled: true, hint: "先に、利用規約とプライバシーポリシーに同意してください" };
  }
  return { show: true, disabled: false, hint: null };
}
