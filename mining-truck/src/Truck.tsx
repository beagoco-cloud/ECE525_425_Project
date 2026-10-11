import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, type Group } from 'three'
import RockMesh from './RockMesh'
import type { Rock } from './rocks'

export type Target = { x: number; z: number }

// A loading or unloading job at a work site
export type Job = { id: number; kind: 'load' | 'dump'; site: Target }

type TruckProps = {
  position?: [number, number, number]
  rotationY?: number // radians; 0 means the truck faces +Z
  target?: Target | null // where to drive; null means stay put
  carried?: Rock[] // rocks currently loaded in the bed
  job?: Job | null // loading/unloading in progress
  onArrive?: () => void
  onJobPeak?: (from: [number, number, number]) => void // the moment rocks change hands
  onJobDone?: () => void
}

const BODY = '#e0a526' // yellow-orange
const DARK = '#2b2a28'
const SPEED = 8 // units per second
const TURN_SPEED = 2.5 // radians per second
const STOP_DISTANCE = 6 // park this far short of the target so the rocks stay visible
const BED_TILT = -0.65 // radians; negative tips the front of the bed up
const WHEEL_RADIUS = 0.9

// Shortest signed difference for an angle, in the range -PI to PI
function wrapAngle(a: number) {
  return ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI
}

function Wheel({
  position,
  spin,
}: {
  position: [number, number, number]
  spin: { current: number }
}) {
  const ref = useRef<Group>(null)
  const side = Math.sign(position[0]) // -1 for the left wheels, +1 for the right

  // Turn the wheel to match how far the truck has driven
  useFrame(() => {
    if (ref.current) ref.current.rotation.x = spin.current
  })

  return (
    <group ref={ref} position={position}>
      {/* Cylinders stand upright by default, so rotate 90 degrees to lay them on their side */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, 0.7, 24]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
      {/* A light marker on the outside face so you can see the wheel turning */}
      <mesh position={[side * 0.38, 0.5, 0]}>
        <boxGeometry args={[0.06, 0.3, 0.3]} />
        <meshStandardMaterial color="#c9c2b4" />
      </mesh>
    </group>
  )
}

