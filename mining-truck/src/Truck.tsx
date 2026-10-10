import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import RockMesh from "./RockMesh";
import type { Rock } from "./rocks";

export type Target = { x: number; z: number };

type TruckProps = {
  position?: [number, number, number];
  rotationY?: number; // radians; 0 means the truck faces +Z
  target?: Target | null; // where to drive; null means stay put
  carried?: Rock[]; // rocks currently loaded in the bed
  onArrive?: () => void;
};

const BODY = "#e0a526"; // yellow-orange
const DARK = "#2b2a28";
const SPEED = 8; // units per second
const TURN_SPEED = 2.5; // radians per second
const STOP_DISTANCE = 6; // park this far short of the target so the rocks stay visible

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    // Cylinders stand upright by default, so rotate 90 degrees to lay them on their side
    <mesh position={position} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.9, 0.9, 0.7, 24]} />
      <meshStandardMaterial color={DARK} />
    </mesh>
  );
}

export default function Truck({
  position = [0, 0, 0],
  rotationY = 0,
  target = null,
  carried = [],
  onArrive,
}: TruckProps) {
  const group = useRef<Group>(null);
  const arrived = useRef(false);

  // A new target means we haven't arrived yet
  useEffect(() => {
    arrived.current = false;
  }, [target]);

  // Runs every frame (~60 times a second). delta = seconds since last frame.
  useFrame((_, delta) => {
    const g = group.current;
    if (!g || !target) return;

    const dx = target.x - g.position.x;
    const dz = target.z - g.position.z;
    const dist = Math.hypot(dx, dz);
    const remaining = dist - STOP_DISTANCE;

    if (remaining < 0.2) {
      // Report arrival only once per target
      if (!arrived.current) {
        arrived.current = true;
        onArrive?.();
      }
      return;
    }

    // Angle we want to face. Forward is +Z, so heading = atan2(x, z).
    const desired = Math.atan2(dx, dz);
    // Shortest signed difference between current and desired angle
    const diff =
      ((((desired - g.rotation.y + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) %
        (2 * Math.PI)) -
      Math.PI;

    // Turn toward the target, limited by the turn speed
    const maxTurn = TURN_SPEED * delta;
    g.rotation.y += Math.max(-maxTurn, Math.min(maxTurn, diff));

    // Only drive forward once we're roughly facing the target
    if (Math.abs(diff) < 0.4) {
      const step = Math.min(SPEED * delta, remaining);
      g.position.x += Math.sin(g.rotation.y) * step;
      g.position.z += Math.cos(g.rotation.y) * step;
    }
  });

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

      {/* Dump bed at the back */}
      <mesh position={[0, 2.35, -0.9]} castShadow>
        <boxGeometry args={[2.6, 1.4, 3.8]} />
        <meshStandardMaterial color={BODY} />
      </mesh>

      {/* Rocks riding in the bed. They're children of this group, so they move with the truck. */}
      {carried.map((r, i) => (
        <RockMesh
          key={r.id}
          size={r.size}
          rot={r.rot}
          position={[
            i % 2 === 0 ? -0.6 : 0.6, // two columns
            3.05 + r.size * 0.6 + Math.floor(i / 6) * 0.9, // on top of the bed (stack if more than 6)
            -2 + (Math.floor(i / 2) % 3) * 1.1, // three rows
          ]}
        />
      ))}

      {/* Wheels: front pair, rear pair */}
      <Wheel position={[-1.4, 0.9, 2]} />
      <Wheel position={[1.4, 0.9, 2]} />
      <Wheel position={[-1.4, 0.9, -1.8]} />
      <Wheel position={[1.4, 0.9, -1.8]} />
    </group>
  );
}
