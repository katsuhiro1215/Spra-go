import { itemImage } from "./item-image";
import { ImageArt } from "./item-image-art";
import { ITEM_IMAGE_FIT } from "./item-image-fit";

/**
 * 最初から町にある、動かせない目印(スプルの家・鳥居・石灯籠・竹林・桟橋。docs/design/2026-09-28-town-items-design.md 7-6)。
 * 原点(0,0)がマスの中心。画像で描き、夜の光の輪は町の側で重ねる(world-scene.tsx・lightCircles)
 */
export function LandmarkArt({ landmarkKey }: { landmarkKey: string }) {
  const image = itemImage(landmarkKey);
  return image ? <ImageArt image={image} footprint={1} fit={ITEM_IMAGE_FIT[landmarkKey]} /> : null;
}
