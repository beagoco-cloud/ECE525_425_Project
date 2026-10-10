// Rock data and helpers. A rock is just a record: where it is and what it looks like.
// place = a landmark id when it's lying on the ground there, or null when it's on the truck.

export const CAPACITY = 6 // how many rocks fit on the truck

export type Rock = {
  id: number
  place: string | null
  dx: number // offset from the landmark's center
  dz: number
  rot: number
  size: number
}

// A random spot (and spin) within a landmark's disc
export function scatter() {
  const angle = Math.random() * Math.PI * 2
  const r = Math.sqrt(Math.random()) * 2.4
  return { dx: Math.cos(angle) * r, dz: Math.sin(angle) * r, rot: Math.random() * Math.PI * 2 }
}

export function makeRocks(place: string, count: number): Rock[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    place,
    size: 0.4 + Math.random() * 0.3,
    ...scatter(),
  }))
}
