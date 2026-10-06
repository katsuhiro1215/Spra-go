// ステージの結果の文(docs/design/2026-10-07-main-game-levels-design.md 4-3)。画面を描かない部分だけをここに置く

/** クリアに届かなかったときの励ましの文。required はクリアに要る正解の数、score は今回の正解の数。届いているなら null */
export function retryMessage(required: number, score: number): string | null {
  const rest = required - score;
  return rest > 0 ? `あと${rest}問 せいかいすると クリア！ もういちど やってみよう` : null;
}
