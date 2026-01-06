import { useRef, forwardRef, useImperativeHandle } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { easing } from "maath";

export interface HammerRef {
    swing: () => void;
}

export const Hammer = forwardRef<HammerRef, any>((_props, ref) => {
    const group = useRef<THREE.Group>(null);
    const rotationTarget = useRef(0);
    const isSwinging = useRef(false);

    useImperativeHandle(ref, () => ({
        swing: () => {
            if (isSwinging.current) return;
            isSwinging.current = true;
            rotationTarget.current = -Math.PI / 2; // Swing down

            // Reset after delay
            setTimeout(() => {
                rotationTarget.current = 0;
                setTimeout(() => {
                    isSwinging.current = false;
                }, 200);
            }, 100);
        }
    }));

    useFrame((_state, delta) => {
        if (!group.current) return;

        // Soft damp rotation for swing animation
        easing.dampE(
            group.current.rotation,
            [rotationTarget.current, 0, 0],
            0.15,
            delta
        );

        // Sway animation while moving (optional)
        // const t = state.clock.getElapsedTime();
        // group.current.rotation.z = Math.sin(t * 4) * 0.05;
    });

    return (
        <group ref={group} position={[0.5, -0.4, -1]} scale={0.5} dispose={null}>
            {/* Handle */}
            <mesh position={[0, -0.5, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 1.5, 16]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>

            {/* Head */}
            <mesh position={[0, 0.25, 0]} rotation={[0, 0, Math.PI / 2]}>
                <boxGeometry args={[0.4, 0.8, 0.4]} />
                <meshStandardMaterial color="#444" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Torch Light - Added back at user request as a Minecraft-style torch */}
            <pointLight position={[0, 0.25, 0]} intensity={2} distance={15} color="#ffd43b" decay={2} castShadow={false} />
        </group>
    );
});
