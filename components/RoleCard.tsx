"use client"

import { useDraggable } from "@dnd-kit/core"

type Props = {
  role: { id: string; name: string; img: string }
}

export default function RoleCard({ role }: Props) {
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
    color: "#222",
    WebkitTextFillColor: "#222",
    colorScheme: "light",
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
