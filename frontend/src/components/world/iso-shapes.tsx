// 原点を中心にした、横の半幅 w・高さ h の箱を、地面から lift 持ち上げて描く(左の面・右の面・上の面)
export function IsoBox({ w, h, lift = 0, left, right, top }: { w: number; h: number; lift?: number; left: string; right: string; top: string }) {
  const b = -lift;
  const q = w / 2;
  return (
    <>
      <polygon points={`${-w},${b} 0,${b + q} 0,${b + q - h} ${-w},${b - h}`} fill={left} />
      <polygon points={`0,${b + q} ${w},${b} ${w},${b - h} 0,${b + q - h}`} fill={right} />
      <polygon points={`${-w},${b - h} 0,${b + q - h} ${w},${b - h} 0,${b - q - h}`} fill={top} />
    </>
  );
}

// 原点を中心にした、横の半幅 w・高さ h の四角すいの屋根を、地面から lift 持ち上げて描く
export function IsoRoof({ w, h, lift = 0, left, right }: { w: number; h: number; lift?: number; left: string; right: string }) {
  const b = -lift;
  const q = w / 2;
  return (
    <>
      <polygon points={`${-w},${b} 0,${b + q} 0,${b - h}`} fill={left} />
      <polygon points={`0,${b + q} ${w},${b} 0,${b - h}`} fill={right} />
    </>
  );
}
