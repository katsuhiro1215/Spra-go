/** 保存したプレイヤーを一覧に反映する。同じidがあれば並びを変えずに置き換え、なければ最後に足す */
export function upsertById<T extends { id: number }>(list: T[], item: T): T[] {
  return list.some((p) => p.id === item.id) ? list.map((p) => (p.id === item.id ? item : p)) : [...list, item];
}
