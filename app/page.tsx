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

const winner = "werewolf"
 
const roles = [
  { id: "villager", name: "村人", img: "/image/村人.png" },
  { id: "werewolf", name: "人狼", img: "/image/人狼.png" },
  { id: "seer", name: "占い師", img: "/image/占い師.png" },
  { id: "knight", name: "騎士", img: "/image/騎士.png" },
  { id: "madman", name: "狂人", img: "/image/狂人.png" },
]


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

export default function Page() {
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const [winner, setWinner] = useState<"villagers" | "werewolves" | "werewolves_by_no_knight" | null>(null)
  const [wolfTarget, setWolfTarget] = useState<number | null>(null)
  const [guardTargets, setGuardTargets] = useState<Record<number, number>>({})
  const [seerResults, setSeerResults] = useState<Record<number, Record<number, "white" | "black">>>({})
  const [mounted, setMounted] = useState(false)
  /*const [firstSeerWhite, setFirstSeerWhite] = useState<number | null>(null)*/
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

  type Player = {
    id: number
    role: (typeof roles)[number]
    alive: boolean
  }

  function getVisiblePlayers(playerIndex: number) {
    const me = players[playerIndex]
    if (!me) return []

    return players
      .map((p, i) => {
        if (!p || i === playerIndex) return null

        // 人狼 → 人狼
        if (me.role.id === "werewolf" && p.role.id === "werewolf") {
          return i + 1
        }

        // 人狼 → 狂人（トグルON）
        if (me.role.id === "werewolf" && showMadmanToWolf && p.role.id === "madman") {
          return i + 1
        }

        // 狂人 → 人狼（トグルON）
        if (me.role.id === "madman" && showWolfToMadman && p.role.id === "werewolf") {
          return i + 1
        }

        return null
      })
      .filter(Boolean)
  }

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
    const knightAlive = survivors.some(p => p.role.id === "knight")

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

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [executedPlayer, setExecutedPlayer] = useState<number | null>(null)

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

  const [timeLeft, setTimeLeft] = useState(180)
  const [timerRunning, setTimerRunning] = useState(false)

  const [phase, setPhase] = useState("setup")
  const [currentPlayer, setCurrentPlayer] = useState(1)
  const [showRole, setShowRole] = useState(false)
  const [nightActionReady, setNightActionReady] = useState(false)
  const [showNextButton, setShowNextButton] = useState(false)

  const [playerCount, setPlayerCount] = useState(4)

  const [players, setPlayers] = useState<(Player | null)[]>(
    Array.from({ length: 4 }, () => null)
  )

  useEffect(() => {
    if (phase === "night") {
        setGuardTargets({})
        setWolfTarget(null)
        setSeerActed({})
      }
  }, [phase])

  useEffect(() => {
    if (phase === "night" && !nightActionReady) {
      playAudio(
        `/audio/[11-${currentPlayer}]${currentPlayer}番の人は他のプレイヤーが目を瞑ったのを確認した後・・・.wav`
      )
    }
  }, [currentPlayer, phase])


  useEffect(() => {
    if (phase === "vote") {
      setVoteTarget(null)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== "morning") {
      setMorningHandled(false)
    }
  }, [phase])

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

  /*useEffect(() => {
    if (phase !== "roleCheck") return

    const role = players[currentPlayer - 1]
    if (!role || role.role.id !== "seer") return
    if (firstSeerWhite === null) return

    setSeerResults(prev => ({
      ...prev,
      [currentPlayer]: {
        ...(prev[currentPlayer] || {}),
        [firstSeerWhite]: "white"
      }
    }))
  }, [phase, currentPlayer, firstSeerWhite])*/
  
  function randomDelay(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

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
      if (phase !== "voteStart") return
      await playAudio("/audio/[06]5からカウントダウン.wav")
      if (phase !== "voteStart") return
      setPhase("vote")
    }
    runVoteStart()
  }

  function shuffle<T>(array: T[]) {
    const arr = [...array]

    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }

    return arr
  }

  function formatTime(sec: number) {

    const m = Math.floor(sec / 60)
    const s = sec % 60

    return `${m}:${s.toString().padStart(2, "0")}`

  }

  function pauseTimer() {
    clearInterval(timerRef.current!)
    timerRef.current = null
    setTimerRunning(false)
  }

  function startTimer() {
    if (timerRef.current) return  // 多重起動防止

    setTimerRunning(true)

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          setTimerRunning(false)
          endDiscussion()
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

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

  const audioResolveRef = useRef<(() => void) | null>(null)

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

    // ▼ここから修正ポイント（複数占い対応）
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

    // 互換用（既存ロジック壊さないために1つだけ保持）
    /*const firstSeer = Object.keys(results)[0]
    if (firstSeer) {
      const firstTarget = Object.keys(results[Number(firstSeer)])[0]
      setFirstSeerWhite(Number(firstTarget))
    } else {
      setFirstSeerWhite(null)
    }*/
    // ▲ここまで修正

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

  function revealRole() {
    setShowRole(true)
  }

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

  if (!mounted) return null

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

            // 続行パターン
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

  if (phase === "night") {

    const role = players[currentPlayer - 1]?.role
    const firstWolf = players.findIndex(p => p?.role.id === "werewolf") + 1

    return (

      <div
        style={{
          background: `url(/image/${theme}/night-bg.png) center / cover no-repeat`,
          backgroundColor: "rgba(0,0,0,0.5)",
          backgroundBlendMode: "darken",
          color: "white",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          position: "relative",
          paddingTop: 80
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
          <h1 style={{fontSize: 34}}>
            {day+1}日目の夜
          </h1>
        </div>

        {!nightActionReady && (

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16
            }}
          >

            <div
              style={{
                fontSize: 20,
                letterSpacing: 2,
                padding: "6px 14px",
                borderRadius: 20,
                background: "rgba(0,0,0,0.35)",
                backdropFilter: "blur(4px)",
                marginBottom: 10
              }}
            >
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
            style={{
              marginTop: 20,
              padding: "14px 28px",
              fontSize: 20,
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg,#ffd966,#ffb347)",
              color: "#333",
              fontWeight: "bold",
              boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
              cursor: "pointer"
            }}
            >
            画面タップ
            </button>
          </div>

        )}

        {nightActionReady && role && (

          <div style={{ textAlign: "center" }}>

            <div
              style={{
                width: 200,
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <img src={role.img} width="140" />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                marginTop: 10
              }}
            >
              <span
                style={{
                  fontSize: 16,
                  opacity: 0.6
                }}
              >
                あなたの役職：
              </span>

              <span
                style={{
                  fontSize: 32,
                  fontWeight: "bold",
                  textShadow: "0 0 10px rgba(255,255,255,0.6)"
                }}
              >
                {role.name}
              </span>
            </div>

            {role?.id === "seer" && !seerActed[currentPlayer] && (
              <div>
                <h3>占うプレイヤーを選択</h3>

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
                          onClick={() => {

                            const target = players[i]?.role
                            const seerTarget = players[i]?.id

                            setSeerResults(prev => ({
                              ...prev,
                              [currentPlayer]: {
                                ...(prev[currentPlayer] || {}),
                                [seerTarget!]: target?.id === "werewolf" ? "black" : "white"
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

            {role?.id === "seer" && seerResults[currentPlayer] && (
              <div>
                {Object.entries(seerResults[currentPlayer]).map(([num, result]) => (
                  <p key={num} style={{ fontSize: 20 }}>
                    プレイヤー {num}は
                    {result === "white" ? "人狼ではありません。" : "人狼です。"}
                  </p>
                ))}

              </div>
            )}

            {role.id === "seer" && (
              <div>
                <div style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "center",
                  flexWrap: "wrap",
                  marginTop: 10
                }}>
                  {players.map((p, i) => {
                    const num = i + 1
                    if (num === currentPlayer) {
                      return (
                        <div key={num} style={{ textAlign: "center" }}>
                          <img
                            src={`/image/${theme}/seer_seer.png`}
                            width={60}
                            style={{
                                  opacity: players[i]?.alive ? 1 : 0.3,
                                  filter: players[i]?.alive ? "none" : "grayscale(100%)"
                            }}/>
                          <div>{num}</div>
                        </div>
                      )
                    }
                    const result = seerResults[currentPlayer]?.[Number(num)]

                    let img = `/image/${theme}/seer_non.png`
                    if (result === "white") img = `/image/${theme}/seer_white.png`
                    if (result === "black") img = `/image/${theme}/seer_black.png`

                    return (
                      <div key={num} style={{ textAlign: "center" }}>
                        <img
                          src={img}
                          width={60}
                          style={{
                            opacity: players[i]?.alive ? 1 : 0.5,
                            filter: players[i]?.alive ? "none" : "grayscale(50%)"
                          }}
                        />
                        <div>{num}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {role?.id === "knight" && !guardTargets[currentPlayer] && (
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
              role?.id === "knight" &&
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

            {role?.id === "werewolf" && wolfTarget === null && (
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
              role?.id === "werewolf" &&
              wolfTarget !== null &&
              currentPlayer === firstWolf && (
                <div>
                  <h3>襲撃先</h3>
                  <p style={{ fontSize: 24 }}>プレイヤー {wolfTarget}</p>
                  <p>仲間の人狼にも襲撃先が表示されます</p>
                </div>
              )
            }

            {
              role?.id === "werewolf" &&
              wolfTarget !== null &&
              currentPlayer !== firstWolf && (
                <div>
                  <h3>襲撃先</h3>
                  <p style={{ fontSize: 24 }}>プレイヤー {wolfTarget}</p>
                  <p>仲間の人狼がこのプレイヤーを襲撃します</p>
                </div>
              )
            }

            {(role?.id === "villager" || role?.id === "madman" )&& !showNextButton && (
              <p>次のプレイヤーへ進むボタンが<br></br>表示されるまでお待ちください...</p>
            )}

            {showNextButton && 
            (
              (role.id !== "werewolf" || wolfTarget !== null) &&
              (role.id !== "knight" || !!guardTargets[currentPlayer]) &&
              (role.id !== "seer" || Object.keys(seerResults[currentPlayer] || {}).length > 0)
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
                  style={{
                    marginTop: 20,
                    padding: "14px 36px",
                    fontSize: 20,
                    borderRadius: 12,
                    border: "none",
                    background: "linear-gradient(135deg,#66ccff,#3399ff)",
                    color: "white",
                    fontWeight: "bold",
                    boxShadow: "0 6px 14px rgba(0,0,0,0.4)",
                    cursor: "pointer"
                  }}
                  >
                    次のプレイヤー
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (phase === "morning") {

    const isDiscussion = discussionReady && timerRunning
    const isPaused = discussionReady && !timerRunning

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
                marginTop: 10,
                padding: "8px 18px",
                fontSize: 14,
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 10,
                color: "white",
                cursor: "pointer"
              }}
            >
              一時停止
            </button>

            <button
              onClick={endDiscussion}
              style={{
                marginTop: 10,
                padding: "8px 18px",
                fontSize: 14,
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 10,
                color: "white",
                cursor: "pointer"
              }}
            >
              議論スキップ
            </button>
          </div>
        )}

        { isPaused && (
          <button
          onClick={startTimer}
          style={{
            marginTop: 10,
            padding: "8px 18px",
            fontSize: 14,
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 10,
            color: "white",
            cursor: "pointer"
          }}
          >
            再開
          </button>
        )}
      </div>
    )
  }

  if (phase === "roleCheck") {

    const role = players[currentPlayer - 1]
    const visiblePlayers = getVisiblePlayers(currentPlayer - 1)

    return (
      
      <div
        style={{
          background: `url(/image/${theme}/night-bg.png) center / cover no-repeat`,
          backgroundColor: "rgba(0,0,0,0.5)",
          backgroundBlendMode: "darken",
          height: "100vh",
          display: "flex",
          color: "white",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          animation: "fadeIn 0.6s ease"
        }}
      >
        <AliveCounter players={players} />

        <div 
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
          }}
        >

          <div
            style={{
              position: "absolute",
              top: 60,
              left: "50%",
              transform: "translateX(-50%)",
              textAlign: "center"
            }}
          >
            <h1 style={{fontSize: 40}}>
              役職確認
            </h1>
          </div>

          {!showRole && (

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  letterSpacing: 2,
                  padding: "6px 14px",
                  borderRadius: 20,
                  background: "rgba(0,0,0,0.35)",
                  backdropFilter: "blur(4px)",
                  marginBottom: 10
                }}
              >
              プレイヤー {currentPlayer}
              </div>

              <button
                onClick={revealRole}
                style={{
                  marginTop: 20,
                  padding: "14px 28px",
                  fontSize: 20,
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg,#ffd966,#ffb347)",
                  color: "#333",
                  fontWeight: "bold",
                  boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
                  cursor: "pointer"
                }}
              >
                役職確認
              </button>
            </div>

          )}

          {showRole && role && (

            <div style={{ textAlign: "center", paddingTop: "40px" }}>

              <div style={{
                width: 180,
                height: 180,
                margin: "0 auto"
              }}>
                <img
                  src={role.role.img}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    marginTop: 60,
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  marginTop: 40
                }}
              >

                <span
                  style={{
                    fontSize: 16,
                    opacity: 0.6
                  }}
                >
                  あなたの役職：
                </span>

                <span
                  style={{
                    fontSize: 32,
                    fontWeight: "bold",
                    textShadow: "0 0 10px rgba(255,255,255,0.6)"
                  }}
                >
                  {role.role.name}
                </span>

              </div>

              {visiblePlayers.length > 0 && (
                <p style={{ marginTop: 12, fontSize: 20 }}>
                  仲間：プレイヤー {visiblePlayers.join(" , ")}
                </p>
              )}

              {role.role.id === "seer" && seerResults[currentPlayer] && (
                <p style={{ marginTop: 12, fontSize: 18 }}>
                  プレイヤー {Object.keys(seerResults[currentPlayer])[0]} は人狼ではありません
                </p>
              )}

              {role.role.id === "seer" && (
                <div>
                  <div style={{
                    display: "flex",
                    gap: 12,
                    justifyContent: "center",
                    flexWrap: "wrap",
                    marginTop: 10
                  }}>
                    {players.map((p, i) => {
                      const num = i + 1
                      if (num === currentPlayer) {
                        return (
                          <div key={num} style={{ textAlign: "center" }}>
                            <img src={`/image/${theme}/seer_seer.png`} width={60} />
                            <div>{num}</div>
                          </div>
                        )
                      }
                      const result = seerResults[currentPlayer]?.[Number(num)]

                      let img = `/image/${theme}/seer_non.png`
                      if (result === "white") img = `/image/${theme}/seer_white.png`
                      if (result === "black") img = `/image/${theme}/seer_black.png`

                      return (
                        <div key={num} style={{ textAlign: "center" }}>
                          <img src={img} width={60} />
                          <div>{num}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={nextPlayer}
                style={{
                  marginTop: 20,
                  padding: "14px 36px",
                  fontSize: 20,
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg,#66ccff,#3399ff)",
                  color: "white",
                  fontWeight: "bold",
                  boxShadow: "0 6px 14px rgba(0,0,0,0.4)",
                  cursor: "pointer"
                }}
              >
                確認済
              </button>

            </div>

          )}

        </div>
      </div>
    )
  }

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
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: "pointer",
            background: theme === "ai" ? "#ffd966" : "#fff",
            fontWeight: theme === "ai" ? "bold" : "normal"
          }}
        >
          イラスト1
        </button>

        <button
          onClick={() => setTheme("mama")}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: "pointer",
            background: theme === "mama" ? "#ffd966" : "#fff",
            fontWeight: theme === "mama" ? "bold" : "normal",
          }}
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
          style={{
            marginTop: 8,
            /*marginBottom: 10,*/
            fontSize: 20,
            fontWeight: "bold",
            letterSpacing: 1
          }}
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
          style={{
            marginTop: 16,
            fontSize: 20,
            fontWeight: "bold",
            letterSpacing: 1
          }}
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
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 14,
                  background: showWolfToMadman ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.03)",
                  cursor: "pointer",
                  transition: "0.2s",
                  boxShadow: showWolfToMadman
                    ? "0 2px 8px rgba(0,0,0,0.2)"
                    : "none"
                }}
              >
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: "2px solid #3399ff",
                  background: showWolfToMadman ? "#3399ff" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 14,
                  fontWeight: "bold",
                }}>
                  {showWolfToMadman ? "✓" : ""}
                </div>

                狂人に人狼を表示
              </label>

              <label
                onClick={() => setShowMadmanToWolf(!showMadmanToWolf)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 14,
                  background: showMadmanToWolf ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.03)",
                  cursor: "pointer",
                  transition: "0.2s",
                  boxShadow: showWolfToMadman
                  ? "0 2px 8px rgba(0,0,0,0.2)"
                  : "none"
                }}
              >
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: "2px solid #3399ff",
                  background: showMadmanToWolf ? "#3399ff" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 14,
                  fontWeight: "bold"
                }}>
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
