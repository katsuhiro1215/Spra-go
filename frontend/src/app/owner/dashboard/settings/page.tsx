"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";

type Settings = {
  invite_code: string;
  registration_open: boolean;
  coin_purchase_enabled: boolean;
};

/** 公開設定(docs/design/2026-10-03-closed-beta-design.md 7章)。招待コード・登録の受付・コイン購入のスイッチ */
export default function Page() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/owner/settings")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setSettings(await res.json());
      })
      .catch(() => setError("公開設定の取得に失敗しました。"));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await apiFetch("/api/owner/settings", { method: "PUT", body: JSON.stringify(settings) });
      if (!res.ok) throw new Error();
      setSettings(await res.json());
      setMessage("保存しました。");
    } catch {
      setError("保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">公開設定</h1>
        <p className="text-sm text-muted-foreground">招待コード・登録の受付・コイン購入のスイッチ</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {settings && (
        <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite_code">招待コード</Label>
            <Input
              id="invite_code"
              value={settings.invite_code}
              maxLength={64}
              autoComplete="off"
              onChange={(e) => setSettings({ ...settings, invite_code: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              登録のときに必要なコードです。LINEなどで、/register?code=コード のリンクを送ると、コード欄が埋まります。
            </p>
            {settings.invite_code.trim() === "" && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                招待コードが空です。誰でも登録できます。
              </p>
            )}
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="registration_open"
              checked={settings.registration_open}
              onCheckedChange={(checked) => setSettings({ ...settings, registration_open: checked === true })}
            />
            <div className="flex flex-col gap-1">
              <Label htmlFor="registration_open">登録を受け付ける</Label>
              <p className="text-xs text-muted-foreground">
                OFFにすると、正しいコードでも登録できません（登録済みの人のログインは、そのままです）。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="coin_purchase_enabled"
              checked={settings.coin_purchase_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, coin_purchase_enabled: checked === true })}
            />
            <div className="flex flex-col gap-1">
              <Label htmlFor="coin_purchase_enabled">コイン購入を使う</Label>
              <p className="text-xs text-muted-foreground">
                OFFのあいだは、ショップにコイン購入が出ません。Stripeを正式にするまではOFFのままにします。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </div>
        </form>
      )}
    </div>
  );
}
