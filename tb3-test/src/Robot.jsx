import { useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'

const R = 0.033   // wheel radius (m)
const SEP = 0.160 // wheel separation (m)

function Part({ file, color }) {
  const geo = useLoader(STLLoader, `/models/${file}`)
  return (
    <mesh geometry={geo} scale={0.001} castShadow>
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

// queue: list of { v, w, t } moves from Python
// pose:  { x, y, th } robot position
export default function Robot({ queue, pose }) {
  const body = useRef()
  const wl = useRef()
  const wr = useRef()

  useFrame((_, frameDt) => {
    let v = 0, w = 0, dt = frameDt
    const move = queue.current[0]
    if (move) {
      v = move.v
      w = move.w
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
    wl.current.rotation.y += ((v - (w * SEP) / 2) / R) * dt
    wr.current.rotation.y += ((v + (w * SEP) / 2) / R) * dt
  })

  // ROS is Z-up, three.js is Y-up: rotate whole world once
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <group ref={body}>
        <group position={[-0.032, 0, 0.01]}>
          <Part file="burger_base.stl" color="#3a3f47" />
        </group>
        <group ref={wl} position={[0, 0.08, 0.033]}>
          <Part file="left_tire.stl" color="#111" />
        </group>
        <group ref={wr} position={[0, -0.08, 0.033]}>
          <Part file="right_tire.stl" color="#111" />
        </group>
        <group position={[-0.032, 0, 0.182]}>
          <Part file="lds.stl" color="#1e1e1e" />
        </group>
      </group>
    </group>
  )
}