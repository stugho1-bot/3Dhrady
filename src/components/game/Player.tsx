import { useKeyboardControls, PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, CapsuleCollider, RapierRigidBody, useRapier } from "@react-three/rapier";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useGameStore } from "../../store/useGameStore";
import { Hammer } from "./Hammer";
import type { HammerRef } from "./Hammer";

const SPEED = 5;
const CROUCH_SPEED = 2;
const JUMP_FORCE = 5;

export const Player = () => {
    const rigidBody = useRef<RapierRigidBody>(null);
    const hammerRef = useRef<HammerRef>(null);
    const [, get] = useKeyboardControls();
    const {
        joystick, isJumping, setCrouching, isCrouching,
        setAimedBlock, setXRayActive, touchDelta, setTouchDelta
    } = useGameStore();
    const { camera, scene, raycaster } = useThree();
    const { world } = useRapier();

    const direction = useRef(new THREE.Vector3());
    const [isGrounded, setIsGrounded] = useState(false);

    // Grabbing State
    const grabbedBody = useRef<RapierRigidBody | null>(null);
    const grabbedBlockId = useRef<string | null>(null);

    // Key states for Shift differentiated logic
    const keysPressed = useRef<Set<string>>(new Set());

    useEffect(() => {
        const onDown = (e: KeyboardEvent) => {
            keysPressed.current.add(e.code);

            // X-Ray Toggle logic: RightShift + T
            if (keysPressed.current.has('ShiftRight') && e.code === 'KeyT') {
                setXRayActive(!useGameStore.getState().isXRayActive);
            }

            // Crouch State
            if (e.code === 'ShiftLeft') setCrouching(true);
        };
        const onUp = (e: KeyboardEvent) => {
            keysPressed.current.delete(e.code);

            // Key release logic for X-Ray toggle is removed as it's now a switch

            if (e.code === 'ShiftLeft') setCrouching(false);
        };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        return () => {
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
        };
    }, [setXRayActive, setCrouching]);

    // Right Mouse Button for Grabbing
    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
            if (e.button === 2) { // Right Click
                // Raycast to grab
                raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
                const intersects = raycaster.intersectObjects(scene.children, true);
                const hit = intersects.find(i => i.distance < 4 && i.object.userData.isBlock);

                if (hit) {
                    const blockId = hit.object.userData.id;
                    // Find the physics body for this block
                    world.forEachCollider((collider) => {
                        const body = collider.parent();
                        if (body && body.userData && (body.userData as any).id === blockId) {
                            grabbedBody.current = body;
                            grabbedBlockId.current = blockId;
                            body.setBodyType(1, true); // KinematicVelocity for movement
                        }
                    });
                }
            } else if (e.button === 0) {
                handleSwing();
            }
        };
        const onMouseUp = (e: MouseEvent) => {
            if (e.button === 2 && grabbedBody.current) {
                grabbedBody.current.setBodyType(0, true); // Dynamic
                grabbedBody.current = null;
                grabbedBlockId.current = null;
            }
        };
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [camera, scene, raycaster, world]);

    const handleSwing = () => {
        if (grabbedBody.current) return; // Can't swing while grabbing
        hammerRef.current?.swing();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        const hit = intersects.find(i => i.distance < 3.5 && i.object.userData.isBlock);

        if (hit && hit.object.userData.onHit) {
            const worldPos = new THREE.Vector3();
            hit.object.getWorldPosition(worldPos);
            hit.object.userData.onHit(false, worldPos, (hit as any).instanceId);
        }
    };

    const hammerGroupRef = useRef<THREE.Group>(null);

    useFrame((_state, delta) => {
        if (!rigidBody.current) return;

        // --- Highlighting ---
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const aimedIntersects = raycaster.intersectObjects(scene.children, true);
        const aimedHit = aimedIntersects.find(i => i.distance < 4 && i.object.userData.isBlock);
        setAimedBlock(aimedHit ? (aimedHit.object.userData.id as string) : null);

        // --- Grabbing Sync ---
        if (grabbedBody.current) {
            const holdPos = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(2));
            grabbedBody.current.setNextKinematicTranslation(holdPos);
        }

        // --- Mobile Camera Rotation ---
        if (touchDelta.x !== 0 || touchDelta.y !== 0) {
            const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
            euler.y -= touchDelta.x * 0.01;
            euler.x -= touchDelta.y * 0.01;
            euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
            camera.quaternion.setFromEuler(euler);
            setTouchDelta(0, 0);
        }

        // --- Movement ---
        const { forward, back, left, right, jump } = get();
        const vel = rigidBody.current.linvel();
        direction.current.set(0, 0, 0);

        const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forwardVec.y = 0; forwardVec.normalize();
        const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        rightVec.y = 0; rightVec.normalize();

        if (forward) direction.current.add(forwardVec);
        if (back) direction.current.sub(forwardVec);
        if (left) direction.current.sub(rightVec);
        if (right) direction.current.add(rightVec);

        if (Math.abs(joystick.y) > 0.05) direction.current.add(forwardVec.clone().multiplyScalar(joystick.y));
        if (Math.abs(joystick.x) > 0.05) direction.current.add(rightVec.clone().multiplyScalar(joystick.x));

        const currentSpeed = isCrouching ? CROUCH_SPEED : SPEED;
        if (direction.current.lengthSq() > 0) {
            direction.current.normalize().multiplyScalar(currentSpeed);
        }

        rigidBody.current.setLinvel({
            x: direction.current.x,
            y: vel.y,
            z: direction.current.z
        }, true);

        if ((jump || isJumping) && isGrounded && !isCrouching) {
            rigidBody.current.setLinvel({ x: vel.x, y: JUMP_FORCE, z: vel.z }, true);
            setIsGrounded(false);
        }

        // Sync Camera & Hammer
        const translation = rigidBody.current.translation();
        if (!isNaN(translation.x)) {
            const { shakeIntensity, shakeCamera } = useGameStore.getState();
            const cameraY = isCrouching ? -0.2 : 0.5;

            // Set Camera
            camera.position.set(
                translation.x + (Math.random() - 0.5) * shakeIntensity,
                translation.y + cameraY + (Math.random() - 0.5) * shakeIntensity,
                translation.z
            );

            // Immediately Sync Hammer to Camera
            if (hammerGroupRef.current) {
                hammerGroupRef.current.position.copy(camera.position);
                hammerGroupRef.current.quaternion.copy(camera.quaternion);
            }

            if (shakeIntensity > 0) shakeCamera(Math.max(0, shakeIntensity - delta * 0.5));
        }
    });

    // Initial Look-at Logic
    useEffect(() => {
        camera.lookAt(0, 2, 0); // Look at the horizon/castle instead of the ground
    }, [camera]);

    return (
        <>
            <RigidBody
                ref={rigidBody}
                colliders={false}
                mass={1}
                type="dynamic"
                ccd
                position={[0, 2, 20]}
                enabledRotations={[false, false, false]}
                onCollisionEnter={() => setIsGrounded(true)}
                userData={{ isPlayer: true }}
            >
                <CapsuleCollider args={[isCrouching ? 0.2 : 0.5, 0.3]} />
            </RigidBody>
            <group ref={hammerGroupRef}>
                <Hammer ref={hammerRef} />
            </group>
            <PointerLockControls />
        </>
    );
};
