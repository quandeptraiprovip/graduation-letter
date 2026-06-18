"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  forwardRef,
} from "react";

export type SignaturePadHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string;
};

type Props = {
  height?: number;
  /** Khi true, nền canvas trong suốt (để chữ ký phủ lên ảnh). Mặc định nền kem. */
  transparent?: boolean;
};

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(
  function SignaturePad({ height = 220, transparent = false }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const hasInk = useRef(false);

    const resize = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, height);
      if (!transparent) {
        ctx.fillStyle = "#FFFCFA";
        ctx.fillRect(0, 0, rect.width, height);
      }
      ctx.strokeStyle = "#4F3B47";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      hasInk.current = false;
    }, [height, transparent]);

    useEffect(() => {
      resize();
      const ro = new ResizeObserver(() => resize());
      if (canvasRef.current) ro.observe(canvasRef.current);
      return () => ro.disconnect();
    }, [resize]);

    const point = (e: React.PointerEvent) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      canvas.setPointerCapture(e.pointerId);
      drawing.current = true;
      const { x, y } = point(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const onMove = (e: React.PointerEvent) => {
      if (!drawing.current) return;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const { x, y } = point(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      hasInk.current = true;
    };

    const onUp = (e: React.PointerEvent) => {
      drawing.current = false;
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    useImperativeHandle(ref, () => ({
      clear: () => resize(),
      isEmpty: () => !hasInk.current,
      toDataURL: () => canvasRef.current?.toDataURL("image/png") ?? "",
    }));

    return (
      <canvas
        ref={canvasRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onPointerCancel={onUp}
        style={{
          width: "100%",
          height,
          display: "block",
          touchAction: "none",
          cursor: "crosshair",
          borderRadius: 14,
        }}
        aria-label="Vùng ký tên"
      />
    );
  }
);
