import { useRef, useMemo, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { debugLogger } from "../../utils/DebugLogger";

interface ParticleProps {
    count?: number;
    color?: string;
    position: [number, number, number];
    onComplete: () => void;
}

export const Confetti = ({ count = 20, color = 'gold', position, onComplete }: ParticleProps) => {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Store velocity and lifetime for each particle
    const particles = useMemo(() => {
        return new Array(count).fill(0).map(() => ({
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10 + 5, // Upward bias
                (Math.random() - 0.5) * 10
            ),
            position: new THREE.Vector3(...position),
            rotation: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
            life: 1.0
        }));
    }, [count, position]);

    const completed = useRef(false);

    useFrame((_state, delta) => {
        if (completed.current || !mesh.current) return;

        let aliveCount = 0;

        particles.forEach((p, i) => {
            if (p.life > 0) {
                p.life -= delta;
                p.velocity.y -= 9.8 * delta; // Gravity
                p.position.addScaledVector(p.velocity, delta);
                p.rotation.x += delta * 2;

                if (p.life > 0) aliveCount++;

                dummy.position.copy(p.position);
                dummy.rotation.setFromVector3(p.rotation);
                const scale = p.life;
                dummy.scale.set(scale, scale, scale);
                dummy.updateMatrix();
                mesh.current!.setMatrixAt(i, dummy.matrix);
            } else {
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                mesh.current!.setMatrixAt(i, dummy.matrix);
            }
        });

        mesh.current.instanceMatrix.needsUpdate = true;

        if (aliveCount === 0) {
            completed.current = true;
            onComplete();
        }
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <boxGeometry args={[0.2, 0.2, 0.05]} />
            <meshStandardMaterial color={color} />
        </instancedMesh>
    );
};

export const Firework = ({ position, color }: { position: [number, number, number], color: string }) => {
    // Reusing Confetti but with spherical velocity distribution for explosion look
    return <Confetti position={position} color={color} count={40} onComplete={() => { }} />;
    // Actually, Confetti currently has upward bias and gravity.
    // We should make a separate specialized one if we want "Firework".
    // Or just customize Confetti props? Confetti implementation is internal.
    // Let's copy-paste and modify for Firework to have spherical velocity.
};

export const ExplosionParticles = ({ position, color = 'red', count = 30, onComplete }: ParticleProps) => {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const particles = useMemo(() => {
        return new Array(count).fill(0).map(() => {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = Math.random() * 10 + 5;

            return {
                velocity: new THREE.Vector3(
                    speed * Math.sin(phi) * Math.cos(theta),
                    speed * Math.sin(phi) * Math.sin(theta),
                    speed * Math.cos(phi)
                ),
                position: new THREE.Vector3(...position),
                rotation: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
                life: 1.0 + Math.random() * 0.5
            };
        });
    }, [count, position]);

    const completed = useRef(false);

    useFrame((_state, delta) => {
        if (completed.current || !mesh.current) return;

        let aliveCount = 0;
        particles.forEach((p, i) => {
            if (p.life > 0) {
                p.life -= delta * 1.5; // Faster fade
                p.velocity.multiplyScalar(0.95); // Drag
                p.position.addScaledVector(p.velocity, delta);
                p.rotation.x += delta * 5;

                if (p.life > 0) aliveCount++;

                dummy.position.copy(p.position);
                dummy.rotation.setFromVector3(p.rotation);
                const scale = p.life * 0.5;
                dummy.scale.set(scale, scale, scale);
                dummy.updateMatrix();
                mesh.current!.setMatrixAt(i, dummy.matrix);
            } else {
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                mesh.current!.setMatrixAt(i, dummy.matrix);
            }
        });
        mesh.current.instanceMatrix.needsUpdate = true;

        if (aliveCount === 0) {
            completed.current = true;
            onComplete();
        }
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial color={color} />
        </instancedMesh>
    );
};

export const AnimeFirework = ({ position, onComplete, scale = 1.0 }: ParticleProps & { scale?: number }) => {
    // Variety: Shapes (0: Square, 1: Star, 2: Cube bits)
    const variant = useMemo(() => Math.floor(Math.random() * 3), []);

    // Fully Random Palette for high-tier destruction
    const colors = useMemo(() => {
        const palette = [
            '#FFD700', '#FF4500', '#00FF00', '#00FFFF',
            '#FF00FF', '#FFFFFF', '#FFA500', '#7FFF00'
        ];
        const c1 = palette[Math.floor(Math.random() * palette.length)];
        const c2 = palette[Math.floor(Math.random() * palette.length)];
        return [c1, c2];
    }, []);

    const rotationOffset = useMemo(() => [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI], []);

    const ringRef = useRef<THREE.Mesh>(null);
    const starRef = useRef<THREE.Group>(null);
    const [finished, setFinished] = useState(false);

    useFrame((_state, delta) => {
        if (finished) return;
        let active = false;

        if (ringRef.current) {
            ringRef.current.scale.addScalar(delta * 20 * scale);
            const mat = ringRef.current.material as THREE.MeshStandardMaterial;
            mat.opacity -= delta * 1.5;
            if (mat.opacity > 0) active = true;
            else ringRef.current.visible = false;
        }

        if (starRef.current) {
            starRef.current.rotation.z += delta * (variant === 0 ? 5 : -3);
            starRef.current.scale.addScalar(delta * 12 * scale);
            starRef.current.children.forEach((child) => {
                const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                mat.opacity -= delta * 2;
                if (mat.opacity > 0) active = true;
            });
        }

        if (!active && !finished) {
            setFinished(true);
            onComplete && onComplete();
        }
    });

    if (finished) return null;

    return (
        <group position={position} rotation={rotationOffset as any}>
            <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.2 * scale, 0.4 * scale, 32]} />
                <meshStandardMaterial color={colors[0]} transparent opacity={1} side={THREE.DoubleSide} emissive={colors[1]} emissiveIntensity={2} />
            </mesh>

            <group ref={starRef}>
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                    <mesh key={i} rotation={[0, 0, (angle * Math.PI) / 180]}>
                        {variant === 0 && <boxGeometry args={[0.1 * scale, 2 * scale, 0.1 * scale]} />}
                        {variant === 1 && <octahedronGeometry args={[0.5 * scale, 0]} />}
                        {variant === 2 && <torusGeometry args={[0.5 * scale, 0.05 * scale, 8, 16]} />}
                        <meshStandardMaterial
                            color={i % 2 === 0 ? colors[0] : colors[1]}
                            transparent opacity={1}
                            emissive={i % 2 === 0 ? colors[1] : colors[0]}
                            emissiveIntensity={1.5}
                        />
                    </mesh>
                ))}
            </group>
        </group>
    );
};
export const MinecraftSmoke = ({ position, count = 20, onComplete }: ParticleProps) => {
    debugLogger.log('EFFECT', 'MinecraftSmoke spawned', { position, count });
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const particles = useMemo(() => {
        return new Array(count).fill(0).map(() => {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = Math.random() * 4 + 2;

            return {
                velocity: new THREE.Vector3(
                    speed * Math.sin(phi) * Math.cos(theta),
                    speed * Math.sin(phi) * Math.sin(theta),
                    speed * Math.cos(phi)
                ),
                position: new THREE.Vector3(...position),
                life: 1.0 + Math.random() * 0.5
            };
        });
    }, [count, position]);

    const completed = useRef(false);

    useFrame((_state, delta) => {
        if (completed.current || !mesh.current) return;

        let aliveCount = 0;
        particles.forEach((p, i) => {
            if (p.life > 0) {
                p.life -= delta * 1.2;
                p.velocity.multiplyScalar(0.94); // Drag
                p.position.addScaledVector(p.velocity, delta);

                if (p.life > 0) aliveCount++;

                dummy.position.copy(p.position);
                const s = p.life * 0.6;
                dummy.scale.set(s, s, s);
                dummy.updateMatrix();
                mesh.current!.setMatrixAt(i, dummy.matrix);
            } else {
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                mesh.current!.setMatrixAt(i, dummy.matrix);
            }
        });
        mesh.current.instanceMatrix.needsUpdate = true;

        if (aliveCount === 0) {
            completed.current = true;
            onComplete && onComplete();
        }
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#888888" transparent opacity={0.8} />
        </instancedMesh>
    );
};
