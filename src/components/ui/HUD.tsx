import { useGameStore, getLevelName } from "../../store/useGameStore";
import { useState, useEffect } from "react";

export const HUD = () => {
    const {
        score, level, startTime, blocksDestroyed, totalBlocks,
        graphicsQuality, setGraphicsQuality,
        showFPS, toggleFPS
    } = useGameStore();

    const [timeStr, setTimeStr] = useState("00:00");
    const [showMessage, setShowMessage] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [fps, setFps] = useState(0);

    // Timer Logic
    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const s = (elapsed % 60).toString().padStart(2, '0');
            setTimeStr(`${m}:${s}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    // Level Start Message logic
    useEffect(() => {
        setShowMessage(true);
        const timer = setTimeout(() => setShowMessage(false), 5000);
        return () => clearTimeout(timer);
    }, [level]);

    const [fpsStats, setFpsStats] = useState({ min: 999, max: 0, avg: 0, totalFrames: 0, sumFps: 0 });

    // FPS Counter logic
    useEffect(() => {
        if (!showFPS) return;
        let frameCount = 0;
        let lastTime = performance.now();
        let raf: number;

        const update = () => {
            frameCount++;
            const now = performance.now();
            if (now >= lastTime + 1000) {
                const currentFps = Math.round((frameCount * 1000) / (now - lastTime));
                setFps(currentFps);

                setFpsStats(prev => {
                    const newMin = Math.min(prev.min, currentFps);
                    const newMax = Math.max(prev.max, currentFps);
                    const newTotalFrames = prev.totalFrames + 1;
                    const newSumFps = prev.sumFps + currentFps;
                    return {
                        min: newMin === 999 ? currentFps : newMin,
                        max: newMax,
                        totalFrames: newTotalFrames,
                        sumFps: newSumFps,
                        avg: Math.round(newSumFps / newTotalFrames)
                    };
                });

                frameCount = 0;
                lastTime = now;
            }
            raf = requestAnimationFrame(update);
        };
        raf = requestAnimationFrame(update);
        return () => cancelAnimationFrame(raf);
    }, [showFPS]);

    // Styles
    const containerStyle: React.CSSProperties = {
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        pointerEvents: 'none', fontFamily: 'monospace', color: 'white'
    };

    const metricStyle: React.CSSProperties = {
        background: 'rgba(0, 0, 0, 0.7)', padding: '5px 12px', borderRadius: '5px',
        border: '1px solid rgba(255, 255, 255, 0.2)', fontSize: '14px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)', pointerEvents: 'auto'
    };

    const buttonStyle: React.CSSProperties = {
        background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.3)',
        padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', pointerEvents: 'auto'
    };

    const modalStyle: React.CSSProperties = {
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.9)', padding: '30px', borderRadius: '15px',
        border: '2px solid rgba(255, 255, 255, 0.2)', pointerEvents: 'auto',
        display: 'flex', flexDirection: 'column', gap: '15px', minWidth: '300px',
        boxShadow: '0 0 50px rgba(0,0,0,0.8)', zIndex: 20000
    };

    return (
        <div id="hud-container" style={containerStyle}>
            {/* FPS Counter */}
            {showFPS && (
                <div style={{
                    position: 'absolute', top: '10px', right: '10px',
                    color: '#00ff00', fontSize: '10px', textAlign: 'right',
                    background: 'rgba(0,0,0,0.5)', padding: '5px', borderRadius: '4px'
                }}>
                    <div>FPS: {fps}</div>
                    <div style={{ opacity: 0.7 }}>
                        MIN: {fpsStats.min} MAX: {fpsStats.max}<br />
                        AVG: {fpsStats.avg}
                    </div>
                </div>
            )}

            {/* Level Start Message */}
            {showMessage && (
                <div style={{
                    position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0, 255, 68, 0.2)', border: '2px solid #00FF44',
                    padding: '15px 40px', borderRadius: '50px', backdropFilter: 'blur(10px)',
                    fontSize: '24px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    animation: 'pulse 2s infinite'
                }}>
                    Najdi a znič zelenou kostku! 💚
                </div>
            )}

            {/* Hrad Name, Settings, Retry & Metrics - Top Left */}
            <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'auto' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={metricStyle}>{getLevelName(level)}</div>
                    <button style={buttonStyle} onClick={() => setShowSettings(true)}>⚙️</button>
                </div>
                {/* Retry Level Button moved here for better mobile reach/UX */}
                <button
                    style={{
                        background: 'rgba(153, 0, 0, 0.8)', color: 'white', fontWeight: 'bold',
                        padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.3)',
                        cursor: 'pointer', textTransform: 'uppercase', width: 'fit-content', fontSize: '12px'
                    }}
                    onClick={() => {
                        const state = useGameStore.getState();
                        state.startLevel(state.level);
                    }}
                >
                    RETRY LEVEL
                </button>

                {/* Moved Metrics Group: Time, Blocks, Score */}
                <div id="hud-metrics-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
                    <div style={metricStyle}>⏰ TIME: {timeStr}</div>
                    <div style={metricStyle}>🧱 BLOCKS: {blocksDestroyed || 0}/{totalBlocks || 0}</div>
                    <div style={metricStyle}>🏆 SCORE: {score || 0}</div>
                </div>
            </div>

            {/* Crosshair */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyItems: 'center', opacity: 0.6 }}>
                <div style={{ position: 'absolute', width: '2px', height: '100%', background: 'white' }} />
                <div style={{ position: 'absolute', width: '100%', height: '2px', background: 'white' }} />
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div id="settings-modal" style={modalStyle}>
                    <h2 style={{ fontSize: '20px', marginBottom: '10px', textAlign: 'center' }}>NASTAVENÍ</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <span>Kvalita grafiky:</span>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            {(['low', 'medium', 'high'] as const).map(q => (
                                <button
                                    key={q}
                                    style={{ ...buttonStyle, flex: 1, background: graphicsQuality === q ? '#00FF44' : 'rgba(255,255,255,0.1)', color: graphicsQuality === q ? 'black' : 'white' }}
                                    onClick={() => setGraphicsQuality(q)}
                                >
                                    {q.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Zobrazit FPS:</span>
                        <button style={buttonStyle} onClick={toggleFPS}>
                            {showFPS ? 'ZAPNUTO' : 'VYPNUTO'}
                        </button>
                    </div>

                    <p style={{ fontSize: '10px', color: '#888', marginTop: '10px' }}>
                        HINT: Shift+T aktivuje průhlednost hradu (X-Ray).
                    </p>

                    <button
                        style={{ ...buttonStyle, background: '#444', marginTop: '10px' }}
                        onClick={() => setShowSettings(false)}
                    >
                        ZAVŘÍT
                    </button>
                </div>
            )}
        </div>
    );
};
