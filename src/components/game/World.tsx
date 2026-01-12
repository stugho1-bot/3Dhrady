import { Sky, Stars } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useGameStore } from "../../store/useGameStore";
import { Car } from "./Car";
import { Trees } from "./Trees";

export const World = () => {
    const level = useGameStore(state => state.level);

    return (
        <>
            {/* Lights */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

            {/* Atmosphere */}
            <Sky sunPosition={[100, 10, 100]} turbidity={0.5} rayleigh={0.5} />
            <Stars />

            {/* Fog for depth */}
            <fog attach="fog" args={['#101010', 5, 40]} />

            {/* Car Easter Egg - Spawn in Level 2, 4, 6... */}
            {level % 2 === 0 && (
                <Car position={[20, 0, 10]} />
            )}

            <Trees level={level} />

            {/* Ground Physics & Visuals */}
            <RigidBody type="fixed" position={[0, -1, 0]} restitution={0} friction={1}>
                <mesh receiveShadow>
                    <boxGeometry args={[100, 2, 100]} />
                    <meshStandardMaterial color="#303030" />
                </mesh>
            </RigidBody>
        </>
    );
};
