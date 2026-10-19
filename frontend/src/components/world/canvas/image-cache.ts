/**
 * 画像の読み込みの管理(docs/design/2026-10-19-town-canvas-design.md 5章)。
 * 同じ src は1回だけ読み、読めたものから使う。読めなかった画像は null のまま(呼ぶ側が代わりの絵を描く)
 */
export type ImageCache<T> = {
  /** 読み込みを始め、全部が終わる(読めなかったものも含む)と解決する */
  request: (srcs: string[]) => Promise<void>;
  get: (src: string) => T | null;
  /** 読めた枚数 */
  loaded: () => number;
};

export function createImageCache<T>(load: (src: string) => Promise<T | null>, onLoad?: (src: string) => void): ImageCache<T> {
  const done = new Map<string, T | null>();
  const started = new Map<string, Promise<void>>();

  function start(src: string): Promise<void> {
    let promise = started.get(src);
    if (!promise) {
      promise = load(src)
        .catch(() => null)
        .then((image) => {
          done.set(src, image);
          if (image !== null) onLoad?.(src);
        });
      started.set(src, promise);
    }
    return promise;
  }

  return {
    request: async (srcs) => {
      await Promise.all([...new Set(srcs)].map(start));
    },
    get: (src) => done.get(src) ?? null,
    loaded: () => [...done.values()].filter((image) => image !== null).length,
  };
}

/** ブラウザで画像を読む(webp)。読めなければ null */
export function loadBrowserImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}
