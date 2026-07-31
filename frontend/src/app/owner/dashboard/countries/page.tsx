"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { MoreHorizontal, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";

type Language = { id: number; code: string; name: string };

type Country = {
  id: number;
  code: string;
  name: string;
  languages: (Language & { pivot: { is_primary: boolean } })[];
  stages: number;
  mood_emoji: string | null;
  intro_message: string | null;
};

type FormValues = {
  code: string;
  name: string;
  language_ids: number[];
  primary_language_id: string;
  stages: string;
  mood_emoji: string;
  intro_message: string;
};

const emptyForm: FormValues = {
  code: "",
  name: "",
  language_ids: [],
  primary_language_id: "",
  stages: "0",
  mood_emoji: "",
  intro_message: "",
};

export default function Page() {
  const [countries, setCountries] = useState<Country[] | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Country | null>(null);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Country | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadCountries() {
    const res = await apiFetch("/api/owner/countries");
    if (!res.ok) {
      setError("国の取得に失敗しました。");
      return;
    }
    setCountries(await res.json());
  }

  useEffect(() => {
    (async () => {
      loadCountries();
      apiFetch("/api/owner/languages").then(async (res) => {
        if (res.ok) setLanguages(await res.json());
      });
    })();
  }, []);

  function openCreate() {
    setEditing(null);
    setValues(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(country: Country) {
    setEditing(country);
    const primary = country.languages.find((l) => l.pivot.is_primary);
    setValues({
      code: country.code,
      name: country.name,
      language_ids: country.languages.map((l) => l.id),
      primary_language_id: primary ? String(primary.id) : "",
      stages: String(country.stages),
      mood_emoji: country.mood_emoji ?? "",
      intro_message: country.intro_message ?? "",
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function toggleLanguage(languageId: number) {
    setValues((prev) => {
      const checked = prev.language_ids.includes(languageId);
      const language_ids = checked
        ? prev.language_ids.filter((id) => id !== languageId)
        : [...prev.language_ids, languageId];

      const primary_language_id =
        checked && String(languageId) === prev.primary_language_id
          ? ""
          : prev.primary_language_id;

      return { ...prev, language_ids, primary_language_id };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const payload = {
      code: values.code,
      name: values.name,
      language_ids: values.language_ids,
      primary_language_id: values.primary_language_id
        ? Number(values.primary_language_id)
        : null,
      stages: Number(values.stages) || 0,
      mood_emoji: values.mood_emoji || null,
      intro_message: values.intro_message || null,
    };

    try {
      const res = editing
        ? await apiFetch(`/api/owner/countries/${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiFetch("/api/owner/countries", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = await res.json();
        const firstError = Object.values(data.errors ?? {})[0] as
          | string[]
          | undefined;
        setFormError(firstError?.[0] ?? data.message ?? "保存に失敗しました。");
        return;
      }

      setDialogOpen(false);
      await loadCountries();
    } catch {
      setFormError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);

    const res = await apiFetch(`/api/owner/countries/${deleteTarget.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setDeleteError("削除に失敗しました。");
      return;
    }

    setDeleteTarget(null);
    await loadCountries();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">国管理</h1>
          <p className="text-sm text-muted-foreground">
            {countries ? `全${countries.length}カ国` : "読み込み中..."}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> 国を追加
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {countries && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {countries.map((country) => (
            <div
              key={country.id}
              className="relative flex flex-col items-center gap-3 rounded-lg border border-border p-4 text-center hover:bg-muted/50"
            >
              <div className="absolute top-1 right-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="その他の操作">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(country)}>
                      編集
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteTarget(country)}
                    >
                      削除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

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
                  {[...country.languages]
                    .sort((a, b) =>
                      a.pivot.is_primary === b.pivot.is_primary
                        ? 0
                        : a.pivot.is_primary
                          ? -1
                          : 1,
                    )
                    .map((l) => l.name)
                    .join("、") || "言語未設定"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {country.stages} ステージ
              </p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "国を編集" : "国を追加"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="country-code">
                コード(flagファイル名。例: jp)
              </Label>
              <Input
                id="country-code"
                required
                value={values.code}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, code: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="country-name">国名</Label>
              <Input
                id="country-name"
                required
                value={values.name}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>言語(複数選択可。1つを主要言語に設定)</Label>
              <div className="flex flex-col gap-1.5 rounded-md border border-border p-2">
                {languages.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    言語がまだ登録されていません。「言語」ページから追加してください。
                  </p>
                )}
                {languages.map((language) => {
                  const checked = values.language_ids.includes(language.id);
                  return (
                    <div
                      key={language.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleLanguage(language.id)}
                      />
                      <span className="flex-1">{language.name}</span>
                      {checked && (
                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                          <input
                            type="radio"
                            name="primary-language"
                            checked={
                              values.primary_language_id ===
                              String(language.id)
                            }
                            onChange={() =>
                              setValues((prev) => ({
                                ...prev,
                                primary_language_id: String(language.id),
                              }))
                            }
                          />
                          主要
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="country-mood-emoji">
                雰囲気の絵文字(任意。例: 🌸)
              </Label>
              <Input
                id="country-mood-emoji"
                value={values.mood_emoji}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    mood_emoji: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="country-intro-message">
                出迎えメッセージ(任意。例: ようこそ日本へ！)
              </Label>
              <Textarea
                id="country-intro-message"
                value={values.intro_message}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    intro_message: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="country-stages">ステージ数</Label>
              <Input
                id="country-stages"
                type="number"
                min={0}
                value={values.stages}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, stages: e.target.value }))
                }
              />
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              「{deleteTarget?.name}」を削除しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
