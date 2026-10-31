import { useSyncExternalStore } from 'react'

// The latest photo the truck took, plus what it "saw"
export type Snapshot = {
  imageDataUrl: string
  place: string // landmark id where the photo was taken
  rockCount: number
  time: number
}

let latest: Snapshot | null = null
let captureFn: (() => string | null) | null = null
const listeners = new Set<() => void>()

// TruckCamera registers its capture function here when it mounts
export function registerCapture(fn: () => string | null) {
  captureFn = fn
  return () => {
    if (captureFn === fn) captureFn = null
  }
}

// Take a photo from the truck's point of view (null if the camera isn't ready)
export function takePhoto(): string | null {
  return captureFn?.() ?? null
}

export function setSnapshot(snapshot: Snapshot) {
  latest = snapshot
  listeners.forEach((l) => l())
}

// For React components: re-renders whenever a new photo is saved
export function useSnapshot(): Snapshot | null {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => latest
  )
}
