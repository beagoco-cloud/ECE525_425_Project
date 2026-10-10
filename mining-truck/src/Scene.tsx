import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sky, Billboard, Text } from "@react-three/drei";
import Truck from "./Truck";
import type { Target } from "./Truck";
import RockMesh from "./RockMesh";
import type { Rock } from "./rocks";
import { LANDMARKS } from "./landmarks";

const TRUCK_START: [number, number, number] = [0, 0, 0];

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#b08a5a" />
    </mesh>
  );
}

function Landmarks() {
  return (
    <>
      {LANDMARKS.map((l) => (
        <group key={l.id} position={[l.x, 0, l.z]}>
          {/* Flat colored disc on the ground */}
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[3, 3, 0.05, 32]} />
            <meshStandardMaterial color={l.color} />
          </mesh>
          {/* Text label floating above it, always facing the camera */}
          <Billboard position={[0, 3, 0]}>
            <Text
              fontSize={1}
              color="white"
              outlineWidth={0.06}
              outlineColor="#2b2a28"
            >
              {l.label}
            </Text>
          </Billboard>
        </group>
      ))}
    </>
  );
}

// Rocks lying on the ground at a landmark
function GroundRocks({ rocks }: { rocks: Rock[] }) {
  return (
    <>
      {rocks.map((r) => {
        const lm = LANDMARKS.find((l) => l.id === r.place);
        if (!lm) return null; // on the truck, or an unknown place
        return (
          <RockMesh
            key={r.id}
            size={r.size}
            rot={r.rot}
            position={[lm.x + r.dx, r.size * 0.6, lm.z + r.dz]}
          />
        );
      })}
    </>
  );
}

type SceneProps = {
  target: Target | null;
  rocks: Rock[];
  onArrive: () => void;
};

export default function Scene({ target, rocks, onArrive }: SceneProps) {
  return (
    <Canvas shadows camera={{ position: [30, 25, 40], fov: 50 }}>
      <Sky sunPosition={[100, 40, 100]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[20, 30, 10]} intensity={1.5} castShadow />
      <Ground />
      <gridHelper
        args={[200, 100, "#8a6a3f", "#9c7848"]}
        position={[0, 0.01, 0]}
      />
      <Landmarks />
      <GroundRocks rocks={rocks} />
      <Truck
        position={TRUCK_START}
        target={target}
        carried={rocks.filter((r) => r.place === null)}
        onArrive={onArrive}
      />
      <OrbitControls maxPolarAngle={Math.PI / 2 - 0.05} />
    </Canvas>
  );
}
