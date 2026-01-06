import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { KeyboardControls } from "@react-three/drei";
import type { KeyboardControlsEntry } from "@react-three/drei";
import { World } from "./components/game/World";
import { Player } from "./components/game/Player";
import { Castle } from "./components/game/Castle";
import { MenuCamera } from "./components/game/MenuCamera";
import { MobileControls } from "./components/ui/MobileControls";
import { HUD } from "./components/ui/HUD";
import { MainMenu } from "./components/ui/MainMenu";
import { LevelComplete, GameOver } from "./components/ui/LevelScreens";
import { Suspense, useMemo } from "react";
import { useGameStore } from "./store/useGameStore";

const Controls = {
  forward: "forward",
  back: "back",
  left: "left",
  right: "right",
  jump: "jump",
} as const;

type ControlsEnum = keyof typeof Controls;

function Scene() {
  const { status } = useGameStore();
  const levelKey = useGameStore(state => state.resetTimestamp);

  return (
    <Suspense fallback={null}>
      <color attach="background" args={['#000000']} />
      <Physics gravity={[0, -9.81, 0]}>
        <group key={levelKey}>
          <World />
          {status === 'PLAYING' && <Player />}
          <Castle />
          {status === 'MENU' && <MenuCamera />}
        </group>
      </Physics>
    </Suspense>
  );
}

function UI() {
  const { status } = useGameStore();

  if (status === 'MENU') return <MainMenu />;
  if (status === 'LEVEL_COMPLETE') return <LevelComplete />;
  if (status === 'GAME_OVER') return <GameOver />;

  if (status === 'PLAYING') {
    return (
      <div
        id="game-ui-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 9999
        }}
      >
        <HUD />

        {/* Mobile controls need pointer events */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            pointerEvents: 'none'
          }}
        >
          <div className="block md:hidden" style={{ pointerEvents: 'auto' }}>
            <MobileControls />
          </div>
        </div>

        {/* Diagnostic Watermark */}
        <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.2)', fontSize: '10px', textTransform: 'uppercase' }}>
          Hradní Bourač UI ACTIVE
        </div>
      </div>
    );
  }
  return null;
}

function App() {
  const { graphicsQuality } = useGameStore();

  const map = useMemo<KeyboardControlsEntry<ControlsEnum>[]>(() => [
    { name: Controls.forward, keys: ["ArrowUp", "w", "W"] },
    { name: Controls.back, keys: ["ArrowDown", "s", "S"] },
    { name: Controls.left, keys: ["ArrowLeft", "a", "A"] },
    { name: Controls.right, keys: ["ArrowRight", "d", "D"] },
    { name: Controls.jump, keys: ["Space"] },
  ], []);

  const dpr: [number, number] = graphicsQuality === 'high' ? [1, 2] : (graphicsQuality === 'medium' ? [1, 1.5] : [1, 1]);

  return (
    <div className="w-full h-screen bg-black select-none font-sans relative overflow-hidden">
      <KeyboardControls map={map}>
        <Canvas
          shadows={graphicsQuality !== 'low'}
          camera={{ fov: 60 }}
          dpr={dpr}
          style={{ width: '100%', height: '100%' }}
          gl={{ antialias: graphicsQuality !== 'low' }}
        >
          <Scene />
        </Canvas>
      </KeyboardControls>

      <UI />
    </div>
  );
}

export default App;
