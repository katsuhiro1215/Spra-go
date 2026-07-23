"use client";

import { useMemo } from "react";
import Image from "next/image";

function Cloud({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={className} style={style}>
      <div className="relative h-full w-full">
        <div className="absolute inset-0 rounded-full bg-white/85" />
        <div className="absolute -top-[35%] left-[12%] h-[85%] w-[60%] rounded-full bg-white/85" />
        <div className="absolute -top-[15%] right-[8%] h-[75%] w-[50%] rounded-full bg-white/75" />
      </div>
    </div>
  );
}

function Tree({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-scene-sway absolute bottom-0 ${className ?? ""}`}
      style={style}
    >
      <svg viewBox="0 0 40 64" width="100%" height="100%">
        <rect x="17" y="44" width="6" height="20" fill="#5b3a29" />
        <polygon points="20,0 36,30 4,30" fill="#1f6f4a" />
        <polygon points="20,12 34,40 6,40" fill="#278657" />
        <polygon points="20,24 32,50 8,50" fill="#2f9c64" />
      </svg>
    </div>
  );
}

function Mountains({
  points,
  className,
  color,
}: {
  points: string;
  className?: string;
  color: string;
}) {
  return (
    <svg
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
      className={className}
    >
      <polygon points={points} fill={color} />
    </svg>
  );
}

function Castle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={className}>
      <g fill="#4b4864">
        <rect x="10" y="40" width="18" height="50" />
        <rect x="92" y="40" width="18" height="50" />
        <rect x="35" y="20" width="50" height="70" />
        <rect x="6" y="32" width="6" height="8" />
        <rect x="18" y="32" width="6" height="8" />
        <rect x="88" y="32" width="6" height="8" />
        <rect x="100" y="32" width="6" height="8" />
        <rect x="38" y="12" width="6" height="8" />
        <rect x="50" y="12" width="6" height="8" />
        <rect x="62" y="12" width="6" height="8" />
        <rect x="74" y="12" width="6" height="8" />
        <polygon points="19,32 19,18 24,26" />
        <polygon points="101,32 101,18 96,26" />
      </g>
      <rect x="52" y="55" width="16" height="35" rx="8" fill="#2c2a3d" />
    </svg>
  );
}

function Plane({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 24" className={className}>
      <g fill="white" opacity={0.9}>
        <path d="M2 14 L44 12 L60 4 L64 5 L54 14 L64 15 L60 17 L44 15 L20 22 L14 21 L24 14 Z" />
      </g>
    </svg>
  );
}

function Ship({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 60" className={className}>
      <line x1="40" y1="6" x2="40" y2="38" stroke="#3a2e26" strokeWidth="2" />
      <polygon points="41,8 41,32 62,32" fill="#f4f1ea" opacity={0.92} />
      <polygon points="39,10 39,32 20,32" fill="#e7e2d4" opacity={0.85} />
      <polygon points="10,38 70,38 60,54 20,54" fill="#3a2e26" />
    </svg>
  );
}

const WAVE_PATH =
  "M0,40 C 120,70 240,10 360,40 C 480,70 600,10 720,40 L720,120 L0,120 Z";

function WaveLayer({
  className,
  fill,
  style,
}: {
  className?: string;
  fill: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={className} style={style}>
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        width="200%"
        height="100%"
      >
        <path d={WAVE_PATH} fill={fill} />
        <path d={WAVE_PATH} fill={fill} transform="translate(720,0)" />
      </svg>
    </div>
  );
}

const FLAG_CODES = ["jp", "fr", "es"];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function SceneBackground() {
  const stars = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        top: seededRandom(i + 1) * 55,
        left: seededRandom(i + 100) * 100,
        size: 1 + seededRandom(i + 200) * 1.5,
        duration: 2 + seededRandom(i + 300) * 3,
        delay: seededRandom(i + 400) * 4,
      })),
    [],
  );

  const particles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: seededRandom(i + 500) * 100,
        duration: 6 + seededRandom(i + 600) * 6,
        delay: seededRandom(i + 700) * 6,
        drift: seededRandom(i + 800) * 24 - 12,
        size: 2 + seededRandom(i + 900) * 3,
      })),
    [],
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-linear-to-b from-[#1e1b4b] via-[#7c3aed] via-40% to-[#fb923c]"
    >
      {/* stars */}
      {stars.map((star, i) => (
        <div
          key={i}
          className="animate-scene-twinkle absolute rounded-full bg-white"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: star.size,
            height: star.size,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}

      {/* moon */}
      <div className="absolute top-[8%] left-[10%] h-14 w-14 rounded-full bg-linear-to-br from-slate-100 to-slate-300 shadow-[0_0_40px_12px_rgba(226,232,240,0.35)]">
        <div className="absolute top-3 left-4 h-2 w-2 rounded-full bg-slate-400/50" />
        <div className="absolute top-7 left-8 h-2.5 w-2.5 rounded-full bg-slate-400/40" />
      </div>

      {/* sun */}
      <div className="absolute top-[38%] right-[12%] h-20 w-20 rounded-full bg-linear-to-br from-yellow-200 to-orange-400 shadow-[0_0_70px_24px_rgba(251,191,36,0.45)]" />

      {/* plane */}
      <Plane className="animate-scene-fly absolute top-[18%] left-0 w-14 [animation-duration:26s]" />

      {/* clouds */}
      <Cloud
        className="animate-scene-drift absolute top-[14%] h-8 w-24 [animation-duration:70s]"
        style={{ left: "-10%" }}
      />
      <Cloud
        className="animate-scene-drift absolute top-[26%] h-6 w-20 opacity-80 [animation-duration:95s]"
        style={{ left: "30%", animationDelay: "-20s" }}
      />
      <Cloud
        className="animate-scene-drift absolute top-[10%] h-5 w-16 opacity-70 [animation-duration:55s]"
        style={{ left: "60%", animationDelay: "-8s" }}
      />

      {/* far mountains */}
      <Mountains
        color="#4c3f78"
        className="absolute bottom-[16%] h-[30%] w-full opacity-80"
        points="0,320 0,200 120,140 240,200 360,120 480,190 600,110 720,180 840,130 960,210 1080,140 1200,200 1320,150 1440,210 1440,320"
      />

      {/* castle sits on the near mountain ridge */}
      <Castle className="absolute bottom-[24%] left-[46%] h-16 w-20 drop-shadow-md" />

      {/* near mountains */}
      <Mountains
        color="#332a56"
        className="absolute bottom-[12%] h-[26%] w-full"
        points="0,320 0,240 160,160 320,230 480,150 640,220 800,160 960,230 1120,170 1280,230 1440,180 1440,320"
      />

      {/* trees */}
      <Tree className="h-16 w-10" style={{ left: "4%" }} />
      <Tree
        className="h-20 w-12"
        style={{ left: "10%", animationDelay: "-1s" }}
      />
      <Tree
        className="h-14 w-9"
        style={{ right: "8%", animationDelay: "-2s" }}
      />
      <Tree
        className="h-24 w-14"
        style={{ right: "14%", animationDelay: "-0.5s" }}
      />

      {/* waving flags */}
      {FLAG_CODES.map((code, i) => (
        <div
          key={code}
          className="absolute bottom-[10%] flex flex-col items-center"
          style={{ left: `${22 + i * 6}%` }}
        >
          <div className="animate-scene-flag relative h-6 w-9 overflow-hidden rounded-[1px] shadow-sm">
            <Image
              src={`/flag/${code}.svg`}
              alt=""
              fill
              className="object-cover"
            />
          </div>
          <div className="h-10 w-[2px] bg-neutral-700" />
        </div>
      ))}

      {/* ship sailing on the waves */}
      <Ship className="animate-scene-sail absolute bottom-[2%] w-16 opacity-90 [animation-duration:40s]" />

      {/* waves */}
      <WaveLayer
        fill="#1d4ed8aa"
        className="animate-scene-wave absolute bottom-0 h-16 w-[200%] [animation-duration:18s]"
      />
      <WaveLayer
        fill="#1e3a8ad9"
        className="animate-scene-wave absolute bottom-0 h-10 w-[200%] [animation-duration:12s]"
        style={{ animationDirection: "reverse" }}
      />

      {/* floating particles */}
      {particles.map((particle, i) => (
        <div
          key={i}
          className="animate-scene-float absolute bottom-[14%] rounded-full bg-yellow-100 shadow-[0_0_6px_2px_rgba(254,240,138,0.8)]"
          style={
            {
              left: `${particle.left}%`,
              width: particle.size,
              height: particle.size,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
              "--drift": `${particle.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
