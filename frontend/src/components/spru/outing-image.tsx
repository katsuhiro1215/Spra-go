import Image from "next/image";

import { COSTUME_IMAGES, OUTING_IMAGES, type CostumeKey, type OutingKey } from "./spru-assets";

/** リュックのスプル(mascot-7)。おつかいの受け取りとお出かけの場面だけで使う(設計書6章) */
export function OutingImage({ image, height, className }: { image: OutingKey; height: number; className?: string }) {
  const asset = OUTING_IMAGES[image];
  return (
    <Image
      src={asset.src}
      alt=""
      width={Math.round((asset.width * height) / asset.height)}
      height={height}
      aria-hidden
      className={className}
    />
  );
}

/** 季節の衣装のスプル(mascot-8) */
export function CostumeImage({ costume, height, className }: { costume: CostumeKey; height: number; className?: string }) {
  const asset = COSTUME_IMAGES[costume];
  return (
    <Image
      src={asset.src}
      alt=""
      width={Math.round((asset.width * height) / asset.height)}
      height={height}
      aria-hidden
      className={className}
    />
  );
}
