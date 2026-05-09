'use client'
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

function IntroLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/Redsnareln.png"
      alt="RedSnare logo"
      width={192}
      height={192}
      priority
      className={className}
    />
  );
}

export function IntroAnimation({ onComplete }: { onComplete: () => void }) {
  const words = ["DECENTRALIZED", "TRANSPARENCY", "SECURITY", "REDSNARE"];
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [phase, setPhase] = useState<'ready' | 'typing' | 'impact' | 'fading'>('ready');
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    setPhase('typing');
  };

  const playPremiumClick = () => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000, ctx.currentTime);
      filter.Q.setValueAtTime(1, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch (e) { }
  };

  useEffect(() => {
    if (phase === 'ready') return;

    if (phase === 'fading') {
      const timer = setTimeout(onComplete, 800);
      return () => clearTimeout(timer);
    }

    if (phase === 'impact') {
      const timer = setTimeout(() => setPhase('fading'), 2000);
      return () => clearTimeout(timer);
    }

    const currentWord = words[currentWordIndex];
    const isLastWord = currentWordIndex === words.length - 1;
    const typingSpeed = isDeleting ? 30 : 60; // Slightly faster

    const handleTyping = () => {
      if (!isDeleting && displayText === currentWord) {
        if (isLastWord) {
          setTimeout(() => setPhase('impact'), 1800);
        } else {
          setTimeout(() => setIsDeleting(true), 1000);
        }
        return;
      }

      if (isDeleting && displayText === "") {
        setIsDeleting(false);
        setCurrentWordIndex((prev) => prev + 1);
        return;
      }

      const nextText = isDeleting
        ? currentWord.substring(0, displayText.length - 1)
        : currentWord.substring(0, displayText.length + 1);

      setDisplayText(nextText);
      if (!isDeleting) playPremiumClick();
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, currentWordIndex, phase]);

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#0A0A0A] overflow-hidden">
      {phase === 'ready' && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center cursor-pointer bg-black/20 backdrop-blur-[2px]"
          onClick={initAudio}
        >
          <div className="animate-pulse flex flex-col items-center">
            <IntroLogo className="w-20 h-20 mb-6 opacity-40 object-contain" />
            <div className="text-[10px] font-bold tracking-[0.5em] text-white/40 uppercase">Click to Initialize Protocol</div>
          </div>
        </div>
      )}

      <div className={`fixed inset-0 flex flex-col items-center justify-center transition-all duration-1000 ${phase === 'fading' ? 'opacity-0 scale-110' : 'opacity-100'}`}>
        <div className={`absolute inset-0 bg-white transition-opacity duration-300 pointer-events-none z-10 ${phase === 'impact' ? 'opacity-10' : 'opacity-0'}`} />

        <div className={`relative flex flex-col items-center transition-all duration-[2000ms] ease-in-out
          ${phase === 'impact' ? 'scale-[35] opacity-0' : 'scale-100 opacity-100'}`}>
          <div className="relative mb-12">
            <IntroLogo className={`w-48 h-48 object-contain transition-all duration-1000 ${currentWordIndex === words.length - 1 && displayText.length > 0 ? 'scale-110' : 'scale-100'}`} />
            <div className={`absolute inset-0 bg-brand-500/30 blur-[80px] rounded-full transition-opacity duration-1000 ${currentWordIndex === words.length - 1 && displayText.length > 0 ? 'opacity-100' : 'opacity-20'}`} />
          </div>
          <div className="flex flex-col items-center min-h-[80px]">
            <h1 className="text-4xl md:text-6xl font-black tracking-[0.2em] text-white uppercase text-center transition-all duration-500"
              style={{ fontFamily: 'Orbitron, sans-serif', textShadow: currentWordIndex === words.length - 1 ? '0 0 20px rgba(232,40,30,0.5)' : 'none' }}>
              {displayText}
              {phase === 'typing' && <span className="inline-block w-1 h-10 ml-2 bg-brand-500 animate-pulse align-middle" />}
            </h1>
            <div className={`mt-6 text-[10px] font-bold tracking-[0.4em] text-brand-500 uppercase transition-all duration-1000 ${currentWordIndex === words.length - 1 && displayText.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              PROTOCOL INITIALIZED
            </div>
          </div>
        </div>

        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(232,40,30,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(232,40,30,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>
      </div>
    </div>
  );
}
