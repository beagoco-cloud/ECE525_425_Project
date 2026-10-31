import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { registerCapture } from './visionStore'

const SIZE = 640 // square photo
// Where the camera sits and what it looks at, in the truck's own space (+Z is forward).
// It sits above the front of the cab, looking down at the pile the truck parks in front of.
const CAMERA_POS = new THREE.Vector3(0, 4.5, 3.2)
const LOOK_AT = new THREE.Vector3(0, 0, 6)

// Invisible. Takes one photo from the parked truck whenever takePhoto() is called.
export default function TruckCamera() {
  const { gl, scene } = useThree()

  useEffect(() => {
    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 200)
    const target = new THREE.WebGLRenderTarget(SIZE, SIZE)
    target.texture.colorSpace = THREE.SRGBColorSpace // keeps colors the same as on screen

    function capture(): string | null {
      const truck = scene.getObjectByName('truck')
      if (!truck) return null

      truck.updateWorldMatrix(true, false)
      camera.position.copy(truck.localToWorld(CAMERA_POS.clone()))
      camera.lookAt(truck.localToWorld(LOOK_AT.clone()))
      camera.updateMatrixWorld()

      // Render offscreen, then hand rendering back to the normal view
      gl.setRenderTarget(target)
      gl.render(scene, camera)
      const pixels = new Uint8Array(SIZE * SIZE * 4)
      gl.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, pixels)
      gl.setRenderTarget(null)

      // Pixels come back upside down, so flip them while drawing
      const flipped = new Uint8ClampedArray(pixels.length)
      const row = SIZE * 4
      for (let y = 0; y < SIZE; y++) {
        flipped.set(pixels.subarray(y * row, (y + 1) * row), (SIZE - 1 - y) * row)
      }
      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      canvas.getContext('2d')!.putImageData(new ImageData(flipped, SIZE, SIZE), 0, 0)
      return canvas.toDataURL('image/png')
    }

    const unregister = registerCapture(capture)
    return () => {
      unregister()
      target.dispose()
    }
  }, [gl, scene])

  return null
}
