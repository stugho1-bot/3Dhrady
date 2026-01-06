import { useGameStore, getPasswordForLevel, getLevelName } from "../../store/useGameStore";
import { useEffect, useState } from "react";

export const LevelComplete = () => {
    const { level, startLevel, saveScore, leaderboard, loadLeaderboard, playerName: storedName, setPlayerName, startTime, blocksDestroyed } = useGameStore();
    const [playerName, setPlayerNameState] = useState(storedName || "");
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        loadLeaderboard();
        // Force unlock cursor for UI interaction
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }, [loadLeaderboard]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = playerName.trim();
        if (trimmedName) {
            saveScore(trimmedName);
            setPlayerName(trimmedName); // Persist for next time
            setSubmitted(true);
        }
    };

    const nextPassword = getPasswordForLevel(level + 1);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-[100] bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
            <div className="w-full max-w-xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 flex flex-col items-center gap-8 shadow-2xl">

                {/* Header */}
                <div className="text-center">
                    <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-orange-600 drop-shadow-sm uppercase tracking-tighter">
                        {getLevelName(level)}
                    </h1>
                    <div className="text-xl font-bold text-white/50 tracking-[0.2em] uppercase mt-2">Mission Accomplished</div>
                </div>

                {/* Stats Breakdown */}
                <div className="w-full grid grid-cols-3 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                        <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">Base Time</div>
                        <div className="text-2xl font-black text-white">{((Date.now() - startTime) / 1000).toFixed(1)}s</div>
                    </div>
                    <div className="bg-yellow-400/10 p-4 rounded-2xl border border-yellow-400/20 text-center">
                        <div className="text-[10px] font-bold text-yellow-500/60 uppercase tracking-[0.2em] mb-1">Bonus</div>
                        <div className="text-2xl font-black text-yellow-400">-{Math.floor(blocksDestroyed / 10)}s</div>
                    </div>
                    <div className="bg-cyan-400/10 p-4 rounded-2xl border border-cyan-400/20 text-center">
                        <div className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-[0.2em] mb-1">Final</div>
                        <div className="text-2xl font-black text-cyan-400">{Math.max(0.1, ((Date.now() - startTime) / 1000) - Math.floor(blocksDestroyed / 10)).toFixed(1)}s</div>
                    </div>
                </div>

                {/* Score Section */}
                {!submitted ? (
                    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
                        <div className="bg-black/40 p-6 rounded-2xl border border-white/10">
                            <label className="block text-xs font-bold text-white/40 mb-3 uppercase tracking-widest text-center">Hall of Fame</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="YOUR NAME"
                                className="w-full bg-transparent border-b-2 border-white/20 text-center text-3xl p-2 text-white focus:outline-none focus:border-yellow-400 placeholder-white/10 uppercase font-black"
                                value={playerName}
                                onChange={(e) => setPlayerNameState(e.target.value.toUpperCase())}
                                maxLength={12}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!playerName.trim()}
                            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-black py-4 rounded-xl uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:hover:scale-100"
                        >
                            Save Record
                        </button>
                    </form>
                ) : (
                    <div className="w-full bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
                        <div className="text-xs font-bold text-white/40 mb-2 uppercase tracking-widest">Next Level Passcode</div>
                        <div className="text-4xl font-black text-cyan-400 tracking-wider font-mono">
                            {nextPassword}
                        </div>
                    </div>
                )}

                {/* Leaderboard */}
                <div className="w-full bg-black/40 rounded-2xl border border-white/10 overflow-hidden">
                    <div className="bg-white/10 p-3 text-center text-xs font-bold text-white/60 uppercase tracking-widest border-b border-white/10">
                        Top Rankers
                    </div>
                    <div className="max-h-48 overflow-y-auto p-4 space-y-2">
                        {leaderboard.length === 0 ? (
                            <div className="text-center text-white/20 py-4 italic">No legends yet...</div>
                        ) : (
                            leaderboard.map((entry, i) => (
                                <div key={i} className={`flex justify-between items-center p-3 rounded-lg ${entry.name === playerName && submitted ? 'bg-yellow-400/20 border border-yellow-400/30' : 'bg-white/5'}`}>
                                    <div className="flex gap-4 items-center">
                                        <span className={`text-lg font-black ${i === 0 ? 'text-yellow-400' : 'text-white/40'}`}>#{i + 1}</span>
                                        <span className="font-bold text-white text-lg">{entry.name}</span>
                                    </div>
                                    <div className="flex gap-4 text-white/60 font-medium">
                                        <span className="text-cyan-400/80">LVL {entry.level}</span>
                                        <span className="font-mono text-white/80">{Math.floor(entry.time / 60)}:{(Math.floor(entry.time) % 60).toString().padStart(2, '0')}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Action Button */}
                <button
                    className="w-full bg-white text-black text-2xl font-black py-5 rounded-2xl shadow-[0_10px_30px_rgba(255,255,255,0.1)] hover:shadow-[0_15px_40px_rgba(255,255,255,0.2)] hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all uppercase tracking-widest"
                    onClick={() => {
                        startLevel(level + 1);
                    }}
                >
                    Continue to Next Hrad
                </button>
            </div>
        </div>
    );
};

export const GameOver = () => {
    const { startLevel } = useGameStore();

    useEffect(() => {
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }, []);

    return (
        <div className="absolute inset-0 bg-red-950/90 backdrop-blur-lg flex items-center justify-center p-6 z-[100] animate-in fade-in zoom-in duration-300">
            <div className="max-w-md w-full bg-white/5 border border-red-500/20 rounded-[2rem] p-12 flex flex-col items-center text-center gap-8 shadow-2xl">
                <div className="relative">
                    <h1 className="text-6xl font-black text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)] uppercase italic tracking-tighter">
                        Crushed!
                    </h1>
                    <div className="absolute -top-4 -right-4 bg-red-500 text-black px-2 py-1 text-xs font-black uppercase rounded transform rotate-12">Ouch</div>
                </div>

                <p className="text-white/60 font-medium">Your demolition career came to an abrupt end. Try again?</p>

                <button
                    className="w-full bg-white text-black text-2xl font-black py-5 rounded-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest shadow-xl"
                    onClick={() => {
                        startLevel(1);
                    }}
                >
                    Try Again
                </button>
            </div>
        </div>
    );
};
