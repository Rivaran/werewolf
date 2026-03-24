type Props = {
  name: string
  img: string
  compact?: boolean
}

export default function RoleDisplay({ name, img }: Props) {

  return (
    <div style={{
      textAlign: "center",
      paddingTop : 0
    }}>

      <div style={{
        width: 200,
        height: undefined,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <img
          src={img}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain"
          }}
        />
      </div>

      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        marginTop: 10
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