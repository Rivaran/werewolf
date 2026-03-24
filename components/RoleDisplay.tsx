type Props = {
  name: string
  img: string
  compact?: boolean
}

export default function RoleDisplay({ name, img, compact }: Props) {

  return (
    <div style={{
      textAlign: "center",
      paddingTop: compact ? 40 : 0
    }}>

      <div style={{
        width: compact ? 180 : 200,
        height: compact ? 180 : undefined,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <img
          src={img}
          style={{
            width: compact ? "auto" : 140,
            maxWidth: "100%",
            objectFit: "contain"
          }}
        />
      </div>

      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: compact ? 10 : 8,
        marginTop: compact ? 30 : 10
      }}>
        <span style={{ fontSize: 16, opacity: 0.6 }}>
          あなたの役職：
        </span>

        <span style={{
          fontSize: 32,
          fontWeight: "bold",
          textShadow: "0 0 10px rgba(255,255,255,0.6)"
        }}>
          {name}
        </span>
      </div>

    </div>
  )
}