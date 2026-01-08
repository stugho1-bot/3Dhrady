import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useState, useRef } from "react";
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

    // Refs to individual piece rigid bodies for instant disabling
    const pieceRefs = useRef<Map<number, RapierRigidBody>>(new Map());



    const handlePieceHit = (id: number, hitPos: THREE.Vector3) => {
        // MOBILITY FIX: 1. Instant physics disabling for the piece
        const body = pieceRefs.current.get(id);
        if (body) {
            try { body.setEnabled(false); } catch (e) { }
        }

        // 2. Deferred state removal (Hardened frame delay)
        setTimeout(() => {
            if (type === 'gold') {
                setPieces(prev => prev.map(p => p.id === id ? { ...p, firework: true, currentPos: [hitPos.x, hitPos.y, hitPos.z] } : p));
            } else {
                removePiece(id);
            }
        }, 16);
    };

    const removePiece = (id: number) => {
        setPieces(prev => {
            const next = prev.filter(p => p.id !== id);
            if (next.length === 0) {
                onComplete();
            }
            return next;
        });
        pieceRefs.current.delete(id);
    };

    if (pieces.length === 0) return null;

    return (
        <>
            <group position={position}>
                {pieces.filter(p => !p.firework).map((piece) => (
                    <RigidBody
                        key={piece.id}
                        ref={(ref) => {
                            if (ref) pieceRefs.current.set(piece.id, ref);
                            else pieceRefs.current.delete(piece.id);
                        }}
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
