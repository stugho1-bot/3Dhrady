import { useState } from 'react';
import { useGameStore, getPasswordForLevel } from '../../store/useGameStore';

export const MainMenu = () => {
    const { startLevel } = useGameStore();
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleStart = () => {
        startLevel(1);
    };

    const handlePassword = () => {
        for (let i = 1; i <= 50; i++) {
            if (getPasswordForLevel(i) === password.trim()) {
                startLevel(i);
                return;
            }
        }
        setError("Invalid Password");
    };

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 50 }} className="bg-gradient-to-b from-black/60 via-transparent to-black/80 flex flex-col items-center justify-between text-white p-4">
            <div className="mt-20 text-center">
                <h1 className="text-4xl md:text-6xl font-bold mb-2 text-yellow-500 drop-shadow-[0_4px_4px_rgba(0,0,0,1)]">Hradní Bourač</h1>
                <p className="text-gray-300 drop-shadow-md pb-4">Destruction Physics Game</p>
            </div>

            <div className="flex flex-col items-center gap-6 mb-20 bg-black/40 p-8 rounded-xl backdrop-blur-md border border-white/10">
                <button
                    onClick={handleStart}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-12 rounded-lg text-xl shadow-lg active:scale-95 transition-transform w-full"
                >
                    START GAME
                </button>

                <div className="flex flex-col items-center gap-2 w-full">
                    <label className="text-gray-300 text-sm uppercase tracking-wide">Enter Level Password</label>
                    <div className="flex gap-2 w-full">
                        <input
                            type="text"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-gray-800/80 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:border-yellow-500 w-full font-mono text-center"
                            placeholder="heslo-..."
                        />
                        <button
                            onClick={handlePassword}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow active:scale-95"
                        >
                            LOAD
                        </button>
                    </div>
                </div>
                {error && <div className="text-red-500 font-bold bg-black/50 px-2 rounded animate-pulse">{error}</div>}
            </div>

            <div className="text-gray-400 text-xs text-center drop-shadow-md">
                Hint: Destroy the castle. Hit the <span className="text-green-400 font-bold">Green Portal</span> to advance. <br />
                Controls: WASD + Space (PC) or On-screen Joystick (Mobile).
            </div>
        </div>
    );
};
