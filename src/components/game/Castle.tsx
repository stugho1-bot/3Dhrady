import { useMemo } from "react";
import { Block } from "./Block";
import type { BlockType } from "./Block";
import { useGameStore } from "../../store/useGameStore";

export const Castle = () => {
    const level = useGameStore(state => state.level);

    const blocks = useMemo(() => {
        const b: { position: [number, number, number], type: BlockType, key: string, scale?: number }[] = [];
        const seed = level * 1337;

        // Random helper tied to level and coordinates
        const rnd = (x: number, y: number, z: number) => {
            const hash = Math.sin(x * 12.9898 + y * 78.233 + z * 53.53 + seed) * 43758.5453;
            return hash - Math.floor(hash);
        };

        const getBlockType = (x: number, y: number, z: number, rarity = 0.05): BlockType => {
            const r = rnd(x, y, z);
            if (r < rarity) return 'gold';
            if (r < rarity + 0.05) return 'explosive';
            return 'standard';
        };

        // UI ID generator to prevent key collisions
        let blockCount = 0;
        const addBlock = (pos: [number, number, number], type: BlockType, scale = 1) => {
            if (pos[1] < 0.5) return; // Don't spawn below ground
            b.push({
                position: pos,
                type,
                key: `b-${blockCount++}-${level}`,
                scale
            });
        };

        // ARCHITECTURAL HELPERS

        const buildBox = (xStart: number, zStart: number, xEnd: number, zEnd: number, yStart: number, yEnd: number, hollow = false) => {
            for (let x = xStart; x <= xEnd; x++) {
                for (let z = zStart; z <= zEnd; z++) {
                    for (let y = yStart; y < yEnd; y++) {
                        if (hollow && x > xStart && x < xEnd && z > zStart && z < zEnd) continue;
                        addBlock([x, y + 0.5, z], getBlockType(x, y, z));
                    }
                }
            }
        };

        const buildTower = (cx: number, cz: number, radius: number, height: number, yOffset = 0, square = false) => {
            for (let y = yOffset; y < yOffset + height; y++) {
                for (let x = cx - radius; x <= cx + radius; x++) {
                    for (let z = cz - radius; z <= cz + radius; z++) {
                        const distSq = Math.pow(x - cx, 2) + Math.pow(z - cz, 2);
                        const isInside = square ? true : distSq <= radius * radius;
                        const isEdge = square ? (Math.abs(x - cx) === radius || Math.abs(z - cz) === radius) : (distSq > Math.pow(radius - 1, 2));

                        if (isInside && isEdge) {
                            addBlock([x, y + 0.5, z], getBlockType(x, y, z, 0.03));
                        }
                    }
                }
            }
        };

        const buildWall = (x1: number, z1: number, x2: number, z2: number, h: number) => {
            const dx = Math.abs(x2 - x1);
            const dz = Math.abs(z2 - z1);
            const steps = Math.max(dx, dz);
            for (let i = 0; i <= steps; i++) {
                const x = Math.round(x1 + (x2 - x1) * (i / steps));
                const z = Math.round(z1 + (z2 - z1) * (i / steps));
                for (let y = 0; y < h; y++) {
                    addBlock([x, y + 0.5, z], getBlockType(x, y, z, 0.02));
                }
            }
        };

        // ARCHETYPES (10 groups of 5 levels)
        const archetype = Math.floor((level - 1) / 5);
        const subLevel = (level - 1) % 5; // 0-4 variation

        switch (archetype) {
            case 0: // 1-5: TVRZ (Keep) - Single solid tower/house
                {
                    const w = 3 + subLevel;
                    const h = 5 + subLevel * 2;
                    buildBox(-Math.floor(w / 2), -Math.floor(w / 2), Math.floor(w / 2), Math.floor(w / 2), 0, h, true);
                    // Add a small chimney/turret for Level 3+
                    if (subLevel >= 2) buildTower(Math.floor(w / 2), Math.floor(w / 2), 1, 3, h, true);
                }
                break;

            case 1: // 6-10: TROSKY (Two Towers)
                {
                    const dist = 5 + subLevel;
                    const h1 = 12 + subLevel;
                    const h2 = 8 + subLevel;
                    buildTower(-dist, 0, 2, h1, 0, true); // Panna
                    buildTower(dist, 0, 2, h2, 0, false); // Baba
                    buildWall(-dist, 0, dist, 0, 3); // Connecting wall
                }
                break;

            case 2: // 11-15: BEZDĚZ (Mountain Tower)
                {
                    const h = 15 + subLevel * 2;
                    buildTower(0, 0, 2, h); // Main tower
                    buildBox(-4, -4, 4, 4, 0, 4, true); // Palace base
                }
                break;

            case 3: // 16-20: KARLŠTEJN (Tiered Structure)
                {
                    buildBox(-6, -3, 6, 3, 0, 4, true); // Low palace
                    buildBox(-2, -2, 2, 2, 4, 10 + subLevel, true); // Main keep
                    buildTower(7, 0, 2, 6); // Side tower
                }
                break;

            case 4: // 21-25: KOST (Square Keep in Valley)
                {
                    buildBox(-4, -4, 4, 4, 0, 10, true); // The square keep
                    // Corner turrets
                    buildTower(-4, -4, 1, 12, 0, true);
                    buildTower(4, 4, 1, 12, 0, true);
                }
                break;

            case 5: // 26-30: KŘIVOKLÁT (Circular Focus)
                {
                    buildTower(0, 0, 4, 4, 0, false); // Base courtyard wall
                    buildTower(0, 0, 2, 12 + subLevel, 0, false); // Round main tower
                    buildWall(4, -4, 8, -8, 6); // Wing
                }
                break;

            case 6: // 31-35: HLUBOKÁ (Turrets & Facades)
                {
                    buildBox(-8, -4, 8, 4, 0, 6, true);
                    // Many turrets
                    for (let x = -8; x <= 8; x += 4) {
                        buildTower(x, 4, 1, 10 + subLevel, 0, false);
                        buildTower(x, -4, 1, 10 + subLevel, 0, false);
                    }
                }
                break;

            case 7: // 36-40: PERNŠTEJN (Irregular)
                {
                    buildBox(-3, -3, 3, 3, 0, 15, true);
                    buildWall(-6, -6, 6, 6, 5);
                    buildTower(4, -4, 2, 8);
                }
                break;

            case 8: // 41-45: LOKET (Fortress on Curve)
                {
                    buildWall(-10, 0, 0, 10, 8);
                    buildWall(0, 10, 10, 0, 8);
                    buildTower(0, 5, 3, 15, 0, true);
                }
                break;

            case 9: // 46-50: PRAGUE CASTLE (Massive Complex)
                {
                    buildBox(-12, -4, 12, 4, 0, 6, true); // Long palace
                    buildTower(0, 0, 5, 20, 0, true); // "Cathedral" tower
                    buildTower(-10, 6, 2, 10); // Romanesque tower
                    buildTower(10, 6, 2, 10); // Romanesque tower
                }
                break;

            default:
                buildBox(-3, -3, 3, 3, 0, 6);
                break;
        }

        // --- PORTAL PLACEMENT ---
        // const variant = (level - 1) % 5;
        let portalP: [number, number, number] = [0, 1.5, 0];

        if (level <= 2) {
            // Level 1-2: Always somewhere HIGH and visible
            let maxH = 0;
            b.forEach(bl => { if (bl.position[1] > maxH) maxH = bl.position[1]; });
            const topBlocks = b.filter(bl => bl.position[1] === maxH);
            if (topBlocks.length > 0) {
                // Pick a random block from the top layer
                const target = topBlocks[Math.floor(rnd(level, 0, 0) * topBlocks.length)];
                portalP = [...target.position] as [number, number, number];
                // Remove the block being replaced
                const idx = b.indexOf(target);
                if (idx > -1) b.splice(idx, 1);
            }
        } else {
            // Level 3+: Hidden INSIDE (don't pick blocks on the extreme horizontal edges)
            const minX = Math.min(...b.map(bl => bl.position[0]));
            const maxX = Math.max(...b.map(bl => bl.position[0]));
            const minZ = Math.min(...b.map(bl => bl.position[2]));
            const maxZ = Math.max(...b.map(bl => bl.position[2]));

            // Filter blocks that are strictly inside the horizontal bounds
            const internalBlocks = b.filter(bl =>
                bl.position[0] > minX && bl.position[0] < maxX &&
                bl.position[2] > minZ && bl.position[2] < maxZ &&
                bl.position[1] > 0.5 // Usually not the very bottom floor if possible
            );

            const pool = internalBlocks.length > 0 ? internalBlocks : b;
            const idxInPool = Math.floor(rnd(level, level, level) * pool.length);
            const target = pool[idxInPool];
            portalP = [...target.position] as [number, number, number];

            const originalIdx = b.indexOf(target);
            if (originalIdx > -1) b.splice(originalIdx, 1);
        }

        b.push({ position: portalP, type: 'portal', key: `portal-${level}` });

        return b;
    }, [level]);

    return (
        <>
            {blocks.map((block) => (
                <Block key={block.key} position={block.position} type={block.type} scale={block.scale} />
            ))}
        </>
    );
};
