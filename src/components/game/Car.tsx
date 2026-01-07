import { useRef } from 'react';
import * as THREE from 'three';

interface CarProps {
    position: [number, number, number];
}

export const Car = ({ position }: CarProps) => {
    const meshRef = useRef<THREE.Group>(null);

    const onHit = () => {
        // Redirect to the car game
        window.location.href = 'https://brmbrm.vercel.app/';
    };

    return (
        <group position={position} ref={meshRef}>
            {/* Body */}
            <mesh
                castShadow
                receiveShadow
                userData={{ isBlock: true, onHit }}
                position={[0, 0.4, 0]}
            >
                <boxGeometry args={[1.5, 0.5, 3]} />
                <meshStandardMaterial color="#3b82f6" />
            </mesh>

            {/* Cabin */}
            <mesh
                castShadow
                receiveShadow
                userData={{ isBlock: true, onHit }}
                position={[0, 0.9, -0.2]}
            >
                <boxGeometry args={[1.2, 0.6, 1.2]} />
                <meshStandardMaterial color="#60a5fa" />
            </mesh>

            {/* Wheels */}
            {[
                [-0.8, 0.2, 1], [0.8, 0.2, 1], [-0.8, 0.2, -1], [0.8, 0.2, -1]
            ].map((p, i) => (
                <mesh
                    key={i}
                    position={p as [number, number, number]}
                    rotation={[0, 0, Math.PI / 2]}
                    userData={{ isBlock: true, onHit }}
                >
                    <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
            ))}
        </group>
    );
};
