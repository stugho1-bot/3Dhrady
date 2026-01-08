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
    const hasExploded = useRef(false);

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
                        incBlocksDestroyed();
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
        if (shattered || exploding || hasExploded.current) return;

        if (type === 'portal') {
            useGameStore.getState().setStatus('LEVEL_COMPLETE');
            return;
        }

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
            if (scale > 0.8) {
                if (_fromExplosion) {
                    setShattered(true);
                    incBlocksDestroyed();
                    setInteracted(true);
                } else {
                    setIsFusing(true);
                    setInteracted(true);
                }
            } else {
                setShattered(true);
                incBlocksDestroyed();
                setInteracted(true);
            }
        } else {
            setShattered(true);
            incBlocksDestroyed();
            setInteracted(true);
        }
    };

    const triggerExplosion = (pos: THREE.Vector3) => {
        if (hasExploded.current) return;
        hasExploded.current = true;

        const radius = 1.5;
        const { shakeCamera } = useGameStore.getState();

        try {
            shakeCamera(0.2);
        } catch (e) { }

        // 1. COLLECT: Gather candidates with distance info
        const candidates: any[] = [];
        world.forEachCollider((collider: any) => {
            const body = collider.parent();
            if (!body) return;
            const bodyPos = body.translation();
            const dx = bodyPos.x - pos.x;
            const dy = bodyPos.y - pos.y;
            const dz = bodyPos.z - pos.z;
            const distSq = dx * dx + dy * dy + dz * dz;

            if (distSq <= radius * radius) {
                candidates.push({ collider, body, distSq, dx, dy, dz });
            }
        });

        // 2. SORT: Nearest first to ensure logic picks the closest 3 blocks
        candidates.sort((a, b) => a.distSq - b.distSq);

        // 3. PROCESS: Calculate hits (MAX 3) and impulses
        const hits: Array<() => void> = [];
        const impulses: Array<{ body: any, impulse: { x: number, y: number, z: number } }> = [];
        let affectedBlocks = 0;

        for (const can of candidates) {
            const userData = can.body.userData as any;
            if (!userData || userData.id === blockId) continue;

            if (userData.isBlock && userData.onHit && !userData.isDebris) {
                // USER REQUEST: Maximum 3 surrounding blocks destroyed
                if (affectedBlocks < 3) {
                    affectedBlocks++;
                    const hitFn = userData.onHit;
                    hits.push(() => hitFn(true));
                }
            } else if (!userData.isPlayer) {
                const dist = Math.sqrt(can.distSq);
                const force = 0.015;
                const dirX = can.dx / (dist || 1);
                const dirY = can.dy / (dist || 1);
                const dirZ = can.dz / (dist || 1);

                if (!isNaN(dirX) && !isNaN(dirY) && !isNaN(dirZ)) {
                    impulses.push({
                        body: can.body,
                        impulse: { x: dirX * force, y: dirY * force + force, z: dirZ * force }
                    });
                }
            }
        }

        // 4. DEFERRED EXECUTION: Safe physics updates
        setTimeout(() => {
            hits.forEach(h => h());
            impulses.forEach(({ body, impulse }) => {
                try {
                    if (body && body.isValid && body.isValid()) {
                        body.applyImpulse(impulse, true);
                    }
                } catch (e) { }
            });
        }, 0);
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
                    userData={{ isBlock: true, onHit, id: blockId }}
                >
                    <mesh
                        ref={meshRef}
                        castShadow
                        receiveShadow
                        userData={{ isBlock: true, onHit, id: blockId }}
                        renderOrder={type === 'portal' && isXRayActive ? 9999 : 0}
                    >
                        <boxGeometry args={type === 'portal' ? [0.3, 0.3, 0.3] : [scale, scale, scale]} />
                        <meshStandardMaterial
                            color={COLORS[type]}
                            transparent={isXRayActive}
                            opacity={type !== 'portal' && isXRayActive ? 0 : 1}
                            depthWrite={!isXRayActive || type !== 'portal'}
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

            {showAnimeFirework && shatterPos && (
                <AnimeFirework position={shatterPos} color="#FFD700" onComplete={() => setShowAnimeFirework(false)} />
            )}

            {exploding && shatterPos && (
                <MinecraftSmoke position={shatterPos} count={30} onComplete={() => setExploding(false)} />
            )}

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
