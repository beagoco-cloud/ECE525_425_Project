type RockMeshProps = {
  size: number;
  rot: number;
  position: [number, number, number];
};

// One rock: a lumpy gray shape, slightly flattened
export default function RockMesh({ size, rot, position }: RockMeshProps) {
  return (
    <mesh
      position={position}
      rotation={[0, rot, 0]}
      scale={[1, 0.7, 1]}
      castShadow
    >
      <icosahedronGeometry args={[size, 0]} />
      <meshStandardMaterial color="#6b6762" flatShading />
    </mesh>
  );
}
