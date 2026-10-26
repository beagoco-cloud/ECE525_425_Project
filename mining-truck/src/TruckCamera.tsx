// Takes one offscreen photo of the scene on demand (nothing calls it yet)

import { forwardRef, useImperativeHandle, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
 
export type TruckCameraHandle = {
  capture: () => string; // returns a data URL (the photo)
};
 
type TruckCameraProps = {
  // where to aim the camera
  lookAt: { x: number; z: number };
  // where the camera sits
  position: { x: number; y: number; z: number };
  resolution?: number; // square image size (ex: 640 for YOLO input)
};
 
const TruckCamera = forwardRef<TruckCameraHandle, TruckCameraProps>(
  ({ lookAt, position, resolution = 640 }, ref) => {
    const { gl, scene } = useThree(); // access renderer + scene
 
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const renderTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);
 
    // render target, reuse one every capture
    function getRenderTarget() {
      if (!renderTargetRef.current) {
        renderTargetRef.current = new THREE.WebGLRenderTarget(
          resolution,
          resolution,
        );
      }
      return renderTargetRef.current;
    }
 
    function capture(): string {
      const camera = cameraRef.current;
      if (!camera) return "";
 
      // make sure camera is pointed at correct position before shooting
      camera.position.set(position.x, position.y, position.z);
      camera.lookAt(lookAt.x, 0, lookAt.z);
      camera.updateMatrixWorld();
 
      const target = getRenderTarget();
 
      // render offscreen
      gl.setRenderTarget(target);
      gl.render(scene, camera);
 
      // read pixels back out
      const pixels = new Uint8Array(resolution * resolution * 4);
      gl.readRenderTargetPixels(target, 0, 0, resolution, resolution, pixels);
 
      // restore normal rendering to the visible canvas
      gl.setRenderTarget(null);
 
      // convert raw pixels into a usable image (data URL)
      const canvas = document.createElement("canvas");
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext("2d")!;
      const imageData = ctx.createImageData(resolution, resolution);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
 
      return canvas.toDataURL("image/png");
    }
 
    useImperativeHandle(ref, () => ({ capture }));
 
    // camera element itself
    return (
      <perspectiveCamera
        ref={cameraRef}
        fov={60}
        near={0.1}
        far={100}
        position={[position.x, position.y, position.z]}
      />
    );
  },
);
 
export default TruckCamera;