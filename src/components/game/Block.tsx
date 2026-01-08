import { RigidBody, RapierRigidBody, useRapier } from "@react-three/rapier";
import { useRef, useState, useMemo, memo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../../store/useGameStore";
import { AnimeFirework, MinecraftSmoke } from "./Effects";
import { Shatter } from "./Shatter";

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


export const Block = memo(({ id, position, type = 'standard', scale = 1 }: BlockProps) => {
    // ID must be strictly stable based on coordinates to prevent respawning
    const level = useGameStore(state => state.level);
    const blockId = useMemo(() => {
        if (id) return id;
        const nx = Math.round(position[0]);
        const ny = Math.round(position[1] * 10) / 10;
        const nz = Math.round(position[2]);
        return `b-${nx}-${ny}-${nz}-${level}`;
    }, [id, position, level]);

    const rigidBody = useRef<RapierRigidBody>(null);
    const [isDynamic, _setIsDynamic] = useState(false);

    const { world } = useRapier();

    // PERFORMANCE OPTIMIZATION (Mobile): O(1) selectors
    const incBlocksDestroyed = useGameStore(state => state.incBlocksDestroyed);
    const setStatus = useGameStore(state => state.setStatus);
    const shakeCamera = useGameStore(state => state.shakeCamera);
    const isXRayActive = useGameStore(state => state.isXRayActive);
    const isAimed = useGameStore(state => state.aimedBlockId === blockId);
    const isDestroyedGlobally = useGameStore(state => !!state.destroyedBlocks[blockId]);
    const isClearedGlobally = useGameStore(state => !!state.clearedBlocks?.[blockId]);
    const markBlockDestroyed = useGameStore(state => state.markBlockDestroyed);
    const markBlockCleared = useGameStore(state => state.markBlockCleared);

    const [exploding, setExploding] = useState(false);
    const [showAnimeFirework, setShowAnimeFirework] = useState(false);

    // Initialize from global state to survive remounts
    const [shattered, setShattered] = useState(isDestroyedGlobally);
    const [isRemoved, setIsRemoved] = useState(isClearedGlobally);
    const [shatterPos, setShatterPos] = useState<[number, number, number] | null>(isDestroyedGlobally ? position : null);
    const [isFusing, setIsFusing] = useState(false);

    const meshRef = useRef<THREE.Mesh>(null);
    const hasExploded = useRef(isDestroyedGlobally);
    const isProcessingHit = useRef(false);
    const fuseTimerRef = useRef(0);

    // Sync state with global store if changed externally (e.g. from explosion of another block)
    useEffect(() => {
        if (isDestroyedGlobally && !shattered) {
            setShattered(true);
            if (!shatterPos) setShatterPos(position);
        }
        if (isClearedGlobally && !isRemoved) {
            setIsRemoved(true);
        }
    }, [isDestroyedGlobally, isClearedGlobally]);

    // Portal blinking & TNT fuse blinking
    useFrame(({ clock }, delta) => {
        if (isRemoved || isClearedGlobally) return;

        if (meshRef.current) {
            const material = meshRef.current.material as THREE.MeshStandardMaterial;

            if (type === 'portal') {
                const t = clock.getElapsedTime();
                material.emissiveIntensity = 0.5 + Math.sin(t * 10) * 0.25;
            } else if (isFusing) {
                // STABILITY FIX: Move side-effects out of state updaters
                fuseTimerRef.current += delta;
                if (fuseTimerRef.current >= 1.5) {
                    fuseTimerRef.current = 0;
                    handleDetonation();
                }

                // Blink white like Minecraft TNT
                const blink = Math.floor(fuseTimerRef.current * 8) % 2 === 0;
                material.emissiveIntensity = blink ? 0.5 : 0;
                material.emissive.set(blink ? '#ffffff' : COLORS[type]);
            }
        }
    });

    const handleDetonation = () => {
        if (hasExploded.current) return;

        // DEFERRED ACTION (Safe Frame for essentials)
        setTimeout(() => {
            // STABILITY FIX: Update store INSIDE timeout to prevent mid-frame unmount
            markBlockDestroyed(blockId);
            setShattered(true);
            setExploding(true);

            let currentPos = position;
            if (rigidBody.current) {
                try {
                    const t = rigidBody.current.translation();
                    currentPos = [t.x, t.y, t.z];
                } catch (e) { }
            }
            setShatterPos(currentPos);

            triggerExplosion(new THREE.Vector3(...(currentPos || position)));
            setIsFusing(false);
            incBlocksDestroyed();
        }, 16);
    };

    const onHit = (_fromExplosion = false) => {
        if (isRemoved || isClearedGlobally || shattered || exploding || hasExploded.current || isProcessingHit.current || isDestroyedGlobally) return;
        if (isFusing && !_fromExplosion) return;

        isProcessingHit.current = true;

        if (type === 'portal') {
            setStatus('LEVEL_COMPLETE');
            return;
        }

        let currentPos = position;
        if (rigidBody.current) {
            try {
                const t = rigidBody.current.translation();
                currentPos = [t.x, t.y, t.z];
            } catch (e) { }
        }
        setShatterPos(currentPos);

        // DEFERRED ACTION (Safe Frame)
        setTimeout(() => {
            // STABILITY FIX: Update store INSIDE timeout
            if (type !== 'explosive' || _fromExplosion) {
                markBlockDestroyed(blockId);
            }

            if (type === 'gold') {
                setShattered(true);
                incBlocksDestroyed();
                setShowAnimeFirework(true);
            } else if (type === 'explosive') {
                if (_fromExplosion) {
                    // VERCEL LOGIC: Shatter only
                    setShattered(true);
                    incBlocksDestroyed();
                } else {
                    // VERCEL LOGIC: Start Fuse
                    setIsFusing(true);
                    isProcessingHit.current = false;
                }
            } else {
                setShattered(true);
                incBlocksDestroyed();
            }
        }, 16);
    };

    const triggerExplosion = (pos: THREE.Vector3) => {
        if (hasExploded.current) return;
        hasExploded.current = true;

        const radius = 1.5;
        try { shakeCamera(0.2); } catch (e) { }

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
                candidates.push({ body, distSq, dx, dy, dz });
            }
        });

        candidates.sort((a, b) => a.distSq - b.distSq);

        const hits: Array<() => void> = [];
        const impulses: Array<{ body: any, impulse: { x: number, y: number, z: number } }> = [];
        let affectedBlocks = 0;

        for (const can of candidates) {
            const userData = can.body.userData as any;
            if (!userData || userData.id === blockId) continue;

            if (userData.isBlock && userData.onHit && !userData.isDebris) {
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

        // STABILITY FIX: Increase deferment to a full frame (16ms)
        setTimeout(() => {
            hits.forEach(h => h());
            impulses.forEach(({ body, impulse }) => {
                try {
                    if (body && body.isValid && body.isValid()) {
                        body.applyImpulse(impulse, true);
                    }
                } catch (e) { }
            });
        }, 16);
    };

    const handleClearDebris = () => {
        setIsRemoved(true);
        markBlockCleared(blockId);
    };

    // If fully cleared globally, don't render anything
    if (isClearedGlobally) return null;

    // If destroyed or shattered on mount, hide the main block
    const shouldHideBlock = isDestroyedGlobally || shattered;

    return (
        <group visible={!isRemoved}>
            {!shouldHideBlock && (
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
                            emissiveIntensity={isXRayActive && type !== 'portal' ? 0 : (isAimed ? 0.2 : (type === 'gold' ? 0.1 : (type === 'explosive' ? 0.2 : (type === 'portal' ? 0.5 : 0))))}
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
                    onComplete={handleClearDebris}
                />
            )}
        </group>
    );
});
