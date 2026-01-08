import { RigidBody } from "@react-three/rapier";
import { useState, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AnimeFirework } from "./Effects";
import { useGameStore } from "../../store/useGameStore";
import type { BlockType } from "./Block";

interface ShatterProps {
    position: [number, number, number];
    type?: BlockType;
    color: string;
    onComplete: () => void;
}

export const Shatter = ({ position, type, color, onComplete }: ShatterProps) => {
    // Track pieces and their individual effects
    const [pieces, setPieces] = useState(() => [
        { id: 0, offset: [-0.25, -0.25, -0.25], firework: false, currentPos: null as any },
        { id: 1, offset: [0.25, -0.25, -0.25], firework: false, currentPos: null as any },
        { id: 2, offset: [-0.25, 0.25, 0.25], firework: false, currentPos: null as any },
        { id: 3, offset: [0.25, 0.25, 0.25], firework: false, currentPos: null as any }
    ]);
    const isXRayActive = useGameStore(state => state.isXRayActive);
    const aimedBlockId = useGameStore(state => state.aimedBlockId);

    // MOBILITY FIX: Debris shouldn't stay forever. 5 seconds is plenty.
    // This prevents memory exhaustion and WASM crashes on mobile.
    const [timeLeft, setTimeLeft] = useState(5.0);
    const isCompleted = useRef(false);

    useFrame((_state, delta) => {
        if (timeLeft > 0) {
            setTimeLeft(t => {
                const next = t - delta;
                if (next <= 0 && !isCompleted.current) {
                    isCompleted.current = true;
                    onComplete();
                }
                return next;
            });
        }
    });

    const handlePieceHit = (id: number, hitPos: THREE.Vector3) => {
        // MOBILITY FIX: Defer removal to outside the current raycast/collision task.
        // Immediate removal during a physics callback is the #1 cause of "white screen".
        setTimeout(() => {
            if (type === 'gold') {
                setPieces(prev => prev.map(p => p.id === id ? { ...p, firework: true, currentPos: [hitPos.x, hitPos.y, hitPos.z] } : p));
            } else {
                removePiece(id);
            }
        }, 0);
    };

    const removePiece = (id: number) => {
        setPieces(prev => prev.filter(p => p.id !== id));
    };

    if (pieces.length === 0 || timeLeft <= 0) return null;

    return (
        <>
            <group position={position}>
                {pieces.filter(p => !p.firework).map((piece) => (
                    <RigidBody
                        key={piece.id}
                        position={piece.offset as [number, number, number]}
                        colliders="cuboid"
                        mass={0.1}
                        restitution={0.5}
                        userData={{
                            isBlock: true,
                            isDebris: true,
                            id: `debris-${position.join('-')}-${piece.id}`,
                            onHit: (_fromExplo: boolean, hitPos: THREE.Vector3) => handlePieceHit(piece.id, hitPos)
                        }}
                    >
                        <mesh
                            castShadow
                            receiveShadow
                            userData={{
                                isBlock: true,
                                isDebris: true,
                                id: `debris-${position.join('-')}-${piece.id}`,
                                onHit: (_fromExplo: boolean, hitPos: THREE.Vector3) => handlePieceHit(piece.id, hitPos)
                            }}
                        >
                            <boxGeometry args={[0.4, 0.4, 0.4]} />
                            <meshStandardMaterial
                                color={color}
                                transparent={isXRayActive}
                                opacity={isXRayActive ? 0 : 1}
                                depthWrite={!isXRayActive}
                                emissive={color}
                                emissiveIntensity={isXRayActive ? 0 : (aimedBlockId === `debris-${position.join('-')}-${piece.id}` ? 0.2 : 0)}
                            />
                            {isXRayActive && (
                                <lineSegments>
                                    <edgesGeometry args={[new THREE.BoxGeometry(0.4, 0.4, 0.4)]} />
                                    <lineBasicMaterial color={color} />
                                </lineSegments>
                            )}
                        </mesh>
                    </RigidBody>
                ))}
            </group>

            {pieces.map((piece) => (
                <group key={`effect-${piece.id}`}>
                    {piece.firework && piece.currentPos && (
                        <AnimeFirework
                            position={piece.currentPos as [number, number, number]}
                            color="#FFD700"
                            scale={0.5}
                            onComplete={() => removePiece(piece.id)}
                        />
                    )}
                </group>
            ))}
        </>
    );
};
