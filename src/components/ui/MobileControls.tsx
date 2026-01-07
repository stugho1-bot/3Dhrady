import { useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';

export const MobileControls = () => {
    const { setJoystick, setJumping, setTouchDelta, triggerSwing } = useGameStore();
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [touchId, setTouchId] = useState<number | null>(null);
    const center = useRef({ x: 0, y: 0 });
    const maxRadius = 50;

    // Camera Touchpad State
    const lastTouch = useRef<{ x: number, y: number } | null>(null);

    return (
        <div className="fixed inset-0 pointer-events-none select-none touch-none">
            {/* Camera Touchpad (Right Half) */}
            <div
                className="absolute top-0 right-0 w-1/2 h-full pointer-events-auto touch-none"
                onTouchStart={(e) => {
                    const touch = e.targetTouches[0];
                    lastTouch.current = { x: touch.clientX, y: touch.clientY };
                    // Swing trigger on tap/start
                    triggerSwing();
                }}
                onTouchMove={(e) => {
                    if (!lastTouch.current) return;
                    const touch = e.targetTouches[0];
                    const dx = touch.clientX - lastTouch.current.x;
                    const dy = touch.clientY - lastTouch.current.y;

                    // Sensitivity factor
                    const sensitivity = 0.5;
                    setTouchDelta(dx * sensitivity, dy * sensitivity);

                    lastTouch.current = { x: touch.clientX, y: touch.clientY };
                }}
                onTouchEnd={() => {
                    lastTouch.current = null;
                }}
            />

            {/* Joystick Area */}
            <div
                className="absolute bottom-10 left-10 w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm border-2 border-white/20 touch-none flex items-center justify-center pointer-events-auto"
                onTouchStart={(e) => {
                    e.preventDefault(); // Prevent accidental swings/scrolls
                    const touch = e.changedTouches[0];
                    setTouchId(touch.identifier);
                    const rect = e.currentTarget.getBoundingClientRect();
                    center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                }}
                onTouchMove={(e) => {
                    e.preventDefault();
                    for (let i = 0; i < e.changedTouches.length; i++) {
                        if (e.changedTouches[i].identifier === touchId) {
                            const touch = e.changedTouches[i];
                            const dx = touch.clientX - center.current.x;
                            const dy = touch.clientY - center.current.y;
                            const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxRadius);
                            const angle = Math.atan2(dy, dx);
                            const x = Math.cos(angle) * dist;
                            const y = Math.sin(angle) * dist;
                            setPosition({ x, y });
                            setJoystick(x / maxRadius, -y / maxRadius);
                        }
                    }
                }}
                onTouchEnd={() => {
                    setTouchId(null);
                    setPosition({ x: 0, y: 0 });
                    setJoystick(0, 0);
                }}
            >
                {/* Stick */}
                <div
                    className="w-12 h-12 bg-white/50 rounded-full shadow-lg"
                    style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
                />
            </div>

            {/* Jump Button */}
            <button
                className="absolute bottom-10 right-10 w-20 h-20 bg-white/20 rounded-full backdrop-blur-sm border-2 border-white/20 active:bg-white/40 touch-none pointer-events-auto flex items-center justify-center font-bold text-white select-none z-10"
                onTouchStart={(e) => {
                    e.preventDefault();
                    setJumping(true);
                }}
                onTouchEnd={(e) => {
                    e.preventDefault();
                    setJumping(false);
                }}
            >
                JUMP
            </button>
        </div>
    );
};
