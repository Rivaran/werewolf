type Props = {
  isOpen: boolean
  onClose: () => void
  players: any[]
  currentPlayer: number
  seerResults: Record<number, Record<number, "white" | "black">>
  theme: string
}

export default function SeerModal({
  isOpen,
  onClose,
  players,
  currentPlayer,
  seerResults,
  theme
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
          🔍 占い結果
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

            if (num === currentPlayer) {
              return (
                <div key={num} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, width: 70 }}>{num}</div>
                  <img src={`/image/${theme}/mark_seer.png`} width={70} />
                  <div style={{
                    fontWeight: "bold",
                    marginTop: 2,
                    width: 70,
                    color: "#999"
                  }}>
                    自分
                  </div>
                </div>
              )
            }

            const result = seerResults[currentPlayer]?.[num]

            let img = `/image/${theme}/mark_non.png`
            if (result === "white") img = `/image/${theme}/mark_white.png`
            if (result === "black") img = `/image/${theme}/mark_werewolf.png`

            return (
              <div key={num} style={{ textAlign: "center", width: 70 }}>
                <div style={{ fontSize: 14 }}>{num}</div>
                <img src={img} width={70} />
                <div style={{
                  fontWeight: "bold",
                  marginTop: 2,
                  color:
                    result === "white" ? "#4da6ff"
                    : result === "black" ? "#ff4d4d"
                    : "#999"
                }}>
                  {result === "white" ? "白"
                  : result === "black" ? "黒"
                  : "未"}
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