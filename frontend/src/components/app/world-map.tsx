"use client";

import { useEffect, useRef, useState } from "react";

type MapCountry = {
  id: number;
  code: string;
  name: string;
  is_suggested?: boolean;
};

type Props = {
  countries: MapCountry[];
  onSelect: (country: MapCountry) => void;
};

// public/map/world.svg の出典・ライセンスは public/map/README.md を参照
// (Wikimedia Commonsのパブリックドメイン画像、ISO 3166-1 alpha-2の小文字を
// idとして使用。1つの島国を複数<path>で表す国は<g id="jp">のように
// グループ化されているため、要素の種類を問わず".landxx[id]"で拾う)。
export function WorldMap({ countries, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgText, setSvgText] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      const res = await fetch("/map/world.svg");
      if (active && res.ok) {
        setSvgText(await res.text());
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !svgText) return;

    const byCode = new Map(
      countries.map((country) => [country.code.toLowerCase(), country]),
    );

    const elements = container.querySelectorAll<SVGElement>(".landxx[id]");
    elements.forEach((el) => {
      const country = byCode.get(el.id.toLowerCase());
      el.classList.toggle("world-map-playable", Boolean(country));
      el.classList.toggle(
        "world-map-suggested",
        Boolean(country?.is_suggested),
      );
      if (country) {
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
        el.setAttribute("aria-label", country.name);
      } else {
        el.removeAttribute("role");
        el.removeAttribute("tabindex");
        el.removeAttribute("aria-label");
      }
    });

    function handleActivate(target: EventTarget | null) {
      if (!(target instanceof Element)) return;
      const el = target.closest(".landxx[id]");
      if (!el) return;
      const country = byCode.get(el.id.toLowerCase());
      if (country) onSelect(country);
    }

    function handleClick(event: MouseEvent) {
      handleActivate(event.target);
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Enter" || event.key === " ") {
        handleActivate(event.target);
      }
    }

    container.addEventListener("click", handleClick);
    container.addEventListener("keydown", handleKeydown);
    return () => {
      container.removeEventListener("click", handleClick);
      container.removeEventListener("keydown", handleKeydown);
    };
  }, [svgText, countries, onSelect]);

  if (!svgText) {
    return (
      <div className="flex aspect-[2754/1398] w-full items-center justify-center text-sm text-white/70">
        地図を読み込み中...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="world-map w-full [&_path[id]]:stroke-white/40"
      dangerouslySetInnerHTML={{ __html: svgText }}
    />
  );
}
