"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import styles from "@/app/page.module.css"
import {
  WORDWOLF_GENRES,
  WORDWOLF_GENRE_TOPICS,
  WORDWOLF_RANDOM_TOPICS,
  type WordWolfGenre,
  type WordWolfPair,
} from "@/data/wordwolfTopics"

type Theme = "mama" | "ai"
type SourceMode = "genre" | "gm" | "random"
type WordWolfPhase = "setup" | "distribution" | "discussion" | "voteStart" | "vote" | "result"
type Participant = {
  id: number
  role: "villager" | "werewolf"
  word: string
}

function shuffle<T>(items: T[]) {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

export default function WordWolfPage() {
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioResolveRef = useRef<(() => void) | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const discussionEndedRef = useRef(false)

  const [theme, setTheme] = useState<Theme>("mama")
  const [playerCount, setPlayerCount] = useState(4)
  const [wolfCount, setWolfCount] = useState(1)
  const [sourceMode, setSourceMode] = useState<SourceMode>("genre")
  const [selectedGenre, setSelectedGenre] = useState<WordWolfGenre>("sports")
  const [gmVillagerWord, setGmVillagerWord] = useState("")
  const [gmWerewolfWord, setGmWerewolfWord] = useState("")
  const [showTitleImage, setShowTitleImage] = useState(true)

  const [phase, setPhase] = useState<WordWolfPhase>("setup")
  const [participants, setParticipants] = useState<Participant[]>([])
  const [currentPlayer, setCurrentPlayer] = useState(1)
  const [showWord, setShowWord] = useState(false)
  const [selectedVoteTarget, setSelectedVoteTarget] = useState<number | null>(null)
  const [executedPlayer, setExecutedPlayer] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(180)
  const [timerRunning, setTimerRunning] = useState(false)

  function playAudio(src: string): Promise<void> {
    return new Promise((resolve) => {
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }

      const audio = audioRef.current

      if (audioResolveRef.current) {
        audioResolveRef.current()
        audioResolveRef.current = null
      }

      audio.pause()
      audio.currentTime = 0

      const finish = () => {
        if (audioResolveRef.current === finish) {
          audioResolveRef.current = null
        }
        resolve()
      }

      audioResolveRef.current = finish
      audio.onended = finish
      audio.onerror = finish
      audio.src = src
      audio.play().catch(finish)
      setTimeout(finish, 15000)
    })
  }

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${String(secs).padStart(2, "0")}`
  }

  function buildPair(): WordWolfPair | null {
    if (sourceMode === "genre") {
      return pickRandom(WORDWOLF_GENRE_TOPICS[selectedGenre])
    }

    if (sourceMode === "gm") {
      if (!gmVillagerWord.trim() || !gmWerewolfWord.trim()) {
        alert("村人陣営と人狼陣営の言葉を入力してください")
        return null
      }

      if (gmVillagerWord.trim() === gmWerewolfWord.trim()) {
        alert("村人陣営と人狼陣営には別の言葉を入れてください")
        return null
      }

      return {
        id: "gm-input",
        words: [gmVillagerWord.trim(), gmWerewolfWord.trim()],
      }
    }

    if (WORDWOLF_RANDOM_TOPICS.length === 0) {
      alert("ランダム用のお題がまだありません")
      return null
    }

    return pickRandom(WORDWOLF_RANDOM_TOPICS)
  }

  async function startGame() {
    if (wolfCount <= 0 || wolfCount >= playerCount) {
      alert("人狼数は1人以上、プレイ人数未満にしてください")
      return
    }

    const pair = buildPair()
    if (!pair) return

    const [villagerWord, werewolfWord] =
      Math.random() < 0.5 ? pair.words : [pair.words[1], pair.words[0]]

    const roles = shuffle([
      ...Array.from({ length: wolfCount }, () => "werewolf" as const),
      ...Array.from({ length: playerCount - wolfCount }, () => "villager" as const),
    ])

    const nextParticipants = roles.map((role, index) => ({
      id: index + 1,
      role,
      word: role === "werewolf" ? werewolfWord : villagerWord,
    }))

    setParticipants(nextParticipants)
    setCurrentPlayer(1)
    setShowWord(false)
    setSelectedVoteTarget(null)
    setExecutedPlayer(null)
    setTimeLeft(180)
    setTimerRunning(false)
    discussionEndedRef.current = false
    setPhase("distribution")

    await playAudio("/audio/[00-K]これから言葉人狼を開始します.wav")
    await playAudio("/audio/[01]役職を配布しますので、皆さん目を瞑ってください.wav")
    await playAudio("/audio/[11-1]1番の人は他のプレイヤーが目を瞑ったのを確認した後・・・.wav")
  }

  async function moveToNextPlayer() {
    if (currentPlayer < participants.length) {
      const next = currentPlayer + 1
      setCurrentPlayer(next)
      setShowWord(false)
      await playAudio(`/audio/[11-${next}]${next}番の人は他のプレイヤーが目を瞑ったのを確認した後・・・.wav`)
      return
    }

    setShowWord(false)
    setTimeLeft(180)
    setTimerRunning(true)
    setPhase("discussion")
    await playAudio("/audio/[04-2]議論時間は３分です。議論を開始してください.wav")
  }

  async function endDiscussion() {
    if (discussionEndedRef.current) return
    discussionEndedRef.current = true

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setTimerRunning(false)
    setPhase("voteStart")
    await playAudio("/audio/[05]議論終了の時間となりました。投票に移ります.wav")
    await playAudio("/audio/[06]5からカウントダウン.wav")
    setPhase((prev) => (prev === "voteStart" ? "vote" : prev))
  }

  useEffect(() => {
    if (!timerRunning) return

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          setTimerRunning(false)
          void endDiscussion()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [timerRunning])

  function currentParticipant() {
    return participants[currentPlayer - 1]
  }

  const previewRoles = [
    ...Array.from({ length: wolfCount }, () => ({
      name: "人狼",
      img: `/image/${theme}/人狼.png`,
      badge: "人狼",
    })),
    ...Array.from({ length: playerCount - wolfCount }, () => ({
      name: "村人",
      img: `/image/${theme}/村人.png`,
      badge: "村人",
    })),
  ]

  const selectedParticipant = selectedVoteTarget == null
    ? null
    : participants.find((participant) => participant.id === selectedVoteTarget) ?? null

  if (phase === "setup") {
    return (
      <div style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <button
            onClick={() => router.push("/")}
            style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer", fontSize: 14 }}
          >
            ← 戻る
          </button>
          <div />
        </div>

        <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 3 }}>
          <button
            onClick={() => {
              setTheme("mama")
              setShowTitleImage(true)
            }}
            className={`${styles.illustrationButton} ${theme === "mama" ? styles.illustrationButtonActive : ""}`}
          >
            イラスト1
          </button>
          <button
            onClick={() => {
              setTheme("ai")
              setShowTitleImage(true)
            }}
            className={`${styles.illustrationButton} ${theme === "ai" ? styles.illustrationButtonActive : ""}`}
          >
            イラスト2
          </button>
        </div>

        {showTitleImage && (
          <img
            src={`/image/${theme}/title_kotobawolf.png`}
            alt="言葉人狼タイトル"
            onError={() => setShowTitleImage(false)}
            style={{ width: "90%", maxWidth: 400, maxHeight: 200, marginBottom: 8 }}
          />
        )}
        {!showTitleImage && (
          <h1 style={{ fontSize: 38, margin: "8px 0 16px", letterSpacing: 2 }}>言葉人狼</h1>
        )}

        <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap", justifyContent: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18 }}>
            プレイ人数
            <select
              value={playerCount}
              onChange={(e) => {
                const nextPlayerCount = Number(e.target.value)
                setPlayerCount(nextPlayerCount)
                if (wolfCount >= nextPlayerCount) {
                  setWolfCount(nextPlayerCount - 1)
                }
              }}
              style={{ padding: "8px 10px", borderRadius: 8, border: "2px solid #888", background: "#fff", fontSize: 16, cursor: "pointer" }}
            >
              {[3, 4, 5, 6, 7, 8].map((count) => (
                <option key={count} value={count}>{count}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18 }}>
            人狼数
            <select
              value={wolfCount}
              onChange={(e) => setWolfCount(Number(e.target.value))}
              style={{ padding: "8px 10px", borderRadius: 8, border: "2px solid #888", background: "#fff", fontSize: 16, cursor: "pointer" }}
            >
              {Array.from({ length: Math.max(1, playerCount - 1) }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>{count}</option>
              ))}
            </select>
          </label>
        </div>

        <h2 className={styles.sectionTitle}>配役プレビュー</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(88px, 1fr))", gap: 10, width: "min(100%, 360px)", marginBottom: 18 }}>
          {previewRoles.map((role, index) => (
            <div
              key={`${role.badge}-${index}`}
              style={{
                border: "2px dashed rgba(120,120,120,0.55)",
                borderRadius: 10,
                padding: "10px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,0.55)",
              }}
            >
              <img src={role.img} alt={role.name} width={64} height={64} style={{ objectFit: "contain" }} />
              <div style={{ fontWeight: "bold", fontSize: 16 }}>{role.badge}</div>
            </div>
          ))}
        </div>

        <h2 className={styles.sectionTitle}>お題の決め方</h2>
        <div style={{ width: "min(100%, 420px)", display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { id: "genre", label: "ジャンル" },
            { id: "gm", label: "GM入力" },
            { id: "random", label: "ランダム" },
          ].map((option) => {
            const active = sourceMode === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSourceMode(option.id as SourceMode)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: active
                    ? theme === "mama"
                      ? "2px solid #95c47c"
                      : "2px solid #4fa3ff"
                    : "1px solid rgba(120,120,120,0.4)",
                  background: active
                    ? theme === "mama"
                      ? "rgba(184,216,168,0.95)"
                      : "rgba(79,163,255,0.12)"
                    : "rgba(255,255,255,0.82)",
                  color: "#222",
                  fontWeight: "bold",
                  cursor: "pointer",
                  minWidth: 120,
                  justifyContent: "center",
                  boxShadow: active ? "0 4px 12px rgba(0,0,0,0.12)" : "none",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: active
                      ? theme === "mama"
                        ? "5px solid #6ea65b"
                        : "5px solid #4fa3ff"
                      : "2px solid #8f8f8f",
                    background: "white",
                    boxSizing: "border-box",
                    flexShrink: 0,
                  }}
                >
                </span>
                <span style={{ fontSize: 18, fontWeight: "bold", whiteSpace: "nowrap" }}>
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>

        {sourceMode === "genre" && (
          <div style={{ width: "min(100%, 420px)", marginTop: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {WORDWOLF_GENRES.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => setSelectedGenre(genre.id)}
                  className={`${styles.illustrationButton} ${selectedGenre === genre.id ? styles.illustrationButtonActive : ""}`}
                >
                  {genre.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {sourceMode === "gm" && (
          <div style={{ width: "min(100%, 420px)", display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            <input
              value={gmVillagerWord}
              onChange={(e) => setGmVillagerWord(e.target.value)}
              placeholder="村人陣営の言葉"
              style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #bbb", fontSize: 16 }}
            />
            <input
              value={gmWerewolfWord}
              onChange={(e) => setGmWerewolfWord(e.target.value)}
              placeholder="人狼陣営の言葉"
              style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #bbb", fontSize: 16 }}
            />
          </div>
        )}

        {sourceMode === "random" && (
          <div style={{ width: "min(100%, 420px)", marginTop: 16, padding: "14px 16px", borderRadius: 12, background: "rgba(0,0,0,0.05)", fontSize: 15, lineHeight: 1.6 }}>
            `data/wordwolfTopics.ts` にあるランダム用お題から配布します。
          </div>
        )}

        <button
          onClick={startGame}
          className={theme === "mama" ? styles.wordWolfStartButtonMama : styles.wordWolfStartButtonAi}
        >
          ゲーム開始
        </button>
      </div>
    )
  }

  if (phase === "distribution") {
    const participant = currentParticipant()
    if (!participant) return null

    return (
      <div className={styles.screenBase} style={{ backgroundImage: `url(/image/${theme}/bg_night.png)`, backgroundSize: theme === "mama" ? "contain" : "cover" }}>
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
          <h1 style={{ fontSize: 34, letterSpacing: 2, textShadow: "0 3px 12px rgba(0,0,0,0.6)" }}>お題配布</h1>
        </div>

        {!showWord ? (
          <div className={`${styles.flexCenterColumn} ${styles.gap16}`}>
            <div className={theme === "mama" ? styles.playerBadgeMama : styles.playerBadge}>
              プレイヤー {currentPlayer}
            </div>
            <button
              onClick={() => setShowWord(true)}
              className={theme === "mama" ? styles.orangeButtonMama : styles.orangeButton}
            >
              画面タップ
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, textAlign: "center", padding: "0 20px" }}>
            <img
              src={`/image/${theme}/${participant.role === "werewolf" ? "人狼" : "村人"}.png`}
              alt={participant.role === "werewolf" ? "人狼" : "村人"}
              width={200}
            />
            <p style={{ fontSize: 32, fontWeight: "bold", textShadow: "0 0 10px rgba(255,255,255,0.6)" }}>
              {participant.role === "werewolf" ? "人狼" : "村人"}
            </p>
            <div
              style={{
                minWidth: 240,
                maxWidth: "90vw",
                padding: "18px 24px",
                borderRadius: 18,
                background: "rgba(255,255,255,0.82)",
                color: "#222",
                fontSize: 30,
                fontWeight: "bold",
                boxShadow: "0 12px 28px rgba(0,0,0,0.28)",
              }}
            >
              {participant.word}
            </div>
            <button
              onClick={moveToNextPlayer}
              className={theme === "mama" ? styles.blueButtonMama : styles.blueButton}
            >
              {currentPlayer < participants.length ? "次のプレイヤーへ" : "議論時間へ"}
            </button>
          </div>
        )}
      </div>
    )
  }

  if (phase === "discussion") {
    return (
      <div style={{
        backgroundImage: `url(/image/${theme}/bg_day.png)`,
        backgroundSize: theme === "mama" ? "contain" : "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundBlendMode: "darken",
        backgroundColor: "rgba(0,0,0,0.25)",
        color: "white",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        position: "relative",
      }}>
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
          <h1 style={{ fontSize: 34, textShadow: "0 3px 12px rgba(0,0,0,0.6)", letterSpacing: 2 }}>
            議論タイム
          </h1>
        </div>

        <div style={{ marginTop: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ fontSize: 64, fontWeight: "bold", letterSpacing: 4, textShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
            {formatTime(timeLeft)}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {timerRunning ? (
              <button
                onClick={() => setTimerRunning(false)}
                style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 16, cursor: "pointer" }}
              >
                一時停止
              </button>
            ) : (
              <button
                onClick={() => setTimerRunning(true)}
                style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 16, cursor: "pointer" }}
              >
                再開
              </button>
            )}
              <button
                onClick={() => {
                void endDiscussion()
              }}
              style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 16, cursor: "pointer" }}
            >
              議論終了
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === "voteStart") {
    return (
      <div
        style={{
          backgroundImage: theme === "mama"
            ? `url(/image/${theme}/bg_voteStart.png)`
            : `url(/image/${theme}/bg_day.png)`,
          backgroundSize: theme === "mama" ? "contain" : "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundBlendMode: "darken",
          backgroundColor: "rgba(0,0,0,0.25)",
          color: "white",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          position: "relative",
        }}
      >
        <h1
          style={{
            position: "absolute",
            top: 60,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 34,
            textShadow: "0 3px 12px rgba(0,0,0,0.6)",
            letterSpacing: 2,
          }}
        >
          投票タイム
        </h1>

        <button
          onClick={() => setPhase("vote")}
          style={{
            marginTop: 30,
            padding: "10px 22px",
            fontSize: 16,
            color: "white",
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.35)",
            borderRadius: 12,
            backdropFilter: "blur(4px)",
            cursor: "pointer",
          }}
        >
          追放者選択画面へ
        </button>
      </div>
    )
  }

  if (phase === "vote") {
    return (
      <div style={{
        backgroundImage: theme === "mama"
          ? `url(/image/${theme}/bg_vote.png)`
          : `url(/image/${theme}/bg_day.png)`,
        backgroundSize: theme === "mama" ? "contain" : "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundBlendMode: "darken",
        backgroundColor: "rgba(0,0,0,0.25)",
        color: "white",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 120,
        paddingBottom: 40,
        gap: 20,
      }}>
        <h1 style={{ fontSize: 34, textShadow: "0 3px 12px rgba(0,0,0,0.6)", letterSpacing: 2 }}>
          追放者決定
        </h1>

        <h1>追放するプレイヤーを選択</h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {participants.map((participant) => (
            <button
              key={participant.id}
              onClick={() => setSelectedVoteTarget(participant.id)}
              style={{
                minWidth: 160,
                padding: "14px 18px",
                fontSize: 20,
                borderRadius: 12,
                border: selectedVoteTarget === participant.id ? "3px solid #ff6b6b" : "1px solid rgba(255,255,255,0.25)",
                background: selectedVoteTarget === participant.id ? "rgba(255,107,107,0.72)" : "rgba(255,255,255,0.6)",
                color: "#222",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              プレイヤー {participant.id}
            </button>
          ))}
        </div>

        {selectedParticipant && (
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <p>プレイヤー {selectedParticipant.id} を追放しますか？</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 14 }}>
              <button
                onClick={() => {
                  setExecutedPlayer(selectedParticipant.id)
                  setPhase("result")
                }}
                style={{
                  padding: "10px 22px",
                  fontSize: 16,
                  borderRadius: 12,
                  background: theme === "mama" ? "#6b6b6b" : "linear-gradient(135deg,#6bd4ff,#2b8cff)",
                  border: theme === "mama" ? "2px solid #505050" : "none",
                  color: "white",
                  fontWeight: "bold",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
                  cursor: "pointer",
                }}
              >
                決定
              </button>
              <button
                onClick={() => setSelectedVoteTarget(null)}
                style={{
                  padding: "10px 22px",
                  fontSize: 16,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                戻る
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      backgroundImage: `url(/image/${theme}/bg_vote.png)`,
      backgroundSize: theme === "mama" ? "contain" : "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundBlendMode: "darken",
      backgroundColor: "rgba(0,0,0,0.35)",
      color: "white",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      padding: "0 20px",
      textAlign: "center",
    }}>
      <h1 style={{ fontSize: 40, letterSpacing: 2, textShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>
        追放しました
      </h1>
      <p style={{ fontSize: 22, fontWeight: "bold" }}>
        プレイヤー {executedPlayer}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 240 }}>
        <button
          onClick={() => setPhase("setup")}
          className={theme === "mama" ? styles.oneNightStartButtonMama : styles.oneNightStartButtonAi}
        >
          もう一度
        </button>
        <button
          onClick={() => router.push("/")}
          style={{ padding: "12px 0", fontSize: 16, borderRadius: 12, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer" }}
        >
          トップへ
        </button>
      </div>
    </div>
  )
}
