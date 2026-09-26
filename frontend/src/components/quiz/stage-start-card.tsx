"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { SPRU_SCENES } from "@/components/spru/spru-assets";

/** ステージ開始の小さなカード(設計書6-2)。何度も通る場面なので、タップ不要で2秒で消える */
export function StageStartCard({ stageNumber }: { stageNumber: number }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const scene = SPRU_SCENES.challenge;
  return (
    <div
      role="status"
      className="animate-stage-start pointer-events-none fixed inset-x-0 top-20 z-40 mx-auto flex w-fit items-center gap-3 rounded-2xl bg-[#fffaf0] p-2 pr-4 text-[#3b3226] shadow-xl"
    >
      <Image
        src={scene.src}
        alt=""
        width={96}
        height={Math.round((96 * scene.height) / scene.width)}
        className="rounded-xl"
        aria-hidden
      />
      <p className="text-lg font-black">Stage {stageNumber} スタート！</p>
    </div>
  );
}
