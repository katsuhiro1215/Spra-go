/** 同意のしなおしの画面へ送らない場所。ログイン前の画面・規約の本文・同意の画面そのもの・運営側の画面 */
const EXEMPT_PREFIXES = [
  "/terms-update",
  "/terms",
  "/privacy",
  "/login",
  "/register",
  "/forgot-password",
  "/password-reset",
  "/verify-email",
  "/owner",
  "/admin",
];

export function isTermsExemptPath(pathname: string): boolean {
  return EXEMPT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** GET /api/user の返事から、同意の画面へ送るべきか */
export function shouldAskTerms(user: { terms_outdated?: boolean } | null | undefined): boolean {
  return user?.terms_outdated === true;
}
