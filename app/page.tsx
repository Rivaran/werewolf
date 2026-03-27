"use client"

import { useState, useRef, useEffect } from "react"

import { 
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core"

import BuildModal from "@/components/BuildModal" // 占い師のモーダル(人狼⇔狂人でも使えるようにする？)
import RoleDisplay from "@/components/RoleDisplay" // 役職表示
import styles from "./page.module.css" // CSS

const winner = "werewolf" // 勝利陣営の状態

// 役職
const roles = [
  { id: "villager", name: "村人", img: "/image/村人.png" },
  { id: "werewolf", name: "人狼", img: "/image/人狼.png" },
  { id: "seer", name: "占い師", img: "/image/占い師.png" },
  { id: "knight", name: "騎士", img: "/image/騎士.png" },
  { id: "madman", name: "狂人", img: "/image/狂人.png" },
]

// トップページの役職カード
function RoleCard({ role }: { role: { id: string; name: string; img: string } }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: role.id,
  })

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    border: "1px solid gray",
    padding: 10,
    margin: 5,
    width: 90,
    textAlign: "center",
    background: "#fff",
    cursor: "grab",
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
    boxShadow: transform
      ? "0 8px 16px rgba(0,0,0,0.3)"
      : "0 3px 6px rgba(0,0,0,0.2)"
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <img
        src={role.img}
        width="70"
        alt={role.name}
        draggable={false}
        style={{ pointerEvents: "none" }}
      />
      <div>{role.name}</div>
    </div>
  )
}

// トップページの配役
function PlayerSlot({
  id,
  role,
  theme
}: {
  id: number
  role: { id: string; name: string; img: string } | null
  theme: string
}) {
  const { setNodeRef } = useDroppable({
    id: "slot-" + id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        border: "2px dashed #999",
        width: "100%",
        aspectRatio: "1 / 1",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: role ? "flex-start" : "center",
        padding: role ? 0 : 32
      }}
    >
      <div>配役 {id}</div>

      {role && (
        <>
          <img src={role.img} width={theme === "ai" ? 56 : 70} alt={role.name} />
          <div>{role.name}</div>
        </>
      )}
    </div>
  )
}

