"use client"

import { useDroppable } from "@dnd-kit/core"

type Props = {
  id: number
  role: { id: string; name: string; img: string } | null
  theme: string
}

export default function PlayerSlot({ id, role, theme }: Props) {
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
