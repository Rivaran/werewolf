export type Role = {
  id: string
  name: string
  img: string
}

export type Player = {
  id: number
  role: Role
  alive: boolean
}
