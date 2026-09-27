"use client";

import { useEffect, useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { OutingImage } from "@/components/spru/outing-image";
import { prefersReducedMotion } from "@/lib/motion";

import { heartsText } from "./companions";
import type { ErrandClaimResult, WorldErrand } from "./types";

// 走ってくる動き(globals.css の outing-run-in)と同じ長さ
const RUN_MS = 800;

type Step = "run" | "reward" | "bonus";

const BUTTON = "mt-1 h-[52px] w-full rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]";

/** ［受け取る］の場面。リュックのスプルが走って帰ってきて、持っているものを見せる(設計書5-2) */
export function ErrandReturn({ errand, result, onClose }: { errand: WorldErrand; result: ErrandClaimResult; onClose: () => void }) {
  const [step, setStep] = useState<Step>("run");

  useEffect(() => {
    const timer = setTimeout(() => setStep((s) => (s === "run" ? "reward" : s)), prefersReducedMotion() ? 0 : RUN_MS);
    return () => clearTimeout(timer);
  }, []);

  const partner = result.partner;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(38,48,28,0.55)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="errand-return-title"
        className="flex w-full max-w-[340px] flex-col items-center gap-3 overflow-hidden rounded-3xl bg-[#fffaf0] px-5 pt-6 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        {step === "run" && (
          <button type="button" aria-label="とばす" onClick={() => setStep("reward")} className="flex flex-col items-center gap-3">
            <OutingImage image="run" height={150} className="animate-outing-run-in" />
            <h2 id="errand-return-title" className="text-lg font-black">
              <AutoFurigana text="ただいま！" />
            </h2>
          </button>
        )}
        {step === "reward" && (
          <>
            <OutingImage image={errand.giver.kind === "partner" ? "heart" : "apple"} height={150} className="animate-spru-hop" />
            <h2 id="errand-return-title" className="text-xl font-black text-[#2e6b1c]">
              <AutoFurigana text="おつかい、できたね！" />
            </h2>
            <p className="text-2xl font-black text-[#2e6b1c]">+{result.gained.points}pt</p>
            {partner && result.gained.bond > 0 && (
              <div className="flex flex-col items-center gap-1 text-sm font-bold text-[#2e6b1c]">
                <p>
                  <AutoFurigana text={`${partner.name}のなかよし度 +${result.gained.bond}`} />
                </p>
                {partner.hearts_up && (
                  <>
                    <p className="text-pink-600">
                      <AutoFurigana text={`${partner.name}とのなかよし度が上がった！`} />{" "}
                      <span aria-label={`ハート${partner.hearts}つ`}>{heartsText(partner.hearts)}</span>
                    </p>
                    {partner.new_line && (
                      <p className="text-[#6b5d45]">
                        <AutoFurigana text={`「${partner.new_line}」`} />
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
            <button type="button" onClick={() => (result.gained.bonus > 0 ? setStep("bonus") : onClose())} className={BUTTON}>
              <AutoFurigana text={result.gained.bonus > 0 ? "つぎへ" : "やったね"} />
            </button>
          </>
        )}
        {step === "bonus" && (
          <>
            <OutingImage image="star" height={150} className="animate-spru-hop" />
            <h2 id="errand-return-title" className="text-xl font-black text-[#2e6b1c]">
              <AutoFurigana text="3つそろった！" />
            </h2>
            <p className="text-2xl font-black text-[#2e6b1c]">
              <AutoFurigana text={`おまけ +${result.gained.bonus}pt`} />
            </p>
            <button type="button" onClick={onClose} className={BUTTON}>
              <AutoFurigana text="やったね" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
