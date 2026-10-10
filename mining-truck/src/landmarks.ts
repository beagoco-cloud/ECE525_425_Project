// Named places on the map. The LLM will pick from these by id later.
export type Landmark = {
  id: string
  label: string
  x: number
  z: number
  color: string
}

export const LANDMARKS: Landmark[] = [
  { id: 'rockPile', label: 'Rock pile', x: -20, z: 15, color: '#7a7a7a' },
  { id: 'crusher', label: 'Crusher', x: 25, z: -10, color: '#c0392b' },
  { id: 'camp', label: 'Camp', x: 10, z: 30, color: '#2e86c1' },
  { id: 'quarry', label: 'Quarry', x: 0, z: -30, color: '#2d5656' },
]