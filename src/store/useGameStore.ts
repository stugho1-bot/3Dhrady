import { create } from 'zustand';

export type GameStatus = 'MENU' | 'PLAYING' | 'LEVEL_COMPLETE' | 'GAME_OVER';

const LEVEL_PASSWORDS = [
    "", // Level 1 (No password)
    "hrad-dohor", "kozi-bradek", "ceske-peklo", "mistr-hnus", "prazska-zrizenina",
    "bouchly-buchlov", "shnila-slepice", "tupy-taran", "kriva-kuna", "mokry-mnich",
    "plesiva-panna", "blba-baba", "curavy-dzban", "rezava-repa", "smradlavy-sejra",
    "mastny-mec", "derava-zed", "liny-lord", "tlusty-troll", "vypity-vinar",
    "hnusny-hrnec", "stary-strep", "kousavy-kral", "opila-opice", "padla-pavlace",
    "spalena-slama", "ujeta-uzda", "velky-vopruz", "zbytecna-zbroj", "bida-v-boude",
    "cernej-coud", "drsnej-deda", "falesnej-flak", "gumovej-gulas", "hladovej-hroch",
    "jarni-jitrnice", "krasnej-ksicht", "modra-mrkev", "nocni-nemehlo", "ostra-omacka",
    "pevna-pudink", "rychlej-rypak", "slanej-spanek", "trapnej-triumf", "ubohy-uhel",
    "vtipny-vezen", "zvadla-zmije", "bily-bubak", "cely-cibule", "divny-dedek"
];

export const getPasswordForLevel = (level: number) => {
    if (level <= 1) return "";
    return LEVEL_PASSWORDS[level - 1] || "";
};

export const getLevelName = (level: number) => {
    const castleNum = Math.ceil(level / 5);
    const variantChar = String.fromCharCode(65 + ((level - 1) % 5));
    return `Hrad ${castleNum}-${variantChar}`;
};

interface GameState {
    score: number;
    level: number;
    status: GameStatus;
    blocksDestroyed: number;
    playerName: string;
    isCrouching: boolean;
    aimedBlockId: string | null;

    addScore: (amount: number) => void;
    resetGame: (fullReset?: boolean) => void;
    startLevel: (level?: number) => void;
    setStatus: (status: GameStatus) => void;
    incBlocksDestroyed: () => void;

    resetTimestamp: number;

    // Timer & Leaderboard
    startTime: number;
    leaderboard: {
        name: string;
        time: number;
        level: number;
        baseTime?: number;
        bonus?: number;
        blocksDestroyed?: number;
        date?: string;
    }[];

    // Mobile Controls
    joystick: { x: number; y: number };
    isJumping: boolean;
    touchDelta: { x: number; y: number };

    setJoystick: (x: number, y: number) => void;
    setJumping: (jumping: boolean) => void;
    setTouchDelta: (x: number, y: number) => void;

    saveScore: (name: string) => void;
    loadLeaderboard: () => void;

    // Camera Shake
    shakeIntensity: number;
    shakeCamera: (intensity: number) => void;

    // Cheats & Settings
    isXRayActive: boolean;
    setXRayActive: (active: boolean) => void;
    graphicsQuality: 'low' | 'medium' | 'high';
    setGraphicsQuality: (quality: 'low' | 'medium' | 'high') => void;
    showFPS: boolean;
    toggleFPS: () => void;

    // Player Persistence
    setPlayerName: (name: string) => void;

    // Interaction & Mechanics
    setCrouching: (crouching: boolean) => void;
    setAimedBlock: (id: string | null) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
    score: 0,
    level: 1,
    status: 'MENU',
    resetTimestamp: 0,
    startTime: Date.now(),
    blocksDestroyed: 0,
    leaderboard: [],

    addScore: (amount: number) => set((state) => ({ score: state.score + amount })),

    resetGame: (fullReset = false) => set((state) => ({
        score: fullReset ? 0 : state.score,
        level: fullReset ? 1 : state.level,
        status: 'PLAYING',
        resetTimestamp: Date.now(),
        startTime: fullReset ? Date.now() : state.startTime,
        blocksDestroyed: 0
    })),

    startLevel: (level) => set((state) => ({
        level: level || state.level,
        status: 'PLAYING',
        resetTimestamp: Date.now(),
        startTime: Date.now(),
        blocksDestroyed: 0
    })),

    setStatus: (status) => set({ status }),

    incBlocksDestroyed: () => set((state) => ({ blocksDestroyed: (state.blocksDestroyed || 0) + 1 })),

    joystick: { x: 0, y: 0 },
    isJumping: false,
    setJoystick: (x, y) => set({ joystick: { x, y } }),
    setJumping: (jumping) => set({ isJumping: jumping }),
    touchDelta: { x: 0, y: 0 },
    setTouchDelta: (x, y) => set({ touchDelta: { x, y } }),

    loadLeaderboard: () => {
        try {
            const data = localStorage.getItem('castle_crusher_leaderboard');
            if (data) {
                set({ leaderboard: JSON.parse(data) });
            }
        } catch (e) {
            console.error("Failed to load leaderboard", e);
        }
    },

    shakeIntensity: 0,
    shakeCamera: (intensity: number) => set({ shakeIntensity: intensity }),

    // Cheats & Settings
    isXRayActive: false,
    setXRayActive: (active: boolean) => set({ isXRayActive: active }),
    graphicsQuality: 'high',
    setGraphicsQuality: (quality) => set({ graphicsQuality: quality }),
    showFPS: false,
    toggleFPS: () => set((state) => ({ showFPS: !state.showFPS })),

    playerName: localStorage.getItem('castle_crusher_player_name') || '',
    setPlayerName: (name: string) => {
        localStorage.setItem('castle_crusher_player_name', name);
        set({ playerName: name });
    },

    isCrouching: false,
    setCrouching: (crouching) => set({ isCrouching: crouching }),
    aimedBlockId: null,
    setAimedBlock: (id) => set({ aimedBlockId: id }),

    saveScore: (name: string) => {
        const { level, startTime, blocksDestroyed, leaderboard } = get();
        const baseTime = (Date.now() - startTime) / 1000;
        const bonus = Math.floor(blocksDestroyed / 10);
        const finalTime = Math.max(0.1, baseTime - bonus);

        const newEntry = {
            name,
            time: finalTime,
            baseTime,
            bonus,
            blocksDestroyed,
            level,
            date: new Date().toISOString()
        };
        const newLeaderboard = [...leaderboard, newEntry]
            .sort((a, b) => b.level - a.level || a.time - b.time)
            .slice(0, 10);

        set({ leaderboard: newLeaderboard });
        localStorage.setItem('castle_crusher_leaderboard', JSON.stringify(newLeaderboard));
    },
}));
