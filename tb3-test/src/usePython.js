import { useEffect, useRef, useState } from 'react'
import { WHEELBASE } from './Truck'

const SPEED = 6        // m/s (about 22 km/h)
const TURN_RADIUS = 18 // m, tightest turn
const STEER = Math.atan(WHEELBASE / TURN_RADIUS)

// Loads Python (Pyodide) once and gives it a "truck" module.
export default function usePython(queue, pose, log) {
  const py = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = '/pyodide/pyodide.js'
    script.onload = async () => {
      const pyodide = await window.loadPyodide({ indexURL: '/pyodide/' })
      pyodide.setStdout({ batched: (s) => log(s) })
      pyodide.setStderr({ batched: (s) => log(s) })

      const push = (m) => queue.current.push({ ...m, t: Math.abs(m.t) })
      const turn = (deg, dir) => {
        const rad = (Math.abs(deg) * Math.PI) / 180
        push({ v: SPEED, w: (dir * SPEED) / TURN_RADIUS, steer: dir * STEER, t: (rad * TURN_RADIUS) / SPEED })
      }
      pyodide.registerJsModule('truck', {
        forward: (m) => push({ v: Math.sign(m) * SPEED, w: 0, t: m / SPEED }),
        backward: (m) => push({ v: -Math.sign(m) * SPEED, w: 0, t: m / SPEED }),
        left: (deg) => turn(deg, 1),
        right: (deg) => turn(deg, -1),
        wait: (secs) => push({ v: 0, w: 0, t: secs }),
        dump: () => {
          push({ v: 0, w: 0, t: 3, bed: 0.9 })   // raise bed
          push({ v: 0, w: 0, t: 1.5, bed: 0.9 }) // hold
          push({ v: 0, w: 0, t: 3, bed: 0 })     // lower bed
        },
        position: () => [pose.current.x, pose.current.y],
      })
      py.current = pyodide
      setReady(true)
    }
    document.body.appendChild(script)
  }, [])

  const run = async (code) => {
    try {
      await py.current.runPythonAsync('import truck\n' + code)
    } catch (err) {
      log(String(err.message).trim().split('\n').pop())
    }
  }

  return { ready, run }
}