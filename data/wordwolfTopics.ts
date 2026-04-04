export type WordWolfGenre = "sports" | "food" | "vehicle" | "animal" | "anime"

export type WordWolfWord = {
  text: string
  reading?: string
}

export type WordWolfPair = {
  id: string
  words: [WordWolfWord, WordWolfWord]
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
    { id: "sports-1", words: [{ text: "野球", reading: "やきゅう" }, { text: "サッカー" }] },
    { id: "sports-2", words: [{ text: "テニス" }, { text: "バドミントン" }] },
    { id: "sports-3", words: [{ text: "卓球", reading: "たっきゅう" }, { text: "ボウリング" }] },
    { id: "sports-4", words: [{ text: "バスケットボール" }, { text: "バレーボール" }] },
    { id: "sports-5", words: [{ text: "水泳", reading: "すいえい" }, { text: "陸上", reading: "りくじょう" }] },
    { id: "sports-6", words: [{ text: "ゴルフ" }, { text: "ゲートボール" }] },
    { id: "sports-7", words: [{ text: "柔道", reading: "じゅうどう" }, { text: "剣道", reading: "けんどう" }] },
    { id: "sports-8", words: [{ text: "スキー" }, { text: "スノーボード" }] },
  ],
  food: [
    { id: "food-1", words: [{ text: "カレー" }, { text: "ハヤシライス" }] },
    { id: "food-2", words: [{ text: "ラーメン" }, { text: "うどん" }] },
    { id: "food-3", words: [{ text: "プリン" }, { text: "ゼリー" }] },
    { id: "food-4", words: [{ text: "寿司", reading: "すし" }, { text: "刺身", reading: "さしみ" }] },
    { id: "food-5", words: [{ text: "唐揚げ", reading: "からあげ" }, { text: "とんかつ" }] },
    { id: "food-6", words: [{ text: "ハンバーグ" }, { text: "ステーキ" }] },
    { id: "food-7", words: [{ text: "おにぎり" }, { text: "お弁当", reading: "おべんとう" }] },
    { id: "food-8", words: [{ text: "アイスクリーム" }, { text: "かき氷", reading: "かきごおり" }] },
  ],
  vehicle: [
    { id: "vehicle-1", words: [{ text: "電車", reading: "でんしゃ" }, { text: "新幹線", reading: "しんかんせん" }] },
    { id: "vehicle-2", words: [{ text: "飛行機", reading: "ひこうき" }, { text: "ヘリコプター" }] },
    { id: "vehicle-3", words: [{ text: "自転車", reading: "じてんしゃ" }, { text: "バイク" }] },
    { id: "vehicle-4", words: [{ text: "自動車", reading: "じどうしゃ" }, { text: "タクシー" }] },
    { id: "vehicle-5", words: [{ text: "バス" }, { text: "路面電車", reading: "ろめんでんしゃ" }] },
    { id: "vehicle-6", words: [{ text: "フェリー" }, { text: "クルーズ船", reading: "くるーずせん" }] },
    { id: "vehicle-7", words: [{ text: "救急車", reading: "きゅうきゅうしゃ" }, { text: "消防車", reading: "しょうぼうしゃ" }] },
    { id: "vehicle-8", words: [{ text: "ロープウェイ" }, { text: "観覧車", reading: "かんらんしゃ" }] },
  ],
  animal: [
    { id: "animal-1", words: [{ text: "犬", reading: "いぬ" }, { text: "猫", reading: "ねこ" }] },
    { id: "animal-2", words: [{ text: "ライオン" }, { text: "トラ" }] },
    { id: "animal-3", words: [{ text: "ペンギン" }, { text: "アザラシ" }] },
    { id: "animal-4", words: [{ text: "うさぎ" }, { text: "ハムスター" }] },
    { id: "animal-5", words: [{ text: "キリン" }, { text: "シマウマ" }] },
    { id: "animal-6", words: [{ text: "イルカ" }, { text: "クジラ" }] },
    { id: "animal-7", words: [{ text: "猿", reading: "さる" }, { text: "ゴリラ" }] },
    { id: "animal-8", words: [{ text: "ひつじ" }, { text: "やぎ" }] },
  ],
  anime: [
    { id: "anime-1", words: [{ text: "ドラえもん" }, { text: "クレヨンしんちゃん" }] },
    { id: "anime-2", words: [{ text: "ワンピース" }, { text: "ナルト" }] },
    { id: "anime-3", words: [{ text: "鬼滅の刃", reading: "きめつのやいば" }, { text: "呪術廻戦", reading: "じゅじゅつかいせん" }] },
    { id: "anime-4", words: [{ text: "名探偵コナン", reading: "めいたんていこなん" }, { text: "金田一少年の事件簿", reading: "きんだいちしょうねんのじけんぼ" }] },
    { id: "anime-5", words: [{ text: "ちびまる子ちゃん" }, { text: "サザエさん" }] },
    { id: "anime-6", words: [{ text: "ハイキュー!!" }, { text: "黒子のバスケ", reading: "くろこのばすけ" }] },
    { id: "anime-7", words: [{ text: "進撃の巨人", reading: "しんげきのきょじん" }, { text: "東京喰種", reading: "とうきょうぐーる" }] },
    { id: "anime-8", words: [{ text: "魔女の宅急便", reading: "まじょのたっきゅうびん" }, { text: "千と千尋の神隠し", reading: "せんとちひろのかみかくし" }] },
  ],
}

export const WORDWOLF_RANDOM_TOPICS: WordWolfPair[] = [
  { id: "sample-theme-park", words: [{ text: "ディズニー" }, { text: "ユニバーサルスタジオジャパン" }] },
  { id: "sample-fruit-1", words: [{ text: "リンゴ" }, { text: "ナシ" }] },
  { id: "sample-fruit-2", words: [{ text: "リンゴ" }, { text: "イチゴ" }] },
  { id: "sample-item", words: [{ text: "ティッシュ" }, { text: "ウェットティッシュ" }] },
  { id: "sample-animal", words: [{ text: "ネコ" }, { text: "イヌ" }] },
  { id: "random-1", words: [{ text: "海", reading: "うみ" }, { text: "プール" }] },
  { id: "random-2", words: [{ text: "学校", reading: "がっこう" }, { text: "塾", reading: "じゅく" }] },
  { id: "random-3", words: [{ text: "お風呂", reading: "おふろ" }, { text: "温泉", reading: "おんせん" }] },
  { id: "random-4", words: [{ text: "スマホ" }, { text: "タブレット" }] },
  { id: "random-5", words: [{ text: "マフラー" }, { text: "手袋", reading: "てぶくろ" }] },
  { id: "random-6", words: [{ text: "映画館", reading: "えいがかん" }, { text: "美術館", reading: "びじゅつかん" }] },
  { id: "random-7", words: [{ text: "山", reading: "やま" }, { text: "川", reading: "かわ" }] },
  { id: "random-8", words: [{ text: "朝ごはん", reading: "あさごはん" }, { text: "昼ごはん", reading: "ひるごはん" }] },
  { id: "random-9", words: [{ text: "コンビニ" }, { text: "スーパー" }] },
  { id: "random-10", words: [{ text: "ノート" }, { text: "教科書", reading: "きょうかしょ" }] },
  { id: "random-11", words: [{ text: "傘", reading: "かさ" }, { text: "レインコート" }] },
  { id: "random-12", words: [{ text: "ケーキ" }, { text: "ドーナツ" }] },
]
