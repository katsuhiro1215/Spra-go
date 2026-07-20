import Image from "next/image";

import { Button } from "@/components/ui/button";
import { countries } from "./data";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">国管理</h1>
          <p className="text-sm text-muted-foreground">
            全{countries.length}カ国
          </p>
        </div>
        <Button>+ 国を追加</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {countries.map((country) => (
          <div
            key={country.code}
            className="flex flex-col items-center gap-3 rounded-lg border border-border p-4 text-center hover:bg-muted/50"
          >
            <div className="relative h-12 w-16 overflow-hidden rounded-sm border border-border">
              <Image
                src={`/flag/${country.code}.svg`}
                alt={country.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-medium">{country.name}</p>
              <p className="text-xs text-muted-foreground">
                {country.language}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {country.stages} ステージ
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