export default function Truck({
  position = [0, 0, 0],
  rotationY = 0,
  target = null,
  carried = [],
  job = null,
  onArrive,
  onJobPeak,
  onJobDone,
}: TruckProps) {
  const group = useRef<Group>(null)
  const bed = useRef<Group>(null)
  const arrived = useRef(false)
  const spin = useRef(0) // how far the wheels have turned
  const stage = useRef<'idle' | 'turn' | 'work' | 'finish'>('idle')
  const workTime = useRef(0)
  const peakFired = useRef(false)

  // A new target means we haven't arrived yet
  useEffect(() => {
    arrived.current = false
  }, [target])

  // A new job starts by turning around
  useEffect(() => {
    stage.current = job ? 'turn' : 'idle'
    workTime.current = 0
    peakFired.current = false
  }, [job])

  // Runs every frame (~60 times a second). delta = seconds since last frame.
  useFrame((_, delta) => {
    const g = group.current
    const b = bed.current
    if (!g || !b) return

    // The bed tips up while dumping and settles back down otherwise
    const tipping = !!job && job.kind === 'dump' && stage.current === 'work'
    b.rotation.x += ((tipping ? BED_TILT : 0) - b.rotation.x) * Math.min(1, delta * 4)

    // --- Loading / unloading ---
    if (job) {
      if (stage.current === 'turn') {
        // Turn the back of the truck toward the work site
        const desired = Math.atan2(job.site.x - g.position.x, job.site.z - g.position.z) + Math.PI
        const diff = wrapAngle(desired - g.rotation.y)
        const maxTurn = TURN_SPEED * delta
        g.rotation.y += Math.max(-maxTurn, Math.min(maxTurn, diff))
        if (Math.abs(diff) < 0.03) {
          stage.current = 'work'
          workTime.current = 0
        }
      } else if (stage.current === 'work') {
        workTime.current += delta
        const peakAt = job.kind === 'dump' ? 1.0 : 0.4 // seconds until the rocks change hands
        const doneAt = job.kind === 'dump' ? 1.8 : 0.9 // seconds until the work is finished

        if (!peakFired.current && workTime.current >= peakAt) {
          peakFired.current = true
          // Where the rocks spill out: the rear lip of the bed, in world coordinates
          const lip = g.localToWorld(new Vector3(0, 2.6, -3.5))
          onJobPeak?.([lip.x, lip.y, lip.z])
        }
        if (workTime.current >= doneAt) stage.current = 'finish'
      } else if (stage.current === 'finish') {
        // Wait for the bed to settle back down, then report that we're done
        if (Math.abs(b.rotation.x) < 0.03) {
          stage.current = 'idle'
          onJobDone?.()
        }
      }
      return // no driving while working
    }

    // --- Driving ---
    if (!target) return

    const dx = target.x - g.position.x
    const dz = target.z - g.position.z
    const dist = Math.hypot(dx, dz)
    const remaining = dist - STOP_DISTANCE

    if (remaining < 0.2) {
      // Report arrival only once per target
      if (!arrived.current) {
        arrived.current = true
        onArrive?.()
      }
      return
    }

    // Angle we want to face. Forward is +Z, so heading = atan2(x, z).
    const desired = Math.atan2(dx, dz)
    const diff = wrapAngle(desired - g.rotation.y)

    // Turn toward the target, limited by the turn speed
    const maxTurn = TURN_SPEED * delta
    g.rotation.y += Math.max(-maxTurn, Math.min(maxTurn, diff))

    // Only drive forward once we're roughly facing the target
    if (Math.abs(diff) < 0.4) {
      const step = Math.min(SPEED * delta, remaining)
      g.position.x += Math.sin(g.rotation.y) * step
      g.position.z += Math.cos(g.rotation.y) * step
      spin.current += step / WHEEL_RADIUS // wheels roll as the truck moves
    }
  })

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]}>
      {/* Chassis (the frame the other parts sit on) */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[2.4, 0.5, 6]} />
        <meshStandardMaterial color="#4a4743" />
      </mesh>

      {/* Cab at the front */}
      <mesh position={[0, 2.45, 2.2]} castShadow>
        <boxGeometry args={[2.2, 1.6, 1.6]} />
        <meshStandardMaterial color={BODY} />
      </mesh>

      {/* Windshield */}
      <mesh position={[0, 2.7, 3.01]}>
        <boxGeometry args={[1.8, 0.7, 0.05]} />
        <meshStandardMaterial color="#9fc4d6" />
      </mesh>

      {/* Dump bed. The group sits at the rear hinge, so rotating it tips the bed up.
          Everything inside (the bed and the rocks) is positioned relative to that hinge. */}
      <group ref={bed} position={[0, 1.65, -2.8]}>
        <mesh position={[0, 0.7, 1.9]} castShadow>
          <boxGeometry args={[2.6, 1.4, 3.8]} />
          <meshStandardMaterial color={BODY} />
        </mesh>

        {/* Rocks riding in the bed. They tip up along with it. */}
        {carried.map((r, i) => (
          <RockMesh
            key={r.id}
            size={r.size}
            rot={r.rot}
            t0={r.t0}
            position={[
              i % 2 === 0 ? -0.6 : 0.6, // two columns
              1.4 + r.size * 0.6 + Math.floor(i / 6) * 0.9, // on top of the bed (stack if more than 6)
              0.8 + (Math.floor(i / 2) % 3) * 1.1, // three rows
            ]}
          />
        ))}
      </group>

      {/* Wheels: front pair, rear pair */}
      <Wheel position={[-1.4, 0.9, 2]} spin={spin} />
      <Wheel position={[1.4, 0.9, 2]} spin={spin} />
      <Wheel position={[-1.4, 0.9, -1.8]} spin={spin} />
      <Wheel position={[1.4, 0.9, -1.8]} spin={spin} />
    </group>
  )
}
