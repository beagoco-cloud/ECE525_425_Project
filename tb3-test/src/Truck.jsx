import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// Rough size of a large mining haul truck (meters)
export const WHEELBASE = 7.2
const TIRE_R = 1.9
const TIRE_W = 1.4
const YELLOW = '#e3a812'
const DARK = '#2b2b2b'
const BED_RATE = 0.35 // rad/s bed lift speed

function Box({ size, pos, color = YELLOW }) {
  return (
    <mesh position={pos} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Tire({ spinRef }) {
  return (
    <group ref={spinRef}>
      <mesh castShadow>
        <cylinderGeometry args={[TIRE_R, TIRE_R, TIRE_W, 32]} />
        <meshStandardMaterial color="#151515" />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.9, 0.9, TIRE_W + 0.05, 16]} />
        <meshStandardMaterial color={YELLOW} />
      </mesh>
    </group>
  )
}

// queue: list of { v, w, t, steer, bed } moves from Python
// pose:  { x, y, th } position of rear axle center
export default function Truck({ queue, pose }) {
  const body = useRef()
  const bed = useRef()
  const steerL = useRef()
  const steerR = useRef()
  const spins = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]
  const state = useRef({ steer: 0, bed: 0 })

  useFrame((_, frameDt) => {
    let v = 0, w = 0, steer = 0, dt = frameDt
    const s = state.current
    const move = queue.current[0]
    if (move) {
      v = move.v
      w = move.w
      steer = move.steer ?? 0
      if (move.bed !== undefined) {
        const diff = move.bed - s.bed
        s.bed += Math.sign(diff) * Math.min(Math.abs(diff), BED_RATE * frameDt)
      }
      dt = Math.min(frameDt, move.t)
      move.t -= dt
      if (move.t <= 0) queue.current.shift()
    }
    const p = pose.current
    p.th += w * dt
    p.x += v * Math.cos(p.th) * dt
    p.y += v * Math.sin(p.th) * dt
    body.current.position.set(p.x, p.y, 0)
    body.current.rotation.z = p.th

    s.steer += (steer - s.steer) * Math.min(1, frameDt * 6)
    steerL.current.rotation.z = s.steer
    steerR.current.rotation.z = s.steer
    spins.forEach((r) => (r.current.rotation.y += (v / TIRE_R) * dt))
    bed.current.rotation.y = -s.bed
  })

  const Z = TIRE_R // axle height
  return (
    // ROS-style Z-up world, rotated once for three.js (Y-up)
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <group ref={body}>
        {/* frame + front deck */}
        <Box size={[12, 3, 1.2]} pos={[3.5, 0, Z + 0.6]} color={DARK} />
        <Box size={[3, 7.5, 2.2]} pos={[8.5, 0, Z + 1.6]} />
        <Box size={[1.2, 3.5, 2.6]} pos={[10.2, 0, Z + 1.6]} color={DARK} />
        {/* cab (left side, on deck) */}
        <Box size={[2.4, 2.6, 2.4]} pos={[8.4, 2.3, Z + 3.9]} />
        <Box size={[0.1, 2.2, 1.2]} pos={[9.65, 2.3, Z + 4.3]} color="#6fa3c7" />

        {/* dump bed: pivots at rear */}
        <group position={[-2.6, 0, Z + 1.4]}>
          <group ref={bed}>
            <Box size={[11.5, 8, 0.4]} pos={[5.75, 0, 0.8]} />
            <Box size={[11.5, 0.4, 3.2]} pos={[5.75, 3.8, 2.4]} />
            <Box size={[11.5, 0.4, 3.2]} pos={[5.75, -3.8, 2.4]} />
            <Box size={[0.4, 8, 3.8]} pos={[11.3, 0, 2.7]} />
            {/* canopy over cab */}
            <Box size={[3, 8, 0.3]} pos={[12.8, 0, 4.5]} />
          </group>
        </group>

        {/* rear duals (drive) */}
        {[-1, 1].map((side, i) => (
          <group key={side}>
            <group position={[0, side * 3.9, Z]}><Tire spinRef={spins[i * 2]} /></group>
            <group position={[0, side * 2.4, Z]}><Tire spinRef={spins[i * 2 + 1]} /></group>
          </group>
        ))}
        {/* front steering wheels */}
        <group ref={steerL} position={[WHEELBASE, 3.6, Z]}><Tire spinRef={spins[4]} /></group>
        <group ref={steerR} position={[WHEELBASE, -3.6, Z]}><Tire spinRef={spins[5]} /></group>
      </group>
    </group>
  )
}