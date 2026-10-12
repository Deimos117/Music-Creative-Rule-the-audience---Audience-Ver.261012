/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ach1 from '@/images/Achimage1.jpg';
import ach2 from '@/images/Achimage2.jpg';
import ach3 from '@/images/Achimage3.jpg';
import ach4 from '@/images/Achimage4.jpg';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

type Mode = 'participate' | 'rapid';

interface Achievement {
  threshold: number;
  icon: string;
  title: string;
  desc: string;
}

const ACHIEVEMENTS: Record<number, Achievement> = {
  100: {
    threshold: 100,
    icon: ach1,
    title: '업적 달성!',
    desc: '참여 안해주시나요..?',
  },
  200: {
    threshold: 200,
    icon: ach2,
    title: '업적 달성!',
    desc: '모해..',
  },
  300: {
    threshold: 300,
    icon: ach3,
    title: '업적 달성!',
    desc: '참여 안해주시나요..?',
  },
  400: {
    threshold: 400,
    icon: ach4,
    title: '업적 달성!',
    desc: '...',
  },
  500: {
    threshold: 500,
    icon: ach4,
    title: '업적 달성!',
    desc: '나중에 저랑 이야기 좀 합시다.',
  },
};

export default function App() {
  const [mode, setMode] = useState<Mode>('participate');
  const [isDone, setIsDone] = useState(false);
  const [isRapidPressed, setIsRapidPressed] = useState(false);
  const [rapidCount, setRapidCount] = useState(0);
  const [dps, setDps] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Achievement slide popup states
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  const [isSlideVisible, setIsSlideVisible] = useState(false);
  const unlockedThresholdsRef = useRef<Set<number>>(new Set());
  const slideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clickTimestampsRef = useRef<number[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Initialize Web Audio Context for 8-bit sound fx on user gesture
  const play8BitDropSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // 8-bit retro punchy synth kick / drop sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Audio autoplay or web audio restriction fallback - safe to ignore
    }
  }, []);

  // 8-bit Fanfare sound when achievement unlocked
  const playAchievementSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5 arpeggio
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.15);
      });
    } catch {
      // Ignore audio error
    }
  }, []);

  // Spawn 8-bit square dot monochrome particles on press
  const triggerParticles = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const count = mode === 'rapid' ? 10 : 26;
    const colors = ['#ffffff', '#e0e0e0', '#999999', '#ffffff'];
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const speed = 2.5 + Math.random() * 5;
      newParticles.push({
        id: Date.now() + i + Math.random(),
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() > 0.4 ? 6 : 4,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    setParticles((prev) => [...prev.slice(-30), ...newParticles]);
  }, [mode]);

  // Update particles loop
  useEffect(() => {
    if (particles.length === 0) return;
    const interval = requestAnimationFrame(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            alpha: p.alpha - 0.05,
          }))
          .filter((p) => p.alpha > 0)
      );
    });
    return () => cancelAnimationFrame(interval);
  }, [particles]);

  // DPS Calculation timer in rapid mode
  useEffect(() => {
    if (mode !== 'rapid') return;
    const timer = setInterval(() => {
      const now = performance.now();
      clickTimestampsRef.current = clickTimestampsRef.current.filter((t) => now - t <= 1000);
      setDps(clickTimestampsRef.current.length);
    }, 100);
    return () => clearInterval(timer);
  }, [mode]);

  // Check achievement milestones in rapid mode
  const triggerAchievement = useCallback((threshold: number) => {
    const ach = ACHIEVEMENTS[threshold];
    if (!ach) return;

    setActiveAchievement(ach);
    setIsSlideVisible(true);
    playAchievementSound();

    if (slideTimerRef.current) {
      clearTimeout(slideTimerRef.current);
    }

    slideTimerRef.current = setTimeout(() => {
      setIsSlideVisible(false);
    }, 3500);
  }, [playAchievementSound]);

  // Handle rapid mode press
  const handleRapidPress = useCallback(() => {
    setIsRapidPressed(true);
    const now = performance.now();
    clickTimestampsRef.current.push(now);

    setRapidCount((prev) => {
      const next = prev + 1;

      // Check achievement thresholds (100, 200, 300, 400, 500)
      const milestones = [100, 200, 300, 400, 500];
      for (const m of milestones) {
        if (next === m && !unlockedThresholdsRef.current.has(m)) {
          unlockedThresholdsRef.current.add(m);
          triggerAchievement(m);
        }
      }

      return next;
    });

    const recentClicks = clickTimestampsRef.current.filter((t) => now - t <= 1000);
    setDps(recentClicks.length);

    play8BitDropSound();
    triggerParticles();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
  }, [play8BitDropSound, triggerParticles, triggerAchievement]);

  const handleRapidRelease = useCallback(() => {
    setIsRapidPressed(false);
  }, []);

  // Handle participate mode press
  const handleParticipatePress = useCallback((e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!isDone) {
      setIsDone(true);
      play8BitDropSound();
      triggerParticles();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    } else {
      setShowPopup(true);
    }
  }, [isDone, play8BitDropSound, triggerParticles]);

  // Main button pointer down
  const handleButtonPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (mode === 'rapid') {
      handleRapidPress();
    } else {
      handleParticipatePress(e);
    }
  };

  const handleButtonPointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (mode === 'rapid') {
      handleRapidRelease();
    }
  };

  const handleButtonPointerLeave = () => {
    if (mode === 'rapid') {
      handleRapidRelease();
    }
  };

  const handleConfirmReset = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsDone(false);
    setShowPopup(false);
  };

  const handleCancelReset = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowPopup(false);
  };

  // Keyboard support (Space / Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPopup) {
        if (e.code === 'Escape') {
          setShowPopup(false);
        }
        return;
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        if (mode === 'rapid') {
          handleRapidPress();
        } else {
          handleParticipatePress();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (mode === 'rapid') {
          handleRapidRelease();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [showPopup, mode, handleRapidPress, handleRapidRelease, handleParticipatePress]);

  // Determine current active visual state of the button
  const isButtonVisuallyPressed = mode === 'rapid' ? isRapidPressed : isDone;
  const buttonText = mode === 'rapid' ? 'STANDBY' : isDone ? 'DONE' : 'STANDBY';

  return (
    <main className="relative w-full h-dvh bg-black text-white flex flex-col items-center justify-center overflow-hidden select-none touch-none">
      {/* 8-bit Dot Matrix Background Grid */}
      <div 
        className="absolute inset-0 bg-dot-grid opacity-25 pointer-events-none transition-opacity duration-150"
        style={{ opacity: isButtonVisuallyPressed ? 0.45 : 0.22 }}
      />

      {/* 8-bit Dither Overlay & Scanlines */}
      <div className="absolute inset-0 bg-pixel-dither opacity-30 pointer-events-none" />
      <div className="absolute inset-0 scanlines opacity-40 pointer-events-none" />

      {/* Decorative Monochrome 8-bit Corner Brackets */}
      <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-white pointer-events-none" />
      <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-white pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-white pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white pointer-events-none" />

      {/* Monochrome 8-bit Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute pointer-events-none"
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            opacity: p.alpha,
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 3px #fff',
          }}
        />
      ))}

      {/* Achievement Slide In/Out Popup (Top Right) */}
      <div
        className={`fixed top-3 right-3 sm:top-4 sm:right-4 z-50 flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-black border-2 sm:border-3 border-white shadow-[0_0_0_2px_#000,0_6px_0_0_#fff] transition-all duration-500 ease-out pointer-events-none select-none max-w-[calc(100vw-24px)] sm:max-w-xs ${
          isSlideVisible
            ? 'translate-x-0 opacity-100'
            : 'translate-x-[120%] opacity-0'
        }`}
      >
        {/* Small Icon from images folder */}
        {activeAchievement && (
          <img
            src={activeAchievement.icon}
            alt=""
            className="w-10 h-10 sm:w-11 sm:h-11 object-cover border-2 border-white shrink-0 bg-neutral-900"
          />
        )}

        {/* Achievement Texts */}
        <div className="flex flex-col text-left overflow-hidden">
          <span
            className="text-[11px] sm:text-xs font-bold text-white tracking-wider uppercase mb-0.5"
            style={{ fontFamily: "'Press Start 2P', 'Galmuri11', monospace" }}
          >
            {activeAchievement?.title}
          </span>
          <span
            className="text-xs sm:text-sm font-medium text-neutral-200 tracking-tight truncate"
            style={{ fontFamily: "'Galmuri11', 'Galmuri9', monospace" }}
          >
            {activeAchievement?.desc}
          </span>
        </div>
      </div>

      {/* Mobile-tailored Content Container */}
      <div className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center justify-center gap-7 sm:gap-9">
        
        {/* Top Text Group */}
        <div className="flex flex-col items-center text-center space-y-3.5">
          <h1 
            className="text-xl sm:text-2xl font-bold tracking-wider text-white uppercase"
            style={{
              fontFamily: "'Press Start 2P', 'Galmuri11', monospace",
              textShadow: '3px 3px 0 #333, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
            }}
          >
            Music Creative Lab
          </h1>
          <p 
            className="text-xs sm:text-sm font-medium tracking-tight text-neutral-300"
            style={{
              fontFamily: "'Galmuri11', 'Galmuri9', monospace",
              textShadow: '1px 1px 0 #000',
            }}
          >
            {mode === 'rapid' 
              ? `DPS: ${dps.toFixed(1)} | 횟수: ${rapidCount}회`
              : isDone 
                ? '서버에 결과를 전송했습니다!' 
                : 'Drop 타이밍에 맞춰 버튼을 눌러주세요!'}
          </p>
        </div>

        {/* Central 8-Bit Interactive Button Container */}
        <div className="flex flex-col items-center justify-center p-2">
          <div className="relative flex items-center justify-center">
            
            {/* Outer 8-bit Pixel Depth Pedestal */}
            <div 
              className="w-56 h-56 sm:w-60 sm:h-60 bg-neutral-900 border-4 border-white transition-all duration-75 relative flex items-center justify-center"
              style={{
                boxShadow: isButtonVisuallyPressed 
                  ? '0 0 0 2px #000, 0 3px 0 2px #fff' 
                  : '0 0 0 2px #000, 0 14px 0 2px #fff, 0 14px 0 4px #000',
              }}
            >
              {/* The Tactile Button Face */}
              <button
                ref={buttonRef}
                type="button"
                onPointerDown={handleButtonPointerDown}
                onPointerUp={handleButtonPointerUp}
                onPointerLeave={handleButtonPointerLeave}
                onPointerCancel={handleButtonPointerLeave}
                className="w-full h-full cursor-pointer outline-none flex items-center justify-center transition-all duration-75 relative select-none border-4 touch-none"
                style={{
                  transform: isButtonVisuallyPressed ? 'translateY(10px)' : 'translateY(0)',
                  backgroundColor: isButtonVisuallyPressed ? '#ffffff' : '#000000',
                  borderColor: isButtonVisuallyPressed ? '#000000' : '#ffffff',
                }}
              >
                {/* 8-bit Inner Step Border */}
                <div 
                  className="absolute inset-1.5 sm:inset-2 border-2 transition-colors duration-75 pointer-events-none"
                  style={{
                    borderColor: isButtonVisuallyPressed ? '#000000' : '#ffffff',
                  }}
                />

                {/* 8-Bit Corner Accent Dots */}
                <div 
                  className="absolute top-3 left-3 w-1.5 h-1.5 transition-colors duration-75 pointer-events-none"
                  style={{ backgroundColor: isButtonVisuallyPressed ? '#000000' : '#ffffff' }}
                />
                <div 
                  className="absolute top-3 right-3 w-1.5 h-1.5 transition-colors duration-75 pointer-events-none"
                  style={{ backgroundColor: isButtonVisuallyPressed ? '#000000' : '#ffffff' }}
                />
                <div 
                  className="absolute bottom-3 left-3 w-1.5 h-1.5 transition-colors duration-75 pointer-events-none"
                  style={{ backgroundColor: isButtonVisuallyPressed ? '#000000' : '#ffffff' }}
                />
                <div 
                  className="absolute bottom-3 right-3 w-1.5 h-1.5 transition-colors duration-75 pointer-events-none"
                  style={{ backgroundColor: isButtonVisuallyPressed ? '#000000' : '#ffffff' }}
                />

                {/* Button Text */}
                <span
                  className="relative z-10 text-lg sm:text-xl font-bold tracking-widest uppercase transition-colors duration-75"
                  style={{
                    fontFamily: "'Press Start 2P', 'Galmuri11', monospace",
                    color: isButtonVisuallyPressed ? '#000000' : '#ffffff',
                    letterSpacing: '0.15em',
                  }}
                >
                  {buttonText}
                </span>
              </button>
            </div>

          </div>
        </div>

        {/* Mode Selector Options Below Central Button */}
        <div className="flex items-center justify-center gap-3.5 w-full">
          <button
            type="button"
            onClick={() => setMode('participate')}
            className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold border-2 transition-all cursor-pointer ${
              mode === 'participate'
                ? 'bg-white text-black border-white shadow-[0_3px_0_0_#888]'
                : 'bg-black text-neutral-400 border-neutral-600 hover:border-white hover:text-white'
            }`}
            style={{
              fontFamily: "'Galmuri11', 'Galmuri9', monospace",
            }}
          >
            참여모드
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('rapid');
              setShowPopup(false);
            }}
            className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold border-2 transition-all cursor-pointer ${
              mode === 'rapid'
                ? 'bg-white text-black border-white shadow-[0_3px_0_0_#888]'
                : 'bg-black text-neutral-400 border-neutral-600 hover:border-white hover:text-white'
            }`}
            style={{
              fontFamily: "'Galmuri11', 'Galmuri9', monospace",
            }}
          >
            광클모드
          </button>
        </div>

      </div>

      {/* 8-bit Monochrome Reset Confirmation Popup */}
      {showPopup && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 select-none touch-none"
          onClick={handleCancelReset}
        >
          <div 
            className="relative w-full max-w-xs bg-black border-4 border-white p-6 flex flex-col items-center text-center shadow-[0_0_0_2px_#000,0_8px_0_0_#fff]"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontFamily: "'Galmuri11', 'Galmuri9', monospace",
            }}
          >
            {/* Decorative Corner Dots */}
            <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-white pointer-events-none" />
            <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-white pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-white pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-white pointer-events-none" />

            {/* Popup Question Text */}
            <p className="text-sm sm:text-base font-bold text-white mb-6 tracking-tight">
              초기화 하시겠습니까?
            </p>

            {/* Options: 예 / 아니요 */}
            <div className="flex items-center justify-center gap-4 w-full">
              {/* Option: 예 */}
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 py-2.5 px-3 bg-white text-black font-bold text-xs sm:text-sm border-2 border-black active:translate-y-1 transition-all cursor-pointer shadow-[0_3px_0_0_#666]"
                style={{
                  fontFamily: "'Galmuri11', 'Galmuri9', monospace",
                }}
              >
                예
              </button>

              {/* Option: 아니요 */}
              <button
                type="button"
                onClick={handleCancelReset}
                className="flex-1 py-2.5 px-3 bg-black text-white font-bold text-xs sm:text-sm border-2 border-white active:translate-y-1 transition-all cursor-pointer shadow-[0_3px_0_0_#fff]"
                style={{
                  fontFamily: "'Galmuri11', 'Galmuri9', monospace",
                }}
              >
                아니요
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
