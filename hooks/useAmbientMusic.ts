"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useAmbientMusic() {
  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef<{
    ctx: AudioContext;
    master: GainNode;
    timer: ReturnType<typeof setInterval>;
  } | null>(null);

  const playNote = (
    f: number,
    ctx: AudioContext,
    master: GainNode,
    peak: number
  ) => {
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = f * 2;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 1.9);
    o.connect(g);
    o2.connect(g);
    g.connect(master);
    o.start(t);
    o2.start(t);
    o.stop(t + 2.0);
    o2.stop(t + 2.0);
  };

  const setup = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 1.4);
    master.connect(ctx.destination);
    const scale = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
    const timer = setInterval(() => {
      if (ctx.state !== "running") return;
      const f = scale[(Math.random() * scale.length) | 0];
      playNote(f, ctx, master, 0.5);
      if (Math.random() < 0.35) playNote(f / 2, ctx, master, 0.12);
    }, 540);
    audioRef.current = { ctx, master, timer };
    return audioRef.current;
  }, []);

  const toggle = useCallback(() => {
    const a = setup();
    if (musicOn) {
      void a.ctx.suspend();
      setMusicOn(false);
    } else {
      void a.ctx.resume();
      setMusicOn(true);
    }
  }, [musicOn, setup]);

  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) {
        clearInterval(a.timer);
        void a.ctx.close();
      }
    };
  }, []);

  return {
    musicOn,
    toggle,
    label: musicOn ? "🔊 Đang phát nhạc" : "🔇 Bật nhạc nền",
  };
}
