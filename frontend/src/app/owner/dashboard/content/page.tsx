import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { contentItems } from "./data";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">コンテンツ管理</h1>
          <p className="text-sm text-muted-foreground">
            全{contentItems.length}件
          </p>
        </div>
        <Button>+ コンテンツを追加</Button>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {contentItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.countryName}
              </p>
            </div>

            <Badge variant="secondary">{item.type}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
