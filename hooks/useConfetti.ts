"use client";

import { useCallback, useEffect, useRef } from "react";

const COLORS = [
  "#F3C6CE",
  "#E59FAC",
  "#D9CDEA",
  "#B9A5D6",
  "#CBE7D8",
  "#F3D7A8",
  "#C9A05B",
  "#FFFFFF",
];

type Particle = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  color: string;
  shape: "circle" | "rect";
};

export function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const partsRef = useRef<Particle[]>([]);
  const runningRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const loop = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) {
      runningRef.current = false;
      return;
    }
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    const ps = partsRef.current;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.045;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.92;
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, 7);
        ctx.fill();
      } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      if (p.y > h + 50) ps.splice(i, 1);
    }
    if (ps.length > 0) rafRef.current = requestAnimationFrame(loop);
    else {
      runningRef.current = false;
      ctx.clearRect(0, 0, w, h);
    }
  }, []);

  const launch = useCallback(
    (n: number) => {
      const cv = canvasRef.current;
      if (!cv) return;
      const dpr = window.devicePixelRatio || 1;
      const resize = () => {
        cv.width = window.innerWidth * dpr;
        cv.height = window.innerHeight * dpr;
        const ctx = cv.getContext("2d");
        ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      for (let i = 0; i < n; i++) {
        partsRef.current.push({
          x: Math.random() * window.innerWidth,
          y: -20 - Math.random() * window.innerHeight * 0.5,
          w: 6 + Math.random() * 8,
          h: 8 + Math.random() * 10,
          vx: -2.2 + Math.random() * 4.4,
          vy: 2 + Math.random() * 3.5,
          rot: Math.random() * Math.PI,
          vr: -0.22 + Math.random() * 0.44,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          shape: Math.random() < 0.42 ? "circle" : "rect",
        });
      }
      if (!runningRef.current) {
        runningRef.current = true;
        rafRef.current = requestAnimationFrame(loop);
      }
    },
    [loop]
  );

  useEffect(() => {
    const onResize = () => {
      const cv = canvasRef.current;
      if (!cv) return;
      const dpr = window.devicePixelRatio || 1;
      cv.width = window.innerWidth * dpr;
      cv.height = window.innerHeight * dpr;
      cv.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { canvasRef, launch };
}
