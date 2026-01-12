import { useMemo } from 'react';

interface TreeProps {
    position: [number, number, number];
    scale?: number;
}

const Tree = ({ position, scale = 1 }: TreeProps) => {
    return (
        <group position={position} scale={[scale, scale, scale]}>
            {/* Trunk */}
            <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.2, 0.3, 1.5, 6]} />
                <meshStandardMaterial color="#5D4037" />
            </mesh>
            {/* Leaves */}
            <mesh position={[0, 2.25, 0]} castShadow receiveShadow>
                <coneGeometry args={[1.2, 2.5, 6]} />
                <meshStandardMaterial color="#2E7D32" />
            </mesh>
            {/* Smaller top layer of leaves */}
            <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
                <coneGeometry args={[0.8, 1.5, 6]} />
                <meshStandardMaterial color="#388E3C" />
            </mesh>
        </group>
    );
};

export const Trees = ({ level }: { level: number }) => {
    const trees = useMemo(() => {
        const t: { pos: [number, number, number], scale: number }[] = [];
        const count = 40;
        const seed = level * 123.456;

        const rnd = (i: number) => {
            const x = Math.sin(i + seed) * 10000;
            return x - Math.floor(x);
        };

        for (let i = 0; i < count; i++) {
            const angle = rnd(i * 10) * Math.PI * 2;
            const dist = 12 + rnd(i * 20) * 30; // 12m to 42m away
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;

            // Safety zone for player spawn [0, 0, 20]
            const dx = x - 0;
            const dz = z - 20;
            const distSqToPlayer = dx * dx + dz * dz;
            if (distSqToPlayer < 64) continue; // 8m radius

            t.push({
                pos: [x, 0, z],
                scale: 0.8 + rnd(i * 30) * 0.7
            });
        }
        return t;
    }, [level]);

    return (
        <group>
            {trees.map((tree, i) => (
                <Tree key={i} position={tree.pos} scale={tree.scale} />
            ))}
        </group>
    );
};
