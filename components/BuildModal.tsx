import { ResultType } from "@/types/result"

type Props = {
  isOpen: boolean
  onClose: () => void
  players: any[]
  currentPlayer: number
  results: Record<number, {
  type: ResultType
  }>
  theme: string
  title?: string
}

type Display = {
  img: string
  label: string
  color: string
}

function getDisplay(type: ResultType, roleId?: string): Display {
  switch(type) {
    case "self":
      return {　img: roleId ?? "self",　label: "自分", color: "#999" }
    case "white":
      return { img: "white", label: "白", color: "#4da6ff" }
    case "black":
      return { img: "werewolf", label: "黒", color: "#ff4d4d" }
    case "werewolf":
      return { img: "werewolf", label: "人狼", color: "#ff4d4d" }
    case "madman":
      return { img: "madman", label: "狂人", color: "#b366ff" }
    default:
      return { img: "non", label: "？", color: "#999" }
  }
}

export default function BuildModal({
  isOpen,
  onClose,
  players,
  currentPlayer,
  results,
  theme,
  title
}: Props) {

  if (!isOpen) return null

  return (
    
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        color: "black"
      }}
    >

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: 20,
          width: "90%",
          maxWidth: 360,
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          textAlign: "center"
        }}
      >

        <div style={{
          fontSize: 18,
          fontWeight: "bold",
          marginBottom: 12
        }}>
          {title ?? "🔍 占い結果"}
        </div>

        <div style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
          alignItems: "flex-start"
        }}>
          {players.map((p, i) => {
            const num = i + 1

            const data = results[num]

            const me = players[currentPlayer - 1]

            const display = getDisplay(
              data?.type ?? "unknown",
              num === currentPlayer ? me?.role.id : undefined
            )

            return (
              <div key={num} style={{ textAlign: "center", width: 70 }}>
                <div style={{ fontSize: 14 }}>{num}</div>
                <img src={`/image/${theme}/mark_${display.img}.png`} width={70} />
                <div style={{
                  fontWeight: "bold",
                  marginTop: 2,
                  color: display.color
                }}>
                  {display.label}
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            padding: "10px 24px",
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
  )
}