// 音のボタンの絵(docs/design/2026-09-29-spru-icons-design.md 4-3)

/** オンは音オンの絵、オフは音オフの絵(どちらも SPRU_ICONS のキー) */
export function soundIcon(enabled: boolean): "sound-on" | "sound-off" {
  return enabled ? "sound-on" : "sound-off";
}
