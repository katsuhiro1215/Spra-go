import { OKINAWA_INSET, PREFECTURE_SHAPES } from "./japan-map";
import { viewBoxOf, type MapQuestion } from "./map-question";

const FILL = "#d6e8c6";
const FILL_ON = "#f2b632";
const STROKE_ON = "#d99a12";

/**
 * 都道府県の地図の問題の絵(設計書 2026-10-13-prefecture-map-quiz 5章)。対象の県だけを黄色に塗る。
 * 県名は書かない(答えがわかるため)。色だけに頼らないよう、縁と光の輪も付ける
 */
export function PrefectureMap({ map, className }: { map: MapQuestion; className?: string }) {
  const keys = Object.keys(PREFECTURE_SHAPES);
  const [ox, oy, ow, oh] = OKINAWA_INSET;
  return (
    <svg
      viewBox={viewBoxOf(map.view)}
      role="img"
      aria-label="日本地図。色がついた県を答えてね"
      className={className}
      style={{ background: "#cfe6f3" }}
    >
      {map.view === "japan" || map.view === "kyushu-okinawa" ? (
        <rect x={ox} y={oy} width={ow} height={oh} fill="none" stroke="#9fb7c9" strokeWidth={2} rx={8} />
      ) : null}
      <g strokeLinejoin="round">
        {keys
          .filter((key) => key !== map.highlight)
          .map((key) => (
            <path key={key} d={PREFECTURE_SHAPES[key].d} fill={FILL} stroke="#ffffff" strokeWidth={1.2} />
          ))}
        <path d={PREFECTURE_SHAPES[map.highlight].d} fill="none" stroke={STROKE_ON} strokeWidth={9} opacity={0.25} className="animate-tile-pulse" />
        <path d={PREFECTURE_SHAPES[map.highlight].d} fill={FILL_ON} stroke={STROKE_ON} strokeWidth={2.4} />
      </g>
    </svg>
  );
}
