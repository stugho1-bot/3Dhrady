import { useGameStore, getPasswordForLevel, getLevelName } from "../../store/useGameStore";
import { useEffect, useState } from "react";

export const LevelComplete = () => {
    const {
        level, startLevel, saveScore,
        localLeaderboard, globalLeaderboard, isLoadingGlobal,
        loadLeaderboard, playerName: storedName, setPlayerName,
        startTime, blocksDestroyed
    } = useGameStore();

    const [playerName, setPlayerNameState] = useState(storedName || "");
    const [submitted, setSubmitted] = useState(false);
    const [activeTab, setActiveTab] = useState<'local' | 'global'>('local');

    useEffect(() => {
        loadLeaderboard();
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }, [loadLeaderboard]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = playerName.trim();
        if (trimmedName) {
            saveScore(trimmedName);
            setPlayerName(trimmedName);
            setSubmitted(true);
        }
    };

    const nextPassword = getPasswordForLevel(level + 1);
    const displayedLeaderboard = activeTab === 'local' ? localLeaderboard : globalLeaderboard;

    return (
        <div className="absolute inset-0 flex items-center justify-center p-2 md:p-6 z-[100] bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="w-full max-w-2xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl md:rounded-3xl p-4 md:p-8 flex flex-col gap-4 md:gap-6 shadow-2xl my-auto">

                {/* Header & Stats - Compact for Mobile */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-center md:text-left">
                        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-orange-600 tracking-tighter uppercase">
                            {getLevelName(level)}
                        </h1>
                        <div className="text-[10px] md:text-sm font-bold text-white/40 tracking-[0.2em] uppercase">Level Completed</div>
                    </div>

                    <div className="flex gap-2 md:gap-3">
                        <div className="bg-white/5 px-3 py-1 md:px-4 md:py-2 rounded-xl border border-white/5 text-center">
                            <div className="text-[8px] font-bold text-white/30 uppercase">Final Time</div>
                            <div className="text-sm md:text-xl font-black text-cyan-400">
                                {Math.max(0.1, ((Date.now() - startTime) / 1000) - Math.floor(blocksDestroyed / 10)).toFixed(1)}s
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                    {/* Left Column: Form / Password */}
                    <div className="flex flex-col gap-4 justify-center">
                        {!submitted ? (
                            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                                <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                                    <label className="block text-[10px] font-bold text-white/40 mb-2 uppercase tracking-widest text-center">Enter the Hall of Fame</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="YOUR NAME"
                                        className="w-full bg-transparent border-b border-white/20 text-center text-xl md:text-2xl p-1 text-white focus:outline-none focus:border-yellow-400 placeholder-white/5 uppercase font-black"
                                        value={playerName}
                                        onChange={(e) => setPlayerNameState(e.target.value.toUpperCase())}
                                        maxLength={12}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!playerName.trim()}
                                    className="w-full bg-yellow-500 text-black font-black py-3 rounded-xl uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-20"
                                >
                                    Save Record
                                </button>
                            </form>
                        ) : (
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                                <div className="text-[10px] font-bold text-white/40 mb-1 uppercase tracking-widest">Next Level Passcode</div>
                                <div className="text-xl md:text-3xl font-black text-cyan-400 tracking-widest font-mono">
                                    {nextPassword}
                                </div>
                            </div>
                        )}

                        <button
                            className="w-full bg-white text-black text-lg md:text-xl font-black py-3 md:py-4 rounded-xl uppercase tracking-widest hover:bg-gray-200 transition-all"
                            onClick={() => startLevel(level + 1)}
                        >
                            Continue
                        </button>
                    </div>

                    {/* Right Column: Leaderboards with Tabs */}
                    <div className="bg-black/40 rounded-xl border border-white/10 flex flex-col overflow-hidden min-h-[180px] md:min-h-[250px]">
                        <div className="flex border-b border-white/10">
                            <button
                                onClick={() => setActiveTab('local')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'local' ? 'bg-white/10 text-yellow-400' : 'text-white/30 hover:text-white/60'}`}
                            >
                                Local
                            </button>
                            <button
                                onClick={() => setActiveTab('global')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'global' ? 'bg-white/10 text-cyan-400' : 'text-white/30 hover:text-white/60'}`}
                            >
                                Global
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-1.5">
                            {activeTab === 'global' && isLoadingGlobal && (
                                <div className="h-full flex items-center justify-center text-white/20 text-xs italic animate-pulse">Syncing legends...</div>
                            )}

                            {(!isLoadingGlobal || activeTab === 'local') && displayedLeaderboard.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-white/10 text-xs italic">No records found</div>
                            ) : (
                                displayedLeaderboard.map((entry, i) => (
                                    <div key={i} className={`flex justify-between items-center p-2 rounded-lg ${entry.name === playerName && submitted ? 'bg-yellow-400/20' : 'bg-white/5'}`}>
                                        <div className="flex gap-3 items-center">
                                            <span className={`text-xs font-black ${i === 0 ? 'text-yellow-400' : 'text-white/20'}`}>#{i + 1}</span>
                                            <span className="font-bold text-white text-xs md:text-sm uppercase">{entry.name}</span>
                                        </div>
                                        <div className="flex gap-3 text-[10px] md:text-xs">
                                            <span className="text-white/30">LVL {entry.level}</span>
                                            <span className="font-mono text-cyan-400/80">{Math.floor(entry.time / 60)}:{(Math.floor(entry.time) % 60).toString().padStart(2, '0')}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
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
