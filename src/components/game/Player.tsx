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

const JUMP_FORCE = 6;
const INITIAL_POS: [number, number, number] = [0, 2, 20];

export const Player = () => {
    const rigidBody = useRef<RapierRigidBody>(null);
    const hammerRef = useRef<HammerRef>(null);
    const [, get] = useKeyboardControls();
    const {
        joystick, isJumping, setCrouching, isCrouching,
        setAimedBlock, setXRayActive, touchDelta, setTouchDelta,
        lastSwingTime, resetTimestamp
    } = useGameStore();
    const { camera, scene, raycaster } = useThree();
    const { world, rapier } = useRapier();

    const direction = useRef(new THREE.Vector3());
    // isGrounded removed as it caused unnecessary re-renders

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
            if (e.code === 'ShiftLeft') setCrouching(false);
        };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        return () => {
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
        };
    }, [setXRayActive, setCrouching]);

    // Handle Swing from Store (Mobile/UI)
    useEffect(() => {
        if (lastSwingTime > 0) {
            handleSwing();
        }
    }, [lastSwingTime]);

    // Level Start Orientation Reset
    useEffect(() => {
        if (resetTimestamp > 0) {
            // Reset Velocity
            if (rigidBody.current) {
                rigidBody.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
                rigidBody.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
                rigidBody.current.setRotation({ w: 1, x: 0, y: 0, z: 0 }, true);
            }
            // Point Camera at Castle
            camera.position.set(0, 2, 20);
            camera.lookAt(0, 2, 0);
            // Also reset quaternion to avoid weirdness with PointerLockControls internal state
            camera.quaternion.setFromEuler(new THREE.Euler(0, Math.PI, 0, 'YXZ'));
        }
    }, [resetTimestamp, camera]);

    // Mouse Interaction (Desktop)
    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
            const isDesktop = !!document.pointerLockElement;

            if (e.button === 2) { // Right Click
                if (!isDesktop) return; // Right click grab only for mouse/desktop

                // Raycast to grab
                raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
                const intersects = raycaster.intersectObjects(scene.children, true);
                const hit = intersects.find(i => i.distance < 4 && i.object.userData.isBlock);

                if (hit) {
                    const blockId = hit.object.userData.id;
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
                if (isDesktop) handleSwing();
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

        // Grounding check using Raycast (more robust than collision events)
        const translation = rigidBody.current.translation();
        const rayOrigin = { x: translation.x, y: translation.y, z: translation.z };
        const rayDir = { x: 0, y: -1, z: 0 };
        const ray = new rapier.Ray(rayOrigin, rayDir);
        // Hráčova výška je cca 1.0 (0.5 nahoru/dolů). Raycast ze středu.
        // Correct castRay signature: ray, maxToi, solid, filterFlags, filterGroups, filterExcludeCollider, filterExcludeRigidBody
        const hit = world.castRay(ray, 2.0, true, undefined, undefined, undefined, rigidBody.current);

        // Handle potential property name differences in Rapier versions
        const toi = (hit as any)?.toi ?? (hit as any)?.timeOfImpact;

        const grounded = toi !== undefined && toi !== null && toi <= 1.1;
        // setIsGrounded(grounded); // Removed

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

        // Single velocity update to prevent horizontal movement from overriding vertical impulses
        const finalVel = {
            x: direction.current.x,
            y: vel.y,
            z: direction.current.z
        };

        if ((jump || isJumping) && grounded && !isCrouching) {
            finalVel.y = JUMP_FORCE;
            // setIsGrounded(false);
        }

        rigidBody.current.setLinvel(finalVel, true);

        // Sync Camera & Hammer
        if (!isNaN(translation.x)) {
            const { shakeIntensity, shakeCamera } = useGameStore.getState();
            const cameraY = isCrouching ? -0.2 : 0.5;

            // Set Camera with NaN safety
            if (!isNaN(translation.x) && !isNaN(translation.y) && !isNaN(translation.z) && !isNaN(shakeIntensity)) {
                camera.position.set(
                    translation.x + (Math.random() - 0.5) * shakeIntensity,
                    translation.y + cameraY + (Math.random() - 0.5) * shakeIntensity,
                    translation.z
                );
            }

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
                position={INITIAL_POS}
                enabledRotations={[false, false, false]}
                friction={0}
                userData={{ isPlayer: true }}
            >
                <CapsuleCollider args={[isCrouching ? 0.2 : 0.5, 0.3]} friction={0} />
            </RigidBody>
            <group ref={hammerGroupRef}>
                <Hammer ref={hammerRef} />
            </group>
            <PointerLockControls />
        </>
    );
};
