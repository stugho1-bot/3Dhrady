import { useFrame } from "@react-three/fiber";
import { easing } from "maath";

export const MenuCamera = () => {
    useFrame((state, delta) => {
        // Rotate camera slowly around the castle
        const t = state.clock.getElapsedTime();
        const radius = 35; // Further back
        const x = Math.sin(t * 0.1) * radius; // Slower rotation
        const z = Math.cos(t * 0.1) * radius;

        // Smoothly interpolate position
        easing.damp3(state.camera.position, [x, 15, z], 0.5, delta);

        // Look at center (base of castle)
        state.camera.lookAt(0, 5, 0);
    });

    return null;
};
