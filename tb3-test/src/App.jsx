import { Suspense, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import Truck from './Truck'
import usePython from './usePython'

   const START = `# Drive the haul truck with Python
# truck.forward(meters)   truck.backward(meters)
# truck.left(degrees)     truck.right(degrees)
# truck.dump()            truck.wait(seconds)

# One haul cycle: drive to dump point, dump, come back
truck.forward(40)
truck.left(90)
truck.forward(20)
truck.dump()
truck.backward(20)

print("Haul cycle queued")
`

export default function App() {
  const queue = useRef([])
  const pose = useRef({ x: 0, y: 0, th: 0 })
  const [code, setCode] = useState(START)
  const [out, setOut] = useState([])
  const log = (s) => setOut((o) => [...o, s])
  const { ready, run } = usePython(queue, pose, log)

  const onRun = () => run(code)
  const onStop = () => (queue.current.length = 0)
  const onReset = () => {
    queue.current.length = 0
    pose.current = { x: 0, y: 0, th: 0 }
    setOut([])
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', height: '100vh' }}>
      {/* LEFT: code */}
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #ccc', minWidth: 0 }}>
        <div style={{ padding: 8, display: 'flex', gap: 8 }}>
          <button onClick={onRun} disabled={!ready}>{ready ? '▶ Run' : 'Loading Python…'}</button>
          <button onClick={onStop}>■ Stop</button>
          <button onClick={onReset}>↺ Reset</button>
        </div>
        <CodeMirror
          value={code}
          onChange={setCode}
          extensions={[python()]}
          height="100%"
          style={{ flex: 1, overflow: 'auto', fontSize: 14 }}
        />
        <pre style={{ margin: 0, padding: 8, height: 120, overflow: 'auto', background: '#111', color: '#8f8' }}>
          {out.join('\n') || 'Output shows here'}
        </pre>
      </div>

      {/* RIGHT: robot */}
         <Canvas camera={{ position: [10, 55, 45], fov: 50, far: 2000 }} shadows>
        <ambientLight intensity={0.6} />
        <directionalLight position={[1, 2, 1]} intensity={1.5} castShadow />
           <Grid cellSize={1} sectionSize={10} infiniteGrid fadeDistance={300} cellColor="#b9a58a" sectionColor="#8a6d4a" />
        <Suspense fallback={null}>
           <Truck queue={queue} pose={pose} />
        </Suspense>
           <OrbitControls target={[32, 0, -18]} />
      </Canvas>
    </div>
  )
}