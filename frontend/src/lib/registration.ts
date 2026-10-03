// 招待制の登録の画面の計算(docs/design/2026-10-03-closed-beta-design.md 3-3)。画面を描かない部分だけをここに置く

/** GET /api/registration の答え */
export type RegistrationInfo = { open: boolean; invite_required: boolean };

const MAX_CODE_LENGTH = 64;

/** /register?code=○○ のリンクで来たときの、コード欄の初期値 */
export function inviteCodeFromSearch(search: string): string {
  const code = new URLSearchParams(search).get("code") ?? "";
  return code.trim().slice(0, MAX_CODE_LENGTH);
}

/** 登録画面の出し分け。問い合わせが失敗したら、コード欄は出す(登録の可否はサーバーが最後に決める) */
export function registrationView(info: RegistrationInfo | null): { showCode: boolean; closed: boolean } {
  if (!info) return { showCode: true, closed: false };
  return { showCode: info.invite_required, closed: !info.open };
}
