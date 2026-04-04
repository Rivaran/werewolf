export type WordWolfGenre = "sports" | "food" | "vehicle" | "animal" | "anime"

export type WordWolfPair = {
  id: string
  words: [string, string]
}

export const WORDWOLF_GENRES: Array<{ id: WordWolfGenre; label: string }> = [
  { id: "sports", label: "スポーツ" },
  { id: "food", label: "食べ物" },
  { id: "vehicle", label: "乗り物" },
  { id: "animal", label: "動物" },
  { id: "anime", label: "アニメ" },
]

export const WORDWOLF_GENRE_TOPICS: Record<WordWolfGenre, WordWolfPair[]> = {
  sports: [
    { id: "sports-1", words: ["野球", "サッカー"] },
    { id: "sports-2", words: ["テニス", "バドミントン"] },
    { id: "sports-3", words: ["卓球", "ボウリング"] },
  ],
  food: [
    { id: "food-1", words: ["カレー", "ハヤシライス"] },
    { id: "food-2", words: ["ラーメン", "うどん"] },
    { id: "food-3", words: ["プリン", "ゼリー"] },
  ],
  vehicle: [
    { id: "vehicle-1", words: ["電車", "新幹線"] },
    { id: "vehicle-2", words: ["飛行機", "ヘリコプター"] },
    { id: "vehicle-3", words: ["自転車", "バイク"] },
  ],
  animal: [
    { id: "animal-1", words: ["犬", "猫"] },
    { id: "animal-2", words: ["ライオン", "トラ"] },
    { id: "animal-3", words: ["ペンギン", "アザラシ"] },
  ],
  anime: [
    { id: "anime-1", words: ["ドラえもん", "クレヨンしんちゃん"] },
    { id: "anime-2", words: ["ワンピース", "ナルト"] },
    { id: "anime-3", words: ["鬼滅の刃", "呪術廻戦"] },
  ],
}

export const WORDWOLF_RANDOM_TOPICS: WordWolfPair[] = [
  { id: "sample-theme-park", words: ["ディズニー", "ユニバーサルスタジオジャパン"] },
  { id: "sample-fruit", words: ["リンゴ", "ナシ"] },
  { id: "sample-fruit", words: ["リンゴ", "イチゴ"] },
  { id: "sample-fruit", words: ["ディッシュ", "ウェットティッシュ"] },
  { id: "sample-fruit", words: ["ネコ", "イヌ"] },
]
