import { RigidBody, RapierRigidBody, useRapier } from "@react-three/rapier";
import { useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../../store/useGameStore";
import { AnimeFirework, MinecraftSmoke } from "./Effects";
import { Shatter } from "./Shatter";
import { debugLogger } from "../../utils/DebugLogger";

export type BlockType = 'standard' | 'gold' | 'explosive' | 'portal';

interface BlockProps {
    id?: string;
    position: [number, number, number];
    type?: BlockType;
    scale?: number;
}

const COLORS: Record<BlockType, string> = {
    standard: '#808080',
    gold: '#FFD700',
    explosive: '#FF2200',
    portal: '#00FF00'
};

// Explosion sphere removed as it was causing visual blowout


export const Block = ({ id, position, type = 'standard', scale = 1 }: BlockProps) => {
    const blockId = useMemo(() => id || `block-${position.join('-')}-${Math.random()}`, [id, position]);
    const rigidBody = useRef<RapierRigidBody>(null);
    const [isDynamic, _setIsDynamic] = useState(false);

    const { world } = useRapier();
    const { incBlocksDestroyed } = useGameStore();
    const isXRayActive = useGameStore(state => state.isXRayActive);
    const aimedBlockId = useGameStore(state => state.aimedBlockId);

    const [_interacted, setInteracted] = useState(false);
    const [exploding, setExploding] = useState(false);
    const [showAnimeFirework, setShowAnimeFirework] = useState(false);
    const [shattered, setShattered] = useState(false);
    const [shatterPos, setShatterPos] = useState<[number, number, number] | null>(null);
    const [isFusing, setIsFusing] = useState(false);
    const [fuseTime, setFuseTime] = useState(0);
    const meshRef = useRef<THREE.Mesh>(null);

    // Portal blinking & TNT fuse blinking
    useFrame(({ clock }, delta) => {
        if (meshRef.current) {
            const material = meshRef.current.material as THREE.MeshStandardMaterial;

            if (type === 'portal') {
                const t = clock.getElapsedTime();
                material.emissiveIntensity = 0.5 + Math.sin(t * 10) * 0.25;
            } else if (isFusing) {
                setFuseTime(prev => {
                    const next = prev + delta;
                    if (next >= 1.5) {
                        debugLogger.log('EXPLOSION', 'TNT Detonating', { position: shatterPos || position });
                        setShattered(true);
                        setExploding(true);
                        triggerExplosion(new THREE.Vector3(...(shatterPos || position)));
                        setIsFusing(false);
                        incBlocksDestroyed(); // Increment for exploding block itself
                        return 0;
                    }
                    return next;
                });
                // Blink white like Minecraft TNT
                const blink = Math.floor(fuseTime * 8) % 2 === 0;
                material.emissiveIntensity = blink ? 0.5 : 0;
                material.emissive.set(blink ? '#ffffff' : COLORS[type]);
            }
        }
    });

    const onHit = (_fromExplosion = false) => {
        // Logic for Hammer hit
        if (type === 'portal') {
            useGameStore.getState().setStatus('LEVEL_COMPLETE');
            return;
        }

        if (shattered || exploding) return;

        // Anti-recursion / throttle
        // If fromExplosion, we accept it.

        // Capture position for debris
        let currentPos = position;
        if (rigidBody.current) {
            const t = rigidBody.current.translation();
            currentPos = [t.x, t.y, t.z];
        }
        setShatterPos(currentPos);

        if (type === 'gold') {
            setShattered(true);
            incBlocksDestroyed();
            setInteracted(true);
            setShowAnimeFirework(true);
        } else if (type === 'explosive') {
            if (_fromExplosion) {
                // If hit by another explosion, just shatter without detonating
                setShattered(true);
                incBlocksDestroyed();
                setInteracted(true);
            } else {
                // Only direct hammer hits trigger the fuse
                setIsFusing(true);
                setInteracted(true);
            }
        } else {
            setShattered(true);
            incBlocksDestroyed();
            setInteracted(true);
        }
    };

    const triggerExplosion = (pos: THREE.Vector3) => {
        debugLogger.log('EXPLOSION', 'Explosion triggered', {
            position: [pos.x, pos.y, pos.z],
            type: 'small',
            radius: 1.5
        });

        const radius = 1.5; // Only affect immediate neighbors
        const { shakeCamera } = useGameStore.getState();

        shakeCamera(0.2);

        const hits: Array<() => void> = [];
        const impulses: Array<{ body: any, impulse: { x: number, y: number, z: number } }> = [];
        let affectedBlocks = 0;

        world.forEachCollider((collider: any) => {
            const body = collider.parent();
            if (!body) return;

            const bodyPos = body.translation();
            const distSq =
                Math.pow(bodyPos.x - pos.x, 2) +
                Math.pow(bodyPos.y - pos.y, 2) +
                Math.pow(bodyPos.z - pos.z, 2);

            if (distSq > radius * radius) return;

            const userData = body.userData as { onHit?: (fromExplo?: boolean) => void, isBlock?: boolean, isPlayer?: boolean, isDebris?: boolean };

            if (!userData) return;

            if (userData.isBlock && userData.onHit && !userData.isDebris && affectedBlocks < 9) {
                affectedBlocks++;
                // Schedule hit for after loop
                hits.push(() => userData.onHit?.(true));
            } else if (!userData.isPlayer) {
                // Apply impulse to debris/other objects
                const dist = Math.sqrt(distSq);
                const force = 0.02;
                const dirX = (bodyPos.x - pos.x) / (dist || 1);
                const dirY = (bodyPos.y - pos.y) / (dist || 1);
                const dirZ = (bodyPos.z - pos.z) / (dist || 1);

                if (!isNaN(dirX) && !isNaN(dirY) && !isNaN(dirZ)) {
                    impulses.push({
                        body,
                        impulse: {
                            x: dirX * force,
                            y: dirY * force + force,
                            z: dirZ * force
                        }
                    });
                }
            }
        });

        // SAFETY: Apply all changes AFTER the loop finishes
        hits.forEach(h => h());
        impulses.forEach(({ body, impulse }) => {
            try {
                body.applyImpulse(impulse, true);
            } catch (e) {
                // Ignore errors if body was removed by a hit in the same frame
            }
        });
    };

    return (
        <>
            {!shattered && (
                <RigidBody
                    ref={rigidBody}
                    type={isDynamic ? "dynamic" : "fixed"}
                    position={position}
                    restitution={0.2}
                    friction={0.8}
                    colliders="cuboid"
                    userData={{ isBlock: true, onHit, id: blockId }} // Crucial for connection
                >
                    <mesh
                        ref={meshRef}
                        castShadow
                        receiveShadow
                        userData={{ isBlock: true, onHit, id: blockId }} // Backup for Raycaster
                        renderOrder={type === 'portal' && isXRayActive ? 9999 : 0}
                    >
                        <boxGeometry args={type === 'portal' ? [0.3, 0.3, 0.3] : [scale, scale, scale]} />
                        <meshStandardMaterial
                            color={COLORS[type]}
                            transparent={isXRayActive} // Force true for portal during X-Ray too
                            opacity={type !== 'portal' && isXRayActive ? 0 : 1}
                            depthWrite={!isXRayActive || type !== 'portal'} // Disable for portal during X-Ray
                            depthTest={type === 'portal' && isXRayActive ? false : true}
                            emissive={COLORS[type]}
                            emissiveIntensity={isXRayActive && type !== 'portal' ? 0 : (type === 'portal' && isXRayActive ? 1.5 : (aimedBlockId === blockId ? 0.2 : (type === 'gold' ? 0.1 : (type === 'explosive' ? 0.2 : (type === 'portal' ? 0.5 : 0)))))}
                        />
                        {type !== 'portal' && isXRayActive && (
                            <lineSegments>
                                <edgesGeometry args={[new THREE.BoxGeometry(scale, scale, scale)]} />
                                <lineBasicMaterial color={COLORS[type]} />
                            </lineSegments>
                        )}
                    </mesh>
                </RigidBody>
            )}

            {/* Effects - Using shatterPos which contains the actual impact position */}
            {showAnimeFirework && shatterPos && (
                <AnimeFirework position={shatterPos} color="#FFD700" onComplete={() => setShowAnimeFirework(false)} />
            )}

            {exploding && shatterPos && (
                <MinecraftSmoke position={shatterPos} count={30} onComplete={() => setExploding(false)} />
            )}

            {/* Debris - Re-enabled with reduced count (4 pieces) */}
            {shattered && (type === 'standard' || type === 'gold' || type === 'explosive') && shatterPos && (
                <Shatter
                    position={shatterPos}
                    type={type}
                    color={COLORS[type]}
                    onComplete={() => { }}
                />
            )}
        </>
    );
};
// Wait, position prop is static initial position. If block fell, we need current position.
