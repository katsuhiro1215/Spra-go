"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { GuestLanding } from "@/components/app/guest-landing";
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

  useEffect(() => {
    if (status === "ready") router.replace("/learn");
  }, [status, router]);

  if (status === "guest") return <GuestLanding />;

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      読み込み中...
    </div>
  );
}