// 画面の処理
export default function Page() {

  const [winner, setWinner] = useState<"villagers" | "werewolves" | "werewolves_by_no_knight" | null>(null) // 勝利陣営の状態
  const [mounted, setMounted] = useState(false) // 初回レンダリング後に処理する用らしい
  const [wolfTarget, setWolfTarget] = useState<number | null>(null)
  const [guardTargets, setGuardTargets] = useState<Record<number, number>>({})
  const [seerResults, setSeerResults] = useState<Record<number, Record<number, "white" | "black">>>({})
  const [morningDeath, setMorningDeath] = useState<number | null>(null)
  const [day, setDay] = useState(0)
  const [theme, setTheme] = useState("ai")
  const [voteTarget, setVoteTarget] = useState<number | null>(null)
  const [lastGuardTarget, setLastGuardTarget] = useState<Record<number, number | null>>({})
  const [seerActed, setSeerActed] = useState<Record<number, boolean>>({})
  const [showWolfToMadman, setShowWolfToMadman] = useState(false)
  const [showMadmanToWolf, setShowMadmanToWolf] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [morningHandled, setMorningHandled] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [discussionReady, setDiscussionReady] = useState(false)
  const [discussionEnded, setDiscussionEnded] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [executedPlayer, setExecutedPlayer] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(180)
  const [timerRunning, setTimerRunning] = useState(false)
  const [phase, setPhase] = useState("setup")
  const [currentPlayer, setCurrentPlayer] = useState(1)
  const [showRole, setShowRole] = useState(false)
  const [nightActionReady, setNightActionReady] = useState(false)
  const [showNextButton, setShowNextButton] = useState(false)
  const [playerCount, setPlayerCount] = useState(4)
  const [modalType, setModalType] = useState<"seer" | "wolf" | null>(null)
  const [wolfDecider, setWolfDecider] = useState<number | null>(null)

  const [seerToday, setSeerToday] = useState<{
    [player: number]: { target: number; result: string }
  }>({})
  
  const roles = [
    { id: "villager", name: "村人" },
    { id: "werewolf", name: "人狼" },
    { id: "seer", name: "占い師" },
    { id: "knight", name: "騎士" },
    { id: "madman", name: "狂人" },
  ].map(role => ({
    ...role,
    img: `/image/${theme}/${role.name}.png`
  }))

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    })
  )

  const [players, setPlayers] = useState<(Player | null)[]>(
    Array.from({ length: 4 }, () => null)
  )

  const audioResolveRef = useRef<(() => void) | null>(null)

  type Player = {
    id: number
    role: (typeof roles)[number]
    alive: boolean
  }

  type ResultType =
  | "self"
  | "white"
  | "black"
  | "werewolf"
  | "madman"
  | "unknown"

  function canShowNightButton(playerNum: number) {
    const me = players[playerNum - 1]
    if (!me) return false

    // 占い師は常にOK
    if (me.role.id === "seer") return true

    // 人狼
    if (me.role.id === "werewolf") {
      const others = players.filter((p, i) => i !== playerNum - 1)

      // 他の人狼がいる
      const hasWolf = others.some(p => p?.role.id === "werewolf")

      // 狂人が見える設定 && 狂人がいる
      const hasMadman =
        showMadmanToWolf &&
        others.some(p => p?.role.id === "madman")

      return hasWolf || hasMadman
    }

    // 狂人
    if (me.role.id === "madman") {
      if (!showWolfToMadman) return false

      const hasWolf = players.some(p => p?.role.id === "werewolf")
      return hasWolf
    }

    return false
  }

  function buildResults(playerNum: number) {
    const result: Record<number, { type: ResultType }> = {}

    result[playerNum] = { type: "self" }

    const me = players[playerNum - 1]

    players.forEach((p, i) => {
      if (!p || i + 1 === playerNum) return

      // 占い
      const seer = seerResults[playerNum]?.[i + 1]
      if (seer) {
        result[i + 1] = {
          type: seer === "white" ? "white" : "black"
        }
        return
      }

      // 人狼視点
      if (me?.role.id === "werewolf") {
        if (p.role.id === "werewolf") {
          result[i + 1] = { type: "werewolf" }
        }
        if (showMadmanToWolf && p.role.id === "madman") {
          result[i + 1] = { type: "madman" }
        }
      }

      // 狂人視点
      if (me?.role.id === "madman") {
        if (showWolfToMadman && p.role.id === "werewolf") {
          result[i + 1] = { type: "werewolf" }
        }
      }
    })

    return result
  }

  // 仲間取得関数
  function getVisiblePlayers(playerIndex: number) {
    const me = players[playerIndex]
    if (!me) return []

    return players
      .map((p, i) => {
        if (!p || i === playerIndex) return null

        // 人狼 → 人狼
        if (me.role.id === "werewolf" && p.role.id === "werewolf") {
          return { id: i + 1, role: "人狼" }
        }

        // 人狼 → 狂人
        if (me.role.id === "werewolf" && showMadmanToWolf && p.role.id === "madman") {
          return { id: i + 1, role: "狂人" }
        }

        // 狂人 → 人狼
        if (me.role.id === "madman" && showWolfToMadman && p.role.id === "werewolf") {
          return { id: i + 1, role: "人狼" }
        }

        return null
      })
      .filter((v): v is { id: number; role: string } => v !== null)
  }

  // プレイ中の画面上部に表示する生死&操作中の可視化用
  function AliveCounter({ players }: { players: (Player | null)[] }) {

    return (
      <div
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          display: "flex",
          gap: 6,
          zIndex: 9999
        }}
      >
        {players.map((p, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginLeft: -10
            }}
          >
            <span style={{
              fontSize: 18,
              marginRight: -17,
              marginTop: -5,
              textShadow: "0 0 6px rgba(255,255,255,0.6)"
              }}>{i+1}:</span>

            <img
              src={
                !p || !p.alive
                  ? `/image/${theme}/icon_dead.png`
                  : i+1 === currentPlayer && (phase === "night" || phase === "roleCheck")
                    ? `/image/${theme}/icon_active.png`
                    : `/image/${theme}/icon_alive.png`
              }
              style={{
                width: 60,
                height: 45,
                filter: p && p.alive ? "none" : "brightness(0.6)"
              }}
            />

          </div>
        ))}
      </div>
    )
  }

  // 人狼の襲撃関数
  function resolveNight() {

    if (wolfTarget === null) {
      setMorningDeath(null)
      return
    }

    const guarded = Object.values(guardTargets).includes(wolfTarget)

    const updatedPlayers = players.map((p, i) => {
      if (!p) return p

      if (!guarded && i + 1 === wolfTarget) {
        return { ...p, alive: false }
      }

      return p
    })

    setPlayers(updatedPlayers)

    if (guarded) {
      setMorningDeath(null)
    } else {
      setMorningDeath(wolfTarget)
    }

    const survivors = updatedPlayers.filter(
      (p): p is Player => p !== null && p.alive
    )

    const werewolfCount = survivors.filter(p => p.role.id === "werewolf").length
    const villagerCount = survivors.filter(p => p.role.id !== "werewolf").length

    if (werewolfCount === 0) {
      setWinner("villagers")
      setPhase("result")
      return true
    }

    if (werewolfCount >= villagerCount) {
      playAudio("/audio/[13-1]人狼の襲撃により人狼陣営と村人陣営が同数になりましたので、人狼陣営の勝利です.wav")
      setWinner("werewolves")
      setPhase("result")
      return true
    }

    return false
  }

  // 勝敗判定関数
  function judgeAfterExecution(executedNum: number) {

    const updatedPlayers = players.map((p, i) =>
      i === executedNum - 1 && p ? { ...p, alive: false } : p
    )

    const survivors = updatedPlayers.filter(
      (p): p is Player => p !== null && p.alive
    )

    const werewolfCount = survivors.filter(p => p.role.id === "werewolf").length
    const nonWerewolfCount = survivors.filter(p => p.role.id !== "werewolf").length
    const hasKnight = survivors.some(p => p.role.id === "knight")

    if (werewolfCount === 0) return "villagers"

    if (werewolfCount >= nonWerewolfCount) return "werewolves"

    if (nonWerewolfCount === werewolfCount + 1 && !hasKnight) return "werewolves_by_no_knight"
    
    return null
  }

  function buildNightResults(playerNum: number) {
    const result: Record<number, { type: ResultType }> = {}

    const me = players[playerNum - 1]
    if (!me) return result

    // 自分
    result[playerNum] = { type: "self" }

    players.forEach((p, i) => {
      const num = i + 1
      if (!p || num === playerNum) return

      // ① 占い結果（最優先）
      const seer = seerResults[playerNum]?.[num]
      if (seer) {
        result[num] = {
          type: seer === "white" ? "white" : "black"
        }
        return
      }

      // ② 人狼視点
      if (me.role.id === "werewolf") {
        if (p.role.id === "werewolf") {
          result[num] = { type: "werewolf" }
          return
        }
        if (showMadmanToWolf && p.role.id === "madman") {
          result[num] = { type: "madman" }
          return
        }
      }

      // ③ 狂人視点
      if (me.role.id === "madman") {
        if (showWolfToMadman && p.role.id === "werewolf") {
          result[num] = { type: "werewolf" }
          return
        }
      }

      // ④ それ以外
      result[num] = { type: "unknown" }
    })

    return result
  }

  // 初回レンダリング後に処理する用らしい
  useEffect(() => {
    setMounted(true)
  }, [])

  // 夜フェーズ描画後処理
  useEffect(() => {
    if (phase === "night") {
        setGuardTargets({})
        setWolfTarget(null)
        setSeerActed({})
      }
  }, [phase])

  // 夜フェーズ、かつ、現プレイヤーが変わる度に、夜フェーズ準備フラグ立っていない場合の描画後処理
  useEffect(() => {
    if (phase === "night" && !nightActionReady) {
      playAudio(
        `/audio/[11-${currentPlayer}]${currentPlayer}番の人は他のプレイヤーが目を瞑ったのを確認した後・・・.wav`
      )
    }
  }, [currentPlayer, phase])

  // 追放フェーズ描画後処理
  useEffect(() => {
    if (phase === "vote") {
      setVoteTarget(null)
    }
  }, [phase])

  // 朝フェーズ以外の描画後処理
  useEffect(() => {
    if (phase !== "morning") {
      setMorningHandled(false)      
    }
  }, [phase])

  // 朝フェーズの描画後処理
  useEffect(() => {

    if (phase !== "morning") return
    if (morningHandled) return

    setMorningHandled(true)

    async function runMorning() {

      setDiscussionReady(false)
      pauseTimer()

      await playAudio("/audio/[04-1]朝になりました。皆さん目を開けてください.wav")

      if (day === 0) {

        await playAudio("/audio/[04-2]議論時間は３分です。タイマーを開始しますので、議論を開始してください.wav")
        setDiscussionEnded(false)
        setDiscussionReady(true)
        startTimer()

      } else if (morningDeath === null) {

        await playAudio("/audio/[12-0]昨晩の犠牲者はいませんでした.wav")
        await playAudio("/audio/[04-3]議論時間は２分です。タイマーを開始しますので、議論を開始してください.wav")
        setDiscussionEnded(false)
        setDiscussionReady(true)
        startTimer()

      } else {

        await playAudio(`/audio/[12-${morningDeath}]昨晩の犠牲者は${morningDeath}番のプレイヤーです.wav`)
        await playAudio("/audio/[04-3]議論時間は２分です。タイマーを開始しますので、議論を開始してください.wav")
        setDiscussionEnded(false)
        setDiscussionReady(true)
        startTimer()

      }
    }

    runMorning()

  }, [phase])

  // ランダムディレイ関数
  function randomDelay(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // プレイヤー追放関数
  function executePlayer(num: number) {
    setPlayers(prev =>
      prev.map(p =>
        p && p.id === num ? { ...p, alive: false } : p
      )
    )
    setVoteTarget(null)
    setExecutedPlayer(num)
    setPhase("execute")
    playAudio(`/audio/[07-${num}]${num}番のプレイヤーは追放されます。遺言をどうぞ.wav`)
  }

  // 議論終了関数
  function endDiscussion() {
    if (discussionEnded) return
    setDiscussionEnded(true)
    clearInterval(timerRef.current!)
    timerRef.current = null
    setTimeLeft(0)
    setTimerRunning(false)
    setPhase("voteStart")
    async function runVoteStart() {
      await playAudio("/audio/[05]議論終了の時間となりました。投票に移ります.wav")
      await playAudio("/audio/[06]5からカウントダウン.wav")
      setPhase("vote")
    }
    runVoteStart()
  }

  // 役職配布
  function shuffle<T>(array: T[]) {
    const arr = [...array]

    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }

    return arr
  }

  // タイマー表示関数
  function formatTime(sec: number) {

    const m = Math.floor(sec / 60)
    const s = sec % 60

    return `${m}:${s.toString().padStart(2, "0")}`

  }

  // 一時停止関数
  function pauseTimer() {
    clearInterval(timerRef.current!)
    timerRef.current = null
    setTimerRunning(false)
  }

  // タイマー開始関数
  function startTimer() {
    if (timerRef.current) return

    setTimerRunning(true)

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
      if (t <= 1) {
        clearInterval(timerRef.current!)
        timerRef.current = null
        endDiscussion()
        return 0
      }
        return t - 1
      })
    }, 1000)
  }

  // ドロップ関数？
  function handleDragEnd(event: any) {
    const { active, over } = event

    if (!over) return

    const slotIndex = Number(String(over.id).replace("slot-", "")) - 1
    const role = roles.find((r) => r.id === active.id)

    if (!role) return

    const newPlayers = [...players]

    newPlayers[slotIndex] = {
      id: slotIndex + 1,
      role,
      alive: true
    }

    setPlayers(newPlayers)
  }

  // 音声再生関数
  function playAudio(src: string) {
    return new Promise<void>((resolve) => {

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

      const p = audio.play()

      if (p !== undefined) {
        p.catch(() => {
          finish()
        })
      }

      setTimeout(() => {
        finish()
      }, 10000)
    })
  }

  // ゲームスタート関数
  function startGame() {

    if (players.some(p => p === null)) {
      alert("配役をすべて選択してください")
      return
    }

    setDay(0)

    const selectedRoles = players
      .filter(p => p !== null)
      .map(p => p!.role)

    const shuffled = shuffle(selectedRoles)

    const shuffledPlayers = shuffled.map((role, i) => ({
      id: i + 1,
      role,
      alive: true
    }))

    clearInterval(timerRef.current!)
    timerRef.current = null
    setTimeLeft(180)
    setTimerRunning(false)
    setPlayers(shuffledPlayers)

    const seerIndexes = shuffled
      .map((r, i) => ({ role: r, index: i }))
      .filter(x => x.role.id === "seer")

    const results: Record<number, Record<number, "white">> = {}

    seerIndexes.forEach(({ index }) => {
      const seerNum = index + 1

      const candidates = shuffled
        .map((r, i) => ({ role: r, num: i + 1 }))
        .filter(x =>
          x.role.id !== "werewolf" &&
          x.num !== seerNum
        )

      if (candidates.length > 0) {
        const rand = candidates[Math.floor(Math.random() * candidates.length)]
        results[seerNum] = {
          [rand.num]: "white"
        }
      }
    })

    setSeerResults(results)

    setPhase("roleCheck")
    setCurrentPlayer(1)
    setShowRole(false)

    async function runStartAudio() {
      await playAudio("/audio/[00]これから人狼ゲームを開始します.wav")
      await playAudio("/audio/[01]役職を配布しますので、皆さん目を瞑ってください.wav")
      await playAudio("/audio/[02]1番の人は他プレイヤーが目を瞑ったのを確認してから画面の役職確認ボタンをタップしてください.wav")
    }

    runStartAudio()
  }

  // 役職確認関数
  function revealRole() {
    setShowRole(true)
  }

  // 次の生きているプレイヤー関数
  function getNextAlivePlayer(start: number, players: (Player | null)[]) {

    for (let i = 0; i < players.length; i++) {
      const index = (start + i) % players.length
      const p = players[index]

      if (p && p.alive) {
        return index + 1
      }
    }

    return 1
  }

  // 確認済関数
  function nextPlayer() {

    const next = currentPlayer + 1

    if (next > playerCount) {      
      setCurrentPlayer(1)
      setPhase("morning")
      return
    }

    setCurrentPlayer(next)

    setShowRole(false)

    playAudio(`/audio/[03-${next - 1}]${next - 1}番のプレイヤーが役職確認を終えました。続いて${next}番のプレイヤーのみ、目を開け、役職を確認してください.wav`)
  }

  // 初回レンダリング後に処理する用らしい
  if (!mounted) return null

  // 遺言～夜時間まで(遺言～勝敗画面まで)フェーズ
  if (phase === "execute") {

    return (

      <div
        style={{
          backgroundImage: `url(/image/${theme}/day-bg.png)`,
          backgroundSize: "cover",
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
          position: "relative"

        }}
      >
        <AliveCounter players={players} />

        <h1
            style={{
              position: "absolute",
              top: 60,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 34,
              textShadow: "0 3px 12px rgba(0,0,0,0.6)",
              letterSpacing: 4,
              opacity: 0.9,
              whiteSpace: "nowrap"
            }}
          >
            遺言の時間
        </h1>

        <h1 style={{
          fontSize: 26,
          fontWeight: "bold",
          letterSpacing: 2
        }}>プレイヤー {executedPlayer} の遺言</h1>

        <h1>ここで遺言を言ってください</h1>

        <button
          disabled={executing}
          onClick={async () => {

            if (executing) return
              setExecuting(true)

            const result = judgeAfterExecution(executedPlayer!)

            const isEnd =
              result === "villagers" ||
              result === "werewolves" ||
              result === "werewolves_by_no_knight"

            const baseAudio = isEnd
              ? `/audio/[08-${executedPlayer}]${executedPlayer}番のプレイヤーが追放され、夜がやって、来ません.wav`
              : `/audio/[10-${executedPlayer}]${executedPlayer}番のプレイヤーが追放され、夜がやってきます.wav`

            await playAudio(baseAudio)

            if (result === "villagers") {
              await playAudio("/audio/[09-2]村人陣営の勝利です.wav")
              setExecuting(false)
              setWinner("villagers")
              setPhase("result")
              return
            }

            if (result === "werewolves") {
              await playAudio("/audio/[09-1]人狼陣営の勝利です.wav")
              setWinner("werewolves")
              setPhase("result")
              setExecuting(false)
              return
            }

            if (result === "werewolves_by_no_knight") {
              await playAudio("/audio/[13-2]騎士がこの村に生存しておりませんので、人狼陣営の勝利です.wav")
              setWinner("werewolves")
              setPhase("result")
              setExecuting(false)
              return
            }

            setCurrentPlayer(getNextAlivePlayer(0, players))
            setPhase("night")
            setExecuting(false)

          }}

          style={{
            marginTop: 40,
            padding: "14px 36px",
            fontSize: 20,
            borderRadius: 14,
            border: "none",
            background: executing
              ? "rgba(200,200,200,0.6)"
              : "linear-gradient(135deg,#6bd4ff,#2b8cff)",
            color: "white",
            fontWeight: "bold",
            boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
            cursor: executing ? "not-allowed" : "pointer",
            opacity: executing ? 0.7 : 1
          }}
        >
          {executing ? "処理中..." : "夜時間へ"}
        </button>
      </div>

    )

  }

  // 投票フェーズ
  if (phase === "voteStart") {

    return (

      <div
        style={{
          backgroundImage: `url(/image/${theme}/day-bg.png)`,
          backgroundSize: "cover",
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
          position: "relative"

        }}
      >
        <AliveCounter players={players} />

        <h1
          style={{
            position: "absolute",
            top: 60,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 34,
            textShadow: "0 3px 12px rgba(0,0,0,0.6)",
            letterSpacing: 2
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
            cursor: "pointer"
          }}
          >
          追放者選択画面へ
        </button>

      </div>

    )

  }

  // 勝敗表示フェーズ
  if (phase === "result") {

    const bgImage =
      winner === "villagers"
        ? `url(/image/${theme}/village_win.png)`
        : `url(/image/${theme}/wolf_win.png)`

    return (
      <div
        style={{
          background: `${bgImage} center / cover no-repeat`,
          color: "white",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          position: "relative",
          paddingTop: "20vh",
        }}
      >

        <div
          style={{
            fontSize: 46,
            letterSpacing: 4,
            fontWeight: "bold",
            textShadow: "0 4px 16px rgba(0,0,0,0.6)",
          }}
        >
          {winner === "villagers"
            ? "村人陣営の勝利"
            : "人狼陣営の勝利"}
        </div>

        <button
          onClick={() => {
            setPhase("reveal")
          }}
          style={{
            marginTop: 150,
            padding: "16px 40px",
            fontSize: 22,
            borderRadius: 14,
            border: "none",
            background: "linear-gradient(135deg,#6bd4ff,#2b8cff)",
            color: "white",
            fontWeight: "bold",
            boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
            cursor: "pointer",
          }}
        >
          ネタバラシ
        </button>
      </div>
    )
  }

  // ネタバラシフェーズ
  if (phase === "reveal") {

    const bgImage =
      winner === "villagers"
        ? `url(/image/${theme}/village_win.png)`
        : `url(/image/${theme}/wolf_win.png)`

    return (
      <div
        style={{
          background: `${bgImage} center / cover no-repeat`,
          color: "white",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20
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
            letterSpacing: 2
          }}
        >
          役職公開
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
            marginTop: 60
          }}
        >

          {players.map((p, i) => (
            <div
              key={i}
              style={{
                textAlign: "center",
                padding: 10,
                background: "rgba(0,0,0,0.4)",
                borderRadius: 12
              }}
            >
              <div>プレイヤー {i+1}</div>

              <img src={p?.role.img} width={80} />

              <div>{p?.role.name}</div>

              <div>
                {p?.alive ? "生存" : "死亡"}
              </div>
            </div>
          ))}

        </div>

        <button
          onClick={() => {
            setPhase("setup")
            setTimeLeft(180)
            setTimerRunning(false)
            setExecutedPlayer(null)
            setWinner(null)
            setCurrentPlayer(1)
            setShowRole(false)
            setSeerResults({})
            setWolfTarget(null)
            setGuardTargets({})
          }}
          style={{
            padding: "16px 40px",
            fontSize: 22,
            borderRadius: 14,
            border: "none",
            background: "linear-gradient(135deg,#6bd4ff,#2b8cff)",
            color: "white",
            fontWeight: "bold",
            boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
            cursor: "pointer",
          }}
        >
          トップへ
        </button>

      </div>
    )
  }

  // 夜フェーズ
  if (phase === "night") {

    const player = players[currentPlayer - 1]
    const firstWolf = players.findIndex(p => p?.role.id === "werewolf") + 1

    return (

      <div
        className={styles.screenBase}
        style={{
          backgroundImage: `url(/image/${theme}/night-bg.png)`
        }}
      >
        <AliveCounter players={players} />

        <div className={styles.topCenterTitle}>
          <h1 className={styles.titleLarge}>
            {day+1}日目の夜
          </h1>
        </div>

        {!nightActionReady && (

          <div className={`${styles.flexCenterColumn} ${styles.gap16}`}>

            <div className={styles.playerBadge}>
              プレイヤー {currentPlayer}
            </div>

            <button
              onClick={() => {

                const role = players[currentPlayer - 1]

                setNightActionReady(true)
                setShowNextButton(false)

                if (role?.role.id === "villager" || role?.role.id === "madman") {
                  const delay = randomDelay(3000, 5000)
                  setTimeout(() => {
                    setShowNextButton(true)
                  }, delay)

                } else if(role?.role.id !== "werewolf" && role?.role.id !== "knight" && role?.role.id !== "seer") {
                  setShowNextButton(true)
                } else if (role?.role.id === "werewolf" && wolfTarget !== null) {
                  setShowNextButton(true)
                }

              }
            }
            className={styles.orangeButton}
            >
            画面タップ
            </button>
          </div>

        )}

        {nightActionReady && player && (

          <div style={{ textAlign: "center" }}>

              <RoleDisplay
                name={player.role.name}
                img={player.role.img}
              />

            {player.role?.id === "seer" && (
              <>
                {!seerActed[currentPlayer] && (
                  <div>
                    <h3>占うプレイヤーを選択</h3>

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 14,
                      marginTop: 20
                    }}>
                      {players.map((p, i) => {
                        const num = i + 1
                        if (num === currentPlayer) return null
                        if (!players[i]?.alive) return null

                        return (
                          <button
                            key={num}
                            onClick={() => {

                              const target = players[i]?.role
                              const seerTarget = players[i]?.id
                              const result = target?.id === "werewolf" ? "black" : "white"

                              setSeerToday(prev => ({
                                ...prev,
                                [currentPlayer]: {
                                  target: num,
                                  result
                                }
                              }))
                              
                              setSeerResults(prev => ({
                                ...prev,
                                [currentPlayer]: {
                                  ...(prev[currentPlayer] || {}),
                                  [seerTarget!]: result
                                }
                              }))

                              setSeerActed(prev => ({
                                ...prev,
                                [currentPlayer]: true
                              }))

                              setShowNextButton(true)
                            }}
                            style={{
                              padding: "14px 20px",
                              fontSize: 18,
                              borderRadius: 14,
                              border: "1px solid rgba(255,255,255,0.35)",
                              background: "rgba(255,255,255,0.15)",
                              color: "white",
                              backdropFilter: "blur(6px)",
                              cursor: "pointer"
                              }}
                            >
                              プレイヤー {num}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {seerToday[currentPlayer] && (
                    <p
                      style={{
                        marginTop: 12,
                        fontSize: 22,
                        fontWeight: "bold",
                      }}>
                      プレイヤー {seerToday[currentPlayer].target} は
                      {seerToday[currentPlayer].result === "white"
                        ? "人狼ではありません"
                        : "人狼です"}
                    </p>
                  )}

                  <button
                    onClick={() => setModalType("seer")}
                    style={{
                      marginTop: 20,
                      fontSize: 20,
                      color: "rgba(255,255,255,0.7)",
                      background: "transparent",
                      border: "none",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    🔍 占い結果一覧
                  </button>
                </>
              )}

              {player.role?.id === "knight" && !guardTargets[currentPlayer] && (
                <div>
                  <h3>護衛するプレイヤーを選択</h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 14,
                      marginTop: 20
                    }}
                  >

                    {players.map((p, i) => {

                      const num = i + 1

                      if (num === currentPlayer) return null
                      if (!players[i]?.alive) return null

                      return (
                        <button
                          key={num}
                          disabled={lastGuardTarget[currentPlayer] === num}
                          onClick={() => {
                            setGuardTargets(prev => ({
                              ...prev,
                              [currentPlayer]: num
                            }))

                            setLastGuardTarget(prev => ({
                              ...prev,
                              [currentPlayer]: num
                            }))

                            setShowNextButton(true)
                          }}
                          style={{
                            position: "relative",
                            overflow: "hidden",
                            padding: "14px 20px",
                            fontSize: 18,
                            borderRadius: 14,
                            border: "1px solid rgba(255,255,255,0.35)",
                            background:
                              lastGuardTarget[currentPlayer] === num
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(255,255,255,0.15)",
                            color:
                              lastGuardTarget[currentPlayer] === num
                                ? "rgba(255,255,255,0.5)"
                                : "white",
                            backdropFilter: "blur(6px)",
                            cursor:
                              lastGuardTarget[currentPlayer] === num
                                ? "not-allowed"
                                : "pointer"
                          }}
                        >
                          プレイヤー {num}

                          {lastGuardTarget[currentPlayer] === num && (
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                pointerEvents: "none",
                                background:
                                  "linear-gradient(160deg, transparent 48%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.9) 50%, transparent 52%)"
                              }}
                            />
                          )}
                        </button>
                      )
                  })}
                </div>
              </div>
            )}

            {
              player.role?.id === "knight" &&
              guardTargets[currentPlayer] && (
                <div>
                  <h3>護衛先</h3>
                  <p style={{ fontSize: 24 }}>
                    プレイヤー {guardTargets[currentPlayer]}
                  </p>
                  <p>このプレイヤーを護衛します</p>
                </div>
              )
            }

            {player.role?.id === "werewolf" && wolfTarget === null && (
              <div>
                <h3>襲撃するプレイヤーを選択</h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 14,
                    marginTop: 20
                  }}
                >

                  {players.map((p, i) => {

                    const num = i + 1

                    if (num === currentPlayer) return null
                    if (!players[i]?.alive) return null
                    if (players[i]?.role?.id === "werewolf") return null

                    return (
                      <button
                        key={num}
                        onClick={() => {
                          setWolfTarget(num)
                          setWolfDecider(currentPlayer)
                          setShowNextButton(true)
                        }}
                        style={{
                            padding: "14px 20px",
                            fontSize: 18,
                            borderRadius: 14,
                            border: "1px solid rgba(255,255,255,0.35)",
                            background: "rgba(255,255,255,0.15)",
                            color: "white",
                            backdropFilter: "blur(6px)",
                            cursor: "pointer"
                        }}
                      >
                        プレイヤー {num}
                      </button>
                    )
                })}
                </div>
              </div>
            )}
            
            {
              player.role?.id === "werewolf" &&
              wolfTarget !== null &&
              wolfDecider === currentPlayer && (
              <div>
                <h3>襲撃先</h3>
                <p style={{ fontSize: 24 }}>プレイヤー {wolfTarget}</p>
                <p>
                  {wolfDecider === currentPlayer
                    ? "あなたがこのプレイヤーを襲撃します"
                    : "仲間の人狼がこのプレイヤーを襲撃します"}
                </p>
              </div>
              )
            }

            {
              player.role?.id === "werewolf" &&
              wolfTarget !== null &&
              currentPlayer !== firstWolf && (
                <div>
                  <h3>襲撃先</h3>
                  <p style={{ fontSize: 24 }}>プレイヤー {wolfTarget}</p>
                  <p>仲間の人狼がこのプレイヤーを襲撃します</p>
                </div>
              )
            }

            {(player.role?.id === "villager" || player.role?.id === "madman" )&& !showNextButton && (
              <p>次のプレイヤーへ進むボタンが<br></br>表示されるまでお待ちください...</p>
            )}

            {showNextButton && 
            (
              (player.role.id !== "werewolf" || wolfTarget !== null) &&
              (player.role.id !== "knight" || !!guardTargets[currentPlayer]) &&
              (player.role.id !== "seer" || Object.keys(seerResults[currentPlayer] || {}).length > 0)
            ) && (

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 10
                }}
              >
                <button
                  onClick={() => {

                    let next = currentPlayer + 1

                    while (next <= playerCount) {
                      const p = players[next - 1]
                      if (p && p.alive) break
                      next++
                    }
                    setCurrentPlayer(next)
                    setNightActionReady(false)
                    if (next > playerCount) {
                      const finished = resolveNight()
                      if (!finished) {
                        setDay(d => d + 1)
                        setCurrentPlayer(1)
                        setPhase("morning")
                      }                    
                      setTimeLeft(120)
                      setTimerRunning(false)
                      setNightActionReady(false)
                      setCurrentPlayer(1)
                      return
                    }
                  }}
                  className={styles.blueButton}
                  >
                    次のプレイヤー
                </button>
              </div>
            )}
          </div>
        )}
        <BuildModal
          isOpen={modalType !== null}
          onClose={() => setModalType(null)}
          players={players}
          currentPlayer={currentPlayer}
          results={buildNightResults(currentPlayer)}
          theme={theme}
          title={
            modalType === "wolf"
              ? "👥 仲間情報"
              : "🔍 占い結果"
          }
        />
      </div>
    )
  }

    // 追放者決定フェーズ
  if (phase === "vote") {

    return (

      <div
        style={{
          backgroundImage: `url(/image/${theme}/day-bg.png)`,
          backgroundSize: "cover",
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
          position: "relative"
        }}
      >
        <AliveCounter players={players} />
        <h1
          style={{
            position: "absolute",
            top: 60,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 34,
            textShadow: "0 3px 12px rgba(0,0,0,0.6)",
            letterSpacing: 2
          }}
        >
          追放者決定
        </h1>

        <h1>追放するプレイヤーを選択</h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 10,
            marginTop: 20
          }}
        >

        {players.map((p, i) => {

          const dead = p?.alive === false

          return (
            <button
              key={i}
              disabled={dead}
              style={{
                width: 160,
                padding: 12,
                margin: 4,
                fontSize: 18,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.25)",
                background: dead
                  ? "rgba(80,80,80,0.65)"
                  : "rgba(255,255,255,0.6)",
                color: "white",

                cursor: dead ? "not-allowed" : "pointer",

                opacity: dead ? 0.4 : 1,

                backdropFilter: "blur(6px)"
              }}

              onClick={() => {
                if (!dead) setVoteTarget(i + 1)
              }}
            >
              プレイヤー {i + 1}
              {dead}
            </button>
          )
        })}
        </div>

        {voteTarget !== null && (
          <div>
            <div style={{marginTop:20,textAlign:"center"}}>
              <p>プレイヤー {voteTarget} を追放しますか？</p>
            </div>

            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 16
              }}
            >

              <button
                onClick={() => executePlayer(voteTarget)}
                style={{ 
                  padding: "12px 26px",
                  fontSize: 18,
                  borderRadius: 12,
                  background: "#4fa3ff",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  marginRight: 12
                }}
              >
                決定
              </button>

              <button
                style={{
                  padding: "10px 22px",
                  fontSize: 16,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  color: "white",
                  cursor: "pointer"
                }}
                onClick={() => setVoteTarget(null)}
              >
                戻る
              </button>
            </div>
          </div>
        )}

      </div>

    )

  }

  // 朝フェーズ
  if (phase === "morning") {

    const isDiscussion = discussionReady && timerRunning
    const isPaused = discussionReady && !timerRunning && !discussionEnded

    return (

      <div
        style={{
          backgroundImage: discussionReady
            ? `url(/image/${theme}/day-bg.png)`
            : `url(/image/${theme}/morning-bg.png)`,

          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",

          backgroundBlendMode: "darken",

          backgroundColor: timerRunning
            ? "rgba(0,0,0,0.25)"
            : "transparent",

          color: "white",

          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          position: "relative"
        }}
      >

          <AliveCounter players={players} />

          <div
            style={{
              position: "absolute",
              top: 60,
              left: "50%",
              transform: "translateX(-50%)",
              textAlign: "center"
            }}
          >
            <h1
              style={{
                fontSize: 34,
                textShadow: "0 3px 12px rgba(0,0,0,0.6)",
                letterSpacing: 2
              }}
            >
              {discussionReady
                ? `${day + 1}日目の昼`
                : `${day + 1}日目の朝`}
            </h1>
          </div>

          {!timerRunning && day !== 0 && !isPaused && (
            <div
              style={{
                marginTop: 120,
                padding: "16px 28px",
                borderRadius: 16,
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(6px)",
                textAlign: "center"
              }}
            >
                {morningDeath === null ? (
                  <p>昨晩の犠牲者はいませんでした</p>
                ) : (
                  <p>昨晩の犠牲者：プレイヤー {morningDeath}</p>
                )}
            </div>
          )}
        
          <div
            style={{
              marginTop: 10,
              textAlign: "center"
            }}
          >

            <div
              style={{
                fontSize: 22,
                opacity: 0.9,
                letterSpacing: 2,
                textShadow: "0 2px 8px rgba(0,0,0,0.5)"
              }}
            >
            {discussionReady || isPaused
              ? `残り時間`
              : `議論時間`}
            </div>

            <div
              style={{
                fontSize: 80,
                fontWeight: "bold",
                color: timeLeft <= 10 ? "#ff4d4d" : "white"
              }}
            >
              {formatTime(timeLeft)}
            </div>

          </div>

        {isDiscussion && !isPaused && (

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={pauseTimer}
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
                width: 120
              }}
            >
              一時停止
            </button>

            <button
              onClick={endDiscussion}
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
                width: 120
              }}
            >
              議論終了
            </button>
          </div>
        )}

        { isPaused && (
          <button
          onClick={startTimer}
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
            width: 120
          }}
          >
            再開
          </button>
        )}
      </div>
    )
  }

  // 役職確認フェーズ
  if (phase === "roleCheck") {

    const player = players[currentPlayer - 1]
    const visiblePlayers = getVisiblePlayers(currentPlayer - 1)

    return (
      
      <div
        className={styles.screenBase}
        style={{
          backgroundImage: `url(/image/${theme}/night-bg.png)`
        }}
      >
        <AliveCounter players={players} />

        <div className={styles.flexCenterColumn}>

        <div className={styles.topCenterTitle}>
          <h1 className={styles.titleXL}>
            役職確認
          </h1>
        </div>

          {!showRole && (

            <div className={`${styles.flexCenterColumn} ${styles.gap16}`}>

              <div className={styles.playerBadge}>
                プレイヤー {currentPlayer}
              </div>

              <button
                onClick={revealRole}
                className={styles.orangeButton}
              >
                役職確認
              </button>
            </div>

          )}

          {showRole && player && (

            <div style={{ textAlign: "center" }}>

              <RoleDisplay
                name={player.role.name}
                img={player.role.img}
              />

              {visiblePlayers.length > 0 && (
                <div>
                  <div style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 16
                    }}>

                      <div style={{
                        display: "flex",
                        justifyContent: "center",
                        flexWrap: "wrap",
                        gap: 8
                      }}>
                        <div style={{
                          fontSize: 25,
                          marginTop: 8,
                          opacity: 0.9
                        }}>
                          仲間：
                        </div>

                        {visiblePlayers.map(p => (
                          <div
                            key={p.id}
                            style={{
                              padding: "12px 12px",
                              borderRadius: 999,
                              fontSize: 20,
                              boxShadow:
                              p.role === "人狼"
                                ? "0 0 12px rgba(255,77,79,0.6)"
                                : "0 0 8px rgba(255,255,255,0.3)",
                              background:
                                p.role === "人狼"
                                  ? "rgba(255,77,79,0.2)"
                                  : "rgba(200,200,200,0.2)",
                              color:
                                p.role === "人狼"
                                  ? "#ff4d4f"
                                  : "#ccc",
                              border:
                                p.role === "人狼"
                                  ? "1px solid rgba(255,77,79,0.4)"
                                  : "1px solid rgba(255,255,255,0.2)"
                            }}
                          >
                            {p.id} {p.role}
                          </div>
                        ))}
                      </div>

                  </div>

                  <button
                    onClick={() => setModalType("wolf")}
                    style={{
                      marginTop: 20,
                      fontSize: 20,
                      color: "rgba(255,255,255,0.7)",
                      background: "transparent",
                      border: "none",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                  🔍 仲間確認
                  </button>
                </div>

              )}

              {player.role.id === "seer" && seerResults[currentPlayer] && (
                <div>
                  <p 
                    style={{
                      marginTop: 12,
                      fontSize: 22,
                      fontWeight: "bold",
                    }}>
                      プレイヤー {Object.keys(seerResults[currentPlayer])[0]} は人狼ではありません
                  </p>

                  <button
                    onClick={() => setModalType("seer")}
                    style={{
                      marginTop: 20,
                      fontSize: 20,
                      color: "rgba(255,255,255,0.7)",
                      background: "transparent",
                      border: "none",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                  🔍 占い結果一覧
                  </button>
                </div>

              )}

              <button
                onClick={nextPlayer}
                className={styles.blueButton}
              >
                確認済
              </button>

            </div>

          )}

        </div>
        <BuildModal
          isOpen={modalType !== null}
          onClose={() => setModalType(null)}
          players={players}
          currentPlayer={currentPlayer}
          results={buildNightResults(currentPlayer)}
          theme={theme}
          title={
            modalType === "wolf"
              ? "👥 仲間情報"
              : "🔍 占い結果"
          }
        />
      </div>
    )
  }
  
  // トップページ
  return (

    <div
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}
    >

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginBottom: 3
        }}
      >

        <button
          onClick={() => setTheme("ai")}
          className={`${styles.illustrationButton} ${
            theme === "ai" ? styles.illustrationButtonActive : ""
          }`}
        >
          イラスト1
        </button>

        <button
          onClick={() => setTheme("mama")}
          className={`${styles.illustrationButton} ${
            theme === "mama" ? styles.illustrationButtonActive : ""
          }`}
        >
          イラスト2
        </button>

        <button
          onClick={() => setShowSettings(true)}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
            fontWeight: "normal",
            opacity: 0.9
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f5f5f5"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fff"
          }}
        >
          ⚙ 設定
        </button>

      </div>

      <img
        src={`/image/${theme}/title.png`}
        style={{
          width: "90%",
          maxWidth: 400,
          maxHeight: 120,
          marginBottom: 3
        }}
      />

      <div style={{ marginBottom: 3 }}>
        人数　
        <select
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "2px solid #888",
            background: "#fff",
            fontSize: 16,
            cursor: "pointer"
          }}
          value={playerCount}
          onChange={(e) => {
            const n = Number(e.target.value)
            setPlayerCount(n)
            setPlayers(Array.from({ length: n }, () => null))
          }}
        >
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={5}>5</option>
          <option value={6}>6</option>
        </select>
      </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>

        <h2
          className={styles.sectionTitle}
        >
          配役選択
        </h2>
        
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 3,
            justifyContent: "center"
          }}
        >
          {players.map((role, i) => (
            <PlayerSlot
              key={i}
              id={i + 1}
              role={role?.role ?? null}
              theme={theme}
            />
          ))}
        </div>

        <h2
          className={styles.sectionTitle}
        >
          役職
        </h2>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center"}}>
          {roles.map((r) => (
            <RoleCard key={r.id} role={r} />
          ))}
        </div>
      </DndContext>

      <button
        onClick={startGame}
        style={{
          marginTop: 30,
          padding: "14px 40px",
          fontSize: 22,
          background: "#ff6b6b",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          cursor: "pointer"
        }}
      >
        ゲーム開始
      </button>

      {/* 設定画面のモーダル */}
      {showSettings && (

        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999
        }}>
          <div style={{
            background: "rgb(255, 255, 255)",
            backdropFilter: "blur(10px)",
            padding: 24,
            borderRadius: 16,
            width: 320,
            border: "1px solid rgba(255,255,255,0.4)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            color: "black"
          }}>
            <div style={{
              textAlign: "center",
              marginBottom: 16
            }}>
              <div style={{
                fontSize: 18,
                fontWeight: "bold",
                letterSpacing: 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.1)"
              }}>
                ⚙ ゲーム設定
              </div>

              <label
                onClick={() => setShowWolfToMadman(!showWolfToMadman)}
                className={`${styles.toggleLabel} ${
                  showWolfToMadman ? styles.toggleLabelActive : ""
                }`}
              >
                <div
                  className={`${styles.toggleBox} ${
                    showWolfToMadman ? styles.toggleBoxActive : ""
                  }`}
                >
                  {showWolfToMadman ? "✓" : ""}
                </div>

                狂人に人狼を表示
              </label>

              <label
                onClick={() => setShowMadmanToWolf(!showMadmanToWolf)}
                className={`${styles.toggleLabel} ${
                  showMadmanToWolf ? styles.toggleLabelActive : ""
                }`}
              >
                <div
                  className={`${styles.toggleBox} ${
                    showMadmanToWolf ? styles.toggleBoxActive : ""
                  }`}
                >
                  {showMadmanToWolf ? "✓" : ""}
                </div>

                人狼に狂人を表示
              </label>

              <button
                onClick={() => setShowSettings(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg,#6bd4ff,#2b8cff)",
                  color: "white",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
