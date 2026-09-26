"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { GuestLanding } from "@/components/app/guest-landing";
import { WorldScreen } from "@/components/world/world-screen";
import { apiFetch } from "@/lib/api";

type Status = "checking" | "guest" | "ready";

export default function Page() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let active = true;

    apiFetch("/api/user")
      .then(async (userRes) => {
        if (!active) return;
        if (!userRes.ok) {
          setStatus("guest");
          return;
        }

        const activeRes = await apiFetch("/api/profiles/active");
        if (!active) return;
        const activeProfile = await activeRes.json();
        if (!activeProfile) {
          router.replace("/profiles");
          return;
        }

        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("guest");
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (status === "guest") return <GuestLanding />;

  const loading = (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      読み込み中...
    </div>
  );

  if (status === "checking") return loading;

  // WorldScreen は ?place= を読むため(useSearchParams)、本番ビルドの要件どおり Suspense で囲む
  return (
    <Suspense fallback={loading}>
      <WorldScreen />
    </Suspense>
  );
}
