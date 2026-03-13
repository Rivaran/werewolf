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
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const [winner, setWinner] = useState<"villagers" | "werewolves" | null>(null)
  const [wolfTarget, setWolfTarget] = useState<number | null>(null)
  const [villagerDelay, setVillagerDelay] = useState(0)
  const [guardTargets, setGuardTargets] = useState<Record<number, number>>({})
  const [seerResults, setSeerResults] = useState<Record<number, string>>({})
  const [mounted, setMounted] = useState(false)
  const [firstSeerWhite, setFirstSeerWhite] = useState<number | null>(null)
  const [morningDeath, setMorningDeath] = useState<number | null>(null)
  const [day, setDay] = useState(0)
  const [theme, setTheme] = useState("mama")
  const [voteTarget, setVoteTarget] = useState<number | null>(null)

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
    role: (typeof roles)[number]
    alive: boolean
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

    if (werewolfCount === 0) {
      setWinner("villagers")
      setPhase("result")
      return true
    }

    if (werewolfCount >= villagerCount) {
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

    setPlayers(updatedPlayers)

    const survivors = updatedPlayers.filter(
      (p): p is Player => p !== null && p.alive
    )

    const werewolfCount = survivors.filter((p) => p.role.id === "werewolf").length
    const nonWerewolfCount = survivors.filter((p) => p.role.id !== "werewolf").length
    const hasKnight = survivors.some((p) => p.role.id === "knight")

    if (werewolfCount === 0) {
      setWinner("villagers")
      setPhase("result")
      return
    }

    if (werewolfCount >= nonWerewolfCount) {
      setWinner("werewolves")
      setPhase("result")
      return
    }

    if (nonWerewolfCount === werewolfCount + 1 && !hasKnight) {
      setWinner("werewolves")
      setPhase("result")
      return
    }

    const firstAliveIndex = updatedPlayers.findIndex((p) => p && p.alive)

    setNightPlayer(firstAliveIndex + 1)
    setNightActionReady(false)
    setPhase("night")
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
  const [nightPlayer, setNightPlayer] = useState(1)
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
        setSeerResults({})
      }
  }, [phase])

  useEffect(() => {
    if (phase === "vote") {
      setVoteTarget(null)
    }
  }, [phase])

  function randomDelay(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  function executePlayer(num: number) {

    setVoteTarget(null)

    setExecutedPlayer(num)
    setPhase("execute")
    playAudio(`/audio/[07-${num}]${num}番のプレイヤーは追放されます。遺言をどうぞ.wav`)

  }

  function endDiscussion() {

    clearInterval(timerRef.current!)
    setTimeLeft(0)

    setPhase("voteStart")

    playAudio(
      "/audio/[05]議論終了の時間となりました。投票に移ります.wav",
      () => {
        playAudio(
          "/audio/[06]5からカウントダウン",
          () => {
            setPhase("vote")
          }
        )
      }
    )

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

    newPlayers[slotIndex] = {
      role,
      alive: true
    }

    setPlayers(newPlayers)
  }

  function playAudio(src: string, onEnd?: () => void) {

    if (!audioRef.current) {
      audioRef.current = new Audio(src)
    }

    const audio = audioRef.current

    audio.pause()
    audio.src = src
    audio.currentTime = 0

    if (onEnd) {
      audio.onended = onEnd
    } else {
      audio.onended = null
    }

    audio.play()
  }
  
  function startGame() {

    setDay(0)
    
    const selectedRoles = players
      .filter(p => p !== null)
      .map(p => p!.role)
      
    const shuffled = shuffle(selectedRoles)
    const shuffledPlayers = shuffled.map(role => ({
      role,
      alive: true
    }))

    clearInterval(timerRef.current!)
    setTimeLeft(180)
    setTimerRunning(false)
    setPlayers(shuffledPlayers)

    const whiteCandidates = shuffled
      .map((role, i) => ({ role, num: i + 1 }))
      .filter((x) => x.role.id !== "werewolf")

    if (whiteCandidates.length > 0) {
      const randomIndex = Math.floor(Math.random() * whiteCandidates.length)
      setFirstSeerWhite(whiteCandidates[randomIndex].num)
    } else {
      setFirstSeerWhite(null)
    }

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

  if (!mounted) return null

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

        <button
          onClick={() => judgeAfterExecution(executedPlayer!)}
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

  if (phase === "result") {
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
        <h1>{winner === "villagers" ? "村人陣営の勝利" : "人狼陣営の勝利"}</h1>

        <button
          onClick={() => {
            setPhase("setup")
            setTimeLeft(180)
            setTimerRunning(false)
            setExecutedPlayer(null)
            setWinner(null)
            setCurrentPlayer(1)
            setShowRole(false)
            setFirstSeerWhite(null)
            setSeerResults({})
            setWolfTarget(null)
            setGuardTargets({})
          }}
          style={{
            fontSize: 20,
            padding: 15
          }}
        >
          トップに戻る
        </button>
      </div>
    )
  }


  if (phase === "night") {

    const role = players[nightPlayer - 1]?.role

    return (

      <div
        style={{
          background: "#000",
          color: "white",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20
        }}
      >

        <h1>夜フェーズ</h1>

        <h2>プレイヤー {nightPlayer}</h2>

        {!nightActionReady && (

          <button
            onClick={() => {

              const role = players[nightPlayer - 1]

              setNightActionReady(true)
              setShowNextButton(false)

              if (role?.role.id === "villager") {
                const delay = randomDelay(3000, 5000)
                setVillagerDelay(delay)
                setTimeout(() => {
                  setShowNextButton(true)
                }, delay)

              } else if(role?.role.id !== "werewolf" && role?.role.id !== "knight" && role?.role.id !== "seer") {
                setShowNextButton(true)
              } else if (role?.role.id === "werewolf" && wolfTarget !== null) {
                setShowNextButton(true)
              }
                            
            }}
          >
          画面タップ
          </button>

        )}

        {nightActionReady && role && (

          <div style={{ textAlign: "center" }}>

            <img src={role.img} width="200" />

            <h2>{role.name}</h2>

            {role?.id === "seer" && !seerResults[nightPlayer] && (
              <div>
                <h3>占うプレイヤーを選択</h3>

                {players.map((p, i) => {

                  const num = i + 1

                  if (num === nightPlayer) return null
                  if (num === executedPlayer) return null

                  return (
                    <button
                      key={i}
                      onClick={() => {

                        const target = players[i]?.role

                        setSeerResults(prev => ({
                          ...prev,
                          [nightPlayer]: target?.id === "werewolf"
                            ? "人狼です"
                            : "人狼ではありません"
                        }))

                        setShowNextButton(true)
                      }}
                      style={{
                        fontSize: 20,
                        padding: 10,
                        margin: 5
                      }}
                    >
                      プレイヤー {num}
                    </button>
                  )
                })}
              </div>
            )}

            {role?.id === "seer" && seerResults[nightPlayer] && (
              <div>
                <h3>占い結果</h3>
                  <p style={{fontSize:24}}>
                    {seerResults[nightPlayer]}
                  </p>
              </div>
            )}

            {role?.id === "knight" && !guardTargets[nightPlayer] && (
              <div>
                <h3>護衛するプレイヤーを選択</h3>

                {players.map((p, i) => {

                  const num = i + 1

                  if (num === nightPlayer) return null
                  if (num === executedPlayer) return null

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setGuardTargets(prev => ({
                        ...prev,
                        [nightPlayer]: num
                      }))
                        setShowNextButton(true)
                      }}
                      style={{
                        fontSize: 20,
                        padding: 10,
                        margin: 5
                      }}
                    >
                      プレイヤー {num}
                    </button>
                  )
                })}
              </div>
            )}

            {role?.id === "werewolf" && wolfTarget === null && (
              <div>
                <h3>襲撃するプレイヤーを選択</h3>

                {players.map((p, i) => {

                  const num = i + 1

                  if (num === nightPlayer) return null
                  if (num === executedPlayer) return null

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setWolfTarget(num)
                        setShowNextButton(true)
                      }}
                      style={{
                        fontSize: 20,
                        padding: 10,
                        margin: 5
                      }}
                    >
                      プレイヤー {num}
                    </button>
                  )
                })}
              </div>
            )}

            {role?.id === "werewolf" && wolfTarget !== null && (
              <div>
                <h3>襲撃先</h3>
                <p style={{ fontSize: 24 }}>プレイヤー {wolfTarget}</p>
                <p>仲間の人狼がこのプレイヤーを襲撃します</p>
              </div>
            )}

            {role?.id === "villager" && !showNextButton && (
              <p>次のプレイヤーへ進むまでお待ちください...</p>
            )}

            {showNextButton && 
            (
              (role.id !== "werewolf" || wolfTarget !== null) &&
              (role.id !== "knight" || !!guardTargets[nightPlayer]) &&
              (role.id !== "seer" || !!seerResults[nightPlayer])
            ) && (
              <button
                onClick={() => {

                  let next = nightPlayer + 1

                  while (next <= playerCount) {
                    const p = players[next - 1]
                    if (p && p.alive) break
                    next++
                  }

                  setNightPlayer(next)
                  setNightActionReady(false)

                  if (next > playerCount) {

                    const finished = resolveNight()

                    if (!finished) {
                      setDay(d => d + 1)
                      setPhase("morning")
                    }
                    
                    setTimeLeft(120)
                    setTimerRunning(false)

                    setNightActionReady(false)
                    setNightPlayer(1)

                    setTimeout(() => {
                      playAudio("/audio/[04]朝になりました。皆さん目を開けて議論を開始してください.wav")
                    }, 1000)

                    return
                  }

                }}
                style={{
                  fontSize: 20,
                  padding: 15
                }}
                >
                  次のプレイヤー
              </button>
            )}

          </div>

        )}

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

        {day === 0 ? null : (
          timerRunning === true ? null : (
            morningDeath === null ? (
              <p>昨夜は誰も死にませんでした</p>
            ) : (
              <p>プレイヤー {morningDeath} が死亡しました</p>
            )
          )
        )}

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

            <img src={role.role.img} width="200" />

            <h2>{role.role.name}</h2>

            {role.role.id === "werewolf" && (() => {
              const wolfMates = players
                .map((p, i) =>
                  p?.role.id === "werewolf" && i !== currentPlayer - 1
                    ? i + 1
                    : null
                )
                .filter(Boolean)

              if (wolfMates.length === 0) return null

              return (
                <p style={{ marginTop: 12 }}>
                  仲間：{wolfMates.join(" , ")}
                </p>
              )
            })()}

            {role.role.id === "seer" && firstSeerWhite !== null && (
              <p style={{ marginTop: 12, fontSize: 20 }}>
                プレイヤー {firstSeerWhite} は人狼ではありません
              </p>
            )}

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

        {players.map((p, i) => {

          if (!p?.alive) return null

          return (
            <button
              key={i}
              onClick={() => setVoteTarget(i + 1)}
            >
              プレイヤー {i + 1}
            </button>
          )
        })}

        {voteTarget !== null && (
          <div style={{ marginTop: 20 }}>
            <p>プレイヤー {voteTarget} を追放しますか？</p>

            <button
              onClick={() => executePlayer(voteTarget)}
              style={{ marginRight: 10 }}
            >
              決定
            </button>

            <button
              onClick={() => setVoteTarget(null)}
            >
              戻る
            </button>
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
          marginBottom: 10
        }}
      >

        <button
          onClick={() => setTheme("mama")}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: "pointer",
            background: theme === "mama" ? "#ffd966" : "#fff",
            fontWeight: theme === "mama" ? "bold" : "normal"
          }}
        >
          イラスト1
        </button>

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
          イラスト2
        </button>

      </div>

      <img
        src={`/image/${theme}/title.png`}
        style={{
          width: "90%",
          maxWidth: 400,
          maxHeight: 120,
          marginBottom: 20
        }}
      />

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
          <h2>レギュレーション</h2>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 10
          }}
        >
          {players.map((role, i) => (
            <PlayerSlot
              key={i}
              id={i + 1}
              role={role?.role ?? null}
            />
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