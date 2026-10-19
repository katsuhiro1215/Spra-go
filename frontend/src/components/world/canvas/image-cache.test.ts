import { describe, expect, it, vi } from "vitest";

import { createImageCache } from "./image-cache";

type Img = { src: string };

describe("画像の読み込みの管理", () => {
  it("同じ src は1回だけ読む。読み終えるまで get は null", async () => {
    const load = vi.fn(async (src: string): Promise<Img | null> => ({ src }));
    const cache = createImageCache(load);
    const done = cache.request(["a", "a", "b"]);
    expect(cache.get("a")).toBeNull();
    await done;
    expect(load).toHaveBeenCalledTimes(2);
    expect(cache.get("a")).toEqual({ src: "a" });
    await cache.request(["a"]);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("読めなかった src は null のまま(代わりの絵を使う)で、request は終わる", async () => {
    const cache = createImageCache(async (src: string): Promise<Img | null> => (src === "bad" ? null : { src }));
    await cache.request(["bad", "ok"]);
    expect(cache.get("bad")).toBeNull();
    expect(cache.get("ok")).toEqual({ src: "ok" });
  });

  it("1枚読めるたびに onLoad が呼ばれる(描き直しの合図)", async () => {
    const onLoad = vi.fn();
    const cache = createImageCache(async (src: string): Promise<Img | null> => ({ src }), onLoad);
    await cache.request(["a", "b"]);
    expect(onLoad).toHaveBeenCalledTimes(2);
  });

  it("loaded は、読めた枚数。足りない絵が増えたかを、描き直しの鍵に使う", async () => {
    const cache = createImageCache(async (src: string): Promise<Img | null> => (src === "bad" ? null : { src }));
    expect(cache.loaded()).toBe(0);
    await cache.request(["a", "bad", "b"]);
    expect(cache.loaded()).toBe(2);
  });
});
