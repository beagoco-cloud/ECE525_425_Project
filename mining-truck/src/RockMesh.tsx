import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

const DURATION = 600 // milliseconds for a rock's drop or pop-in animation

type RockMeshProps = {
  size: number
  rot: number
  position: [number, number, number]
  from?: [number, number, number] // start of a fall (set when a rock is dumped from the truck)
  t0?: number // when the animation starts; leave out for a rock that is just sitting there
}

// One rock: a lumpy gray shape, slightly flattened.
// With t0 set, it animates: falling from `from` if given, otherwise popping into place.
export default function RockMesh({ size, rot, position, from, t0 }: RockMeshProps) {
  const mesh = useRef<Mesh>(null)
  const done = useRef(t0 === undefined)

  useFrame(() => {
    const m = mesh.current
    if (!m || done.current || t0 === undefined) return

    const u = Math.min(1, Math.max(0, (performance.now() - t0) / DURATION))
    if (from) {
      // Falling: moves sideways at a steady pace, drops faster and faster
      m.position.set(
        from[0] + (position[0] - from[0]) * u,
        from[1] + (position[1] - from[1]) * u * u,
        from[2] + (position[2] - from[2]) * u
      )
    } else {
      // Popping into the bed: grows from nothing
      const s = Math.max(u, 0.01)
      m.scale.set(s, 0.7 * s, s)
    }
    if (u >= 1) done.current = true
  })

  const popping = t0 !== undefined && !from

  return (
    <mesh
      ref={mesh}
      position={from ?? position}
      rotation={[0, rot, 0]}
      scale={popping ? [0.01, 0.007, 0.01] : [1, 0.7, 1]}
      castShadow
    >
      <icosahedronGeometry args={[size, 0]} />
      <meshStandardMaterial color="#6b6762" flatShading />
    </mesh>
  )
}
