import { RigidBody, useRapier } from "@react-three/rapier";
import { useState } from "react";
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
    const { world } = useRapier();
    const { shakeCamera } = useGameStore();

    // Track pieces and their individual effects - Reduced to 4 for stability
    const [pieces, setPieces] = useState(() => [
        { id: 0, offset: [-0.25, -0.25, -0.25], exploding: false, firework: false, currentPos: null as any },
        { id: 1, offset: [0.25, -0.25, -0.25], exploding: false, firework: false, currentPos: null as any },
        { id: 2, offset: [-0.25, 0.25, 0.25], exploding: false, firework: false, currentPos: null as any },
        { id: 3, offset: [0.25, 0.25, 0.25], exploding: false, firework: false, currentPos: null as any }
    ]);
    const isXRayActive = useGameStore(state => state.isXRayActive);
    const aimedBlockId = useGameStore(state => state.aimedBlockId);

    const [timeLeft, setTimeLeft] = useState(999.0); // Debris stay on ground (don't auto-delete)

    useFrame((_state, delta) => {
        if (timeLeft > 0) {
            setTimeLeft(t => t - delta);
        } else {
            onComplete();
        }
    });

    const triggerMiniExplosion = (pos: THREE.Vector3) => {
        const radius = 1.0;
        shakeCamera(0.05);

        const debrisHits: Array<{ distance: number, onHit: () => void }> = [];
        const impulses: Array<{ body: any, impulse: { x: number, y: number, z: number } }> = [];

        world.forEachCollider((collider: any) => {
            const body = collider.parent();
            if (!body) return;

            const bodyPos = body.translation();
            const distSq =
                Math.pow(bodyPos.x - pos.x, 2) +
                Math.pow(bodyPos.y - pos.y, 2) +
                Math.pow(bodyPos.z - pos.z, 2);

            if (distSq > radius * radius) return;

            const userData = body.userData as any;
            const dist = Math.sqrt(distSq);

            if (userData && userData.isBlock && userData.isDebris && userData.onHit) {
                // Collect small pieces for chain reaction
                debrisHits.push({
                    distance: dist,
                    onHit: () => userData.onHit?.(true, new THREE.Vector3(bodyPos.x, bodyPos.y, bodyPos.z))
                });
            } else if (userData && !userData.isPlayer && !userData.isBlock) {
                // Apply impulse to other non-block objects (if any)
                const force = 0.005;
                impulses.push({
                    body,
                    impulse: {
                        x: ((bodyPos.x - pos.x) / (dist || 1)) * force,
                        y: ((bodyPos.y - pos.y) / (dist || 1)) * force + force,
                        z: ((bodyPos.z - pos.z) / (dist || 1)) * force
                    }
                });
            }
        });

        // SAFETY: Apply AFTER loop
        // 1. Break UP TO 3 nearest small debris pieces
        if (debrisHits.length > 0) {
            debrisHits.sort((a, b) => a.distance - b.distance);
            const toDestroy = debrisHits.slice(0, 3);
            toDestroy.forEach(hit => hit.onHit());
        }

        // 2. Push other DEBRIS things only, and softly
        impulses.forEach(({ body, impulse }) => {
            const userData = body.userData as any;
            if (userData && userData.isDebris) {
                try {
                    // Very soft push for neighbors
                    const softImpulse = { x: impulse.x * 0.2, y: impulse.y * 0.1, z: impulse.z * 0.2 };
                    body.applyImpulse(softImpulse, true);
                } catch (e) { }
            }
        });
    };

    const handlePieceHit = (id: number, hitPos: THREE.Vector3) => {
        if (type === 'explosive') {
            // For small debris, exploding means just vanishing (after triggerMiniExplosion)
            removePiece(id);
            triggerMiniExplosion(hitPos);
        } else if (type === 'gold') {
            setPieces(prev => prev.map(p => p.id === id ? { ...p, firework: true, currentPos: [hitPos.x, hitPos.y, hitPos.z] } : p));
        } else {
            removePiece(id);
        }
    };

    const removePiece = (id: number) => {
        setPieces(prev => prev.filter(p => p.id !== id));
    };

    if (pieces.length === 0) return null;

    return (
        <>
            {/* The Physics Bodies / Debris pieces */}
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

            {/* Effects - Rendered in World Space (offset by NOTHING) */}
            {pieces.map((piece) => (
                <group key={`effect-${piece.id}`}>
                    {piece.firework && piece.currentPos && (
                        <AnimeFirework
                            position={piece.currentPos as [number, number, number]}
                            color="#FFD700"
                            scale={0.5} // Half scale for debris
                            onComplete={() => removePiece(piece.id)}
                        />
                    )}
                </group>
            ))}
        </>
    );
};
