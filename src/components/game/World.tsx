import { Sky, Stars } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";

export const World = () => {
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
