import { useState, useEffect } from 'react';
import { useGameStore, getPasswordForLevel } from '../../store/useGameStore';

export const MainMenu = () => {
    const { startLevel, lastUnlockedPassword, setStatus, resetTimestamp } = useGameStore();
    const isGameActive = resetTimestamp > 0;
    const [password, setPassword] = useState(lastUnlockedPassword || "");
    const [error, setError] = useState("");
    const [showPasswordInput, setShowPasswordInput] = useState(false);

    useEffect(() => {
        setPassword(lastUnlockedPassword || "");
    }, [lastUnlockedPassword]);

    const handleStart = () => {
        startLevel(1);
    };

    const handleContinue = () => {
        for (let i = 1; i <= 50; i++) {
            if (getPasswordForLevel(i) === password.trim()) {
                startLevel(i);
                return;
            }
        }
        setError("Neplatné heslo");
    };

    return (
        <div className="absolute inset-0 z-50 bg-gradient-to-br from-slate-950 via-black to-slate-900 flex flex-col items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full flex flex-col gap-12 animate-in fade-in zoom-in duration-700">
                {/* Logo & Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 to-orange-600 drop-shadow-2xl uppercase tracking-tighter italic">
                        HRADNÍ<br />BOUŘAČ
                    </h1>
                    <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-xs">Simulátor destrukce hradů</p>
                </div>

                {/* Menu Options */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleStart}
                        className="group relative bg-white text-black font-black py-5 rounded-2xl text-2xl uppercase shadow-[0_10px_40px_rgba(255,255,255,0.1)] hover:shadow-[0_15px_60px_rgba(255,255,255,0.2)] hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all overflow-hidden"
                    >
                        <span className="relative z-10">Nová hra</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </button>

                    {isGameActive && (
                        <button
                            onClick={() => setStatus('PLAYING')}
                            className="group relative bg-cyan-500 text-black font-black py-4 rounded-2xl text-xl uppercase shadow-[0_10px_40px_rgba(0,255,255,0.1)] hover:shadow-[0_15px_60px_rgba(0,255,255,0.2)] hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all overflow-hidden"
                        >
                            <span className="relative z-10">Zpět do hry</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </button>
                    )}

                    <div className="flex flex-col gap-2">
                        {!showPasswordInput ? (
                            <button
                                onClick={() => setShowPasswordInput(true)}
                                className="bg-white/5 border border-white/10 text-white font-black py-4 rounded-xl text-xl uppercase hover:bg-white/10 active:scale-95 transition-all text-center"
                            >
                                Pokračovat
                            </button>
                        ) : (
                            <div className="flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex gap-2 bg-black/40 p-2 rounded-xl border border-white/10">
                                    <input
                                        type="text"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value.toLowerCase());
                                            setError("");
                                        }}
                                        className="bg-transparent text-center text-xl p-2 text-white focus:outline-none flex-1 font-mono uppercase placeholder-white/5"
                                        placeholder="Zadej heslo..."
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleContinue}
                                        className="bg-cyan-500 hover:bg-cyan-600 text-black font-black px-4 py-2 rounded-lg uppercase transition-colors"
                                    >
                                        Vstoupit
                                    </button>
                                </div>
                                {error && <div className="text-red-500 text-xs font-bold text-center uppercase tracking-widest">{error}</div>}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <button
                            onClick={() => setStatus('LEVEL_COMPLETE')} // This is a hack to show leaderboard screen, or we can add a specific screen
                            className="bg-black/20 border border-white/5 text-white/60 font-black py-3 rounded-xl uppercase tracking-widest text-xs hover:bg-white/5 transition-all"
                        >
                            Žebříčky
                        </button>
                        <button
                            className="bg-black/20 border border-white/5 text-white/60 font-black py-3 rounded-xl uppercase tracking-widest text-xs hover:bg-white/5 transition-all"
                        >
                            Nastavení
                        </button>
                    </div>

                    <a
                        href="https://donate-link"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 text-center text-[10px] font-bold text-white/20 uppercase tracking-[0.5em] hover:text-white/40 transition-colors"
                    >
                        Příspěvek na vývoj (Donate)
                    </a>
                </div>

                {/* Footer Info */}
                <div className="text-center">
                    <div className="text-[10px] font-bold text-white/10 uppercase tracking-widest">
                        Znič hrad a najdi zelený portál k postupu.
                    </div>
                </div>
            </div>
        </div>
    );
};
