// 音のボタンの絵(設計書4-7)。スプルの顔を使い、専用のアイコンが届いたら差し替える

/** オンは笑顔に♪、オフはふつうの顔を薄くして✕ */
export function soundFace(enabled: boolean): { face: "laugh" | "normal"; mark: string; dim: boolean } {
  return enabled ? { face: "laugh", mark: "♪", dim: false } : { face: "normal", mark: "✕", dim: true };
}
