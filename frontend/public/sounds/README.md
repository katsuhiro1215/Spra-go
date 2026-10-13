# 効果音の配置

`components/app/sound-provider.tsx` が参照するファイル名(固定)。素材は「効果音ラボ」(https://soundeffect-lab.info/)。商用利用可・クレジット表記不要。音声ファイル単体の再配布は禁止のため、このリポジトリを公開するときは、sounds の中身を公開しないこと。

| キー | ファイル | 鳴らす場面 |
|---|---|---|
| correct | correct.mp3 | 正解、あいさつ、仲間・種のお世話 |
| incorrect | incorrect.mp3 | 不正解 |
| allCorrect | allCorrect.mp3 | 全問正解、仲間の誕生、連続プレイの節目 |
| levelUp | levelUp.mp3 | レベルアップの全画面(`LevelUpOverlay`が出たとき) |
| place | place.mp3 | 町にアイテムを置いたとき |
| casher | casher.mp3 | ショップで買ったとき |
| coin | coin.mp3 | おつかいのごほうびを受け取ったとき |
| piece | piece.mp3 | スライドパズルでピースを動かしたとき |
| select | decide41.mp3 | スライドパズルで最後のピースを入れたとき |
| cancel | cancel.mp3 | (未使用) |
| warning | warning.mp3 | (未使用) |
| maintenance | maintenance.mp3 | (未使用) |
| decide | decide4.mp3 | (未使用。約2.9秒と長い) |
| (なし) | beep3.mp3 | (未使用) |

BGM(bgm-*.mp3)は Suno で制作したもの。
