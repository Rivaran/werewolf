"use client"

import { useState, useRef } from "react"

import { 
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors
 } from "@dnd-kit/core"

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
}: {
  id: number
  role: { id: string; name: string; img: string } | null
}) {
  const { setNodeRef } = useDroppable({
    id: "slot-" + id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        border: "2px dashed #999",
        padding: 10,
        margin: 5,
        width: 120,
        height: 120,
        textAlign: "center",
      }}
    >
      <div>配役 {id}</div>

      {role && (
        <>
          <img src={role.img} width="60" alt={role.name} />
          <div>{role.name}</div>
        </>
      )}
    </div>
  )
}

export default function Page() {

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const [executedPlayer, setExecutedPlayer] = useState<number | null>(null)
  const [showLastWords, setShowLastWords] = useState(false)

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

  const [playerCount, setPlayerCount] = useState(4)

  const [players, setPlayers] = useState<((typeof roles)[number] | null)[]>(
    Array.from({ length: 4 }, () => null)
  )

  function executePlayer(num: number) {

    setExecutedPlayer(num)
    setPhase("execute")

    const audio = new Audio(`/audio/[07-${num}]${num}番のプレイヤーは追放されます。遺言をどうぞ.wav`)
    audio.play()

  }

  function endDiscussion() {

    clearInterval(timerRef.current!)
    setTimeLeft(0)

    setPhase("voteStart")

    const audio1 = new Audio("/audio/[05]議論終了の時間となりました。投票に移ります.wav")

    audio1.play()

    audio1.onended = () => {
      const audio2 = new Audio("/audio/[06]10からカウントダウン.wav")
      audio2.play()
      audio2.onended = () => {
        setPhase("vote")
      }
    }

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

function startTimer() {
  if (timerRunning) return
    setTimerRunning(true)
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
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
    newPlayers[slotIndex] = role
    setPlayers(newPlayers)
  }

  function playAudio(src: string) {
    const audio = new Audio(src)
    audio.play()
  }

  function startGame() {
    const selectedRoles = players.filter(p => p !== null)
    const shuffled = shuffle(selectedRoles)

    clearInterval(timerRef.current!)
    setTimeLeft(180)
    setTimerRunning(false)
    setPlayers(shuffled)
    setPhase("roleCheck")
    setCurrentPlayer(1)
    setShowRole(false)
    playAudio("/audio/[00]これから人狼ゲームを開始します.wav")

    setTimeout(() => {
      playAudio("/audio/[01]役職を配布しますので、皆さん目を瞑ってください.wav")
    }, 3400)

    setTimeout(() => {
      playAudio("/audio/[02]1番の人は他プレイヤーが目を瞑ったのを確認してから画面の役職確認ボタンをタップしてください.wav")
    }, 8000)

  }

  function revealRole() {
    setShowRole(true)
  }

  function nextPlayer() {

    const next = currentPlayer + 1

    if (next > playerCount) {
      setPhase("morning")
      setTimeout(() => {
        playAudio("/audio/[04]朝になりました。皆さん目を開けて議論を開始してください.wav")
      }, 1000)
      return
    }

    setCurrentPlayer(next)

    setShowRole(false)

    playAudio(`/audio/[03-${next - 1}]${next - 1}番のプレイヤーが役職確認を終えました。続いて${next}番のプレイヤーのみ、目を開け、役職を確認してください.wav`)
  }

  if (phase === "execute") {

    return (

      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20
        }}
      >

        <h1>プレイヤー {executedPlayer}</h1>

        <h2>遺言タイム</h2>

        <button
          onClick={() => setPhase("night")}
          style={{
            fontSize: 20,
            padding: 15
          }}
        >
          遺言終了
        </button>

      </div>

    )

  }

  if (phase === "voteStart") {

    return (

      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20
        }}
      >

        <h1>投票タイム</h1>

        <button
          onClick={() => setPhase("vote")}
          style={{
            fontSize: 24,
            padding: 20
          }}
        >
          追放者選択画面へ
        </button>

      </div>

    )

  }

  if (phase === "morning") {

    return (

      <div
        style={{
          background: "#fff",
          color: "#000",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20
        }}
      >

        <h1>
          {timerRunning ? "議論中" : "朝になりました"}
        </h1>

        <h2>議論時間</h2>

        <div
          style={{
            fontSize: 60,
            fontWeight: "bold"
          }}
        >
          {formatTime(timeLeft)}
        </div>

        {!timerRunning && (

          <button
            onClick={startTimer}
            style={{
              fontSize: 24,
              padding: 15
            }}
          >
            議論開始
          </button>

        )}

        {timerRunning && (
          <button
            onClick={endDiscussion}
            style={{
              fontSize: 18,
              padding: 10
            }}
          >
          議論スキップ
          </button>
        )}

      </div>

    )

  }

  if (phase === "roleCheck") {

    const role = players[currentPlayer - 1]

    return (

      <div
        style={{
          background: "#111",
          color: "white",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center"
        }}
      >

        <h1>プレイヤー {currentPlayer}</h1>

        {!showRole && (

          <button
            onClick={revealRole}
            style={{ fontSize: 24, padding: 20 }}
          >
            役職確認
          </button>

        )}

        {showRole && role && (

          <div style={{ textAlign: "center" }}>

            <img src={role.img} width="200" />

            <h2>{role.name}</h2>

            <button
              onClick={nextPlayer}
              style={{ fontSize: 20, padding: 15 }}
            >
              確認済
            </button>

          </div>

        )}

      </div>
    )
  }

  if (phase === "vote") {

    return (

      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20
        }}
      >

        <h1>追放されたプレイヤーを選択</h1>

        {players.map((_, i) => (

          <button
            key={i}
            onClick={() => executePlayer(i + 1)}
            style={{
              fontSize: 24,
              padding: 20,
              width: 200
            }}
          >
            プレイヤー {i + 1}

          </button>

        ))}

      </div>

    )

  }
  
  return (

    <div style={{ padding: 20 }}>
      <h1>人狼ゲーム 配役</h1>

      <div>
        人数　
        <select
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
          <h2>プレイヤー</h2>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {players.map((role, i) => (
            <PlayerSlot key={i} id={i + 1} role={role as (typeof roles)[number] | null} />
          ))}
        </div>

        <h2>役職</h2>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {roles.map((r) => (
            <RoleCard key={r.id} role={r} />
          ))}
        </div>
      </DndContext>

      <button
        onClick={startGame}
        style={{
          marginTop: 20,
          padding: "10px 16px",
          fontSize: 18,
          cursor: "pointer",
        }}
      >
        ゲーム開始
      </button>
    </div>
  )
}