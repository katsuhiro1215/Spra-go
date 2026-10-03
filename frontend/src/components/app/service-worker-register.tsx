"use client";

import { useEffect } from "react";

/** 本番のビルドのときだけ、最小のサービスワーカー(public/sw.js)を登録する。開発中は動かさない */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
