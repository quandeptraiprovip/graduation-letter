"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type FloatingWish = {
  name: string;
  msg: string;
  emoji: string;
  when: string;
};

type BubbleSpec = FloatingWish & {
  key: string;
  x: number;
  duration: number;
  delay: number;
  drift: number;
};

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildBubbles(wishes: FloatingWish[], max: number): BubbleSpec[] {
  if (wishes.length === 0) return [];
  const count = Math.max(wishes.length, Math.min(max, wishes.length * 3));
  const capped = Math.min(max, count);
  const out: BubbleSpec[] = [];
  for (let i = 0; i < capped; i++) {
    const w = wishes[i % wishes.length];
    const h = hash(`${w.name}-${w.when}-${i}`);
    out.push({
      ...w,
      key: `b-${i}-${w.when}-${h}`,
      x: 4 + (h % 62),
      duration: 22 + (h % 14),
      delay: -((h % 45) + i * 2.4),
      drift: (h % 2 === 0 ? 1 : -1) * (6 + (h % 12)),
    });
  }
  return out;
}

type Props = {
  wishes: FloatingWish[];
};

export function FloatingWishes({ wishes }: Props) {
  const [heldKey, setHeldKey] = useState<string | null>(null);
  const [slowMotion, setSlowMotion] = useState(false);
  const [maxBubbles, setMaxBubbles] = useState(9);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 600px)");
    const update = () => setMaxBubbles(mq.matches ? 7 : 11);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSlowMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const bubbles = useMemo(
    () => buildBubbles(wishes, maxBubbles),
    [wishes, maxBubbles]
  );

  const heldBubble = useMemo(
    () => bubbles.find((b) => b.key === heldKey) ?? null,
    [bubbles, heldKey]
  );

  const release = useCallback(() => setHeldKey(null), []);

  const hold = useCallback((key: string, el: HTMLElement, e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    setHeldKey(key);
  }, []);

  const FocusCard = ({ b }: { b: BubbleSpec }) => (
    <div
      className="wish-focus-card"
      role="dialog"
      aria-modal="true"
      aria-label={`Lời chúc của ${b.name}`}
    >
      <div className="wish-focus-emoji">{b.emoji}</div>
      <p className="wish-focus-msg">{b.msg}</p>
      <div className="wish-focus-meta">
        <span className="wish-focus-name">{b.name}</span>
        <span className="wish-focus-when">{b.when}</span>
      </div>
      <p className="wish-focus-hint">Thả tay để tiếp tục bay</p>
    </div>
  );

  if (wishes.length === 0) {
    return (
      <div className="wish-stage wish-stage--empty">
        <p className="wish-stage-empty-text">
          Chưa có lời chúc nào — hãy là người đầu tiên gửi nhé 💌
        </p>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="wish-stage wish-stage--loading" aria-hidden>
        <p className="wish-stage-empty-text">Đang tải lời chúc…</p>
      </div>
    );
  }

  return (
    <div
      className={`wish-stage${heldKey ? " wish-stage--holding" : ""}${
        slowMotion ? " wish-stage--slow" : ""
      }`}
      aria-label="Lời chúc đang bay"
      onPointerUp={heldKey ? release : undefined}
      onPointerCancel={heldKey ? release : undefined}
    >
      <div className="wish-stage-glow" aria-hidden />
      <p className="wish-stage-hint">Chạm giữ lời chúc để đọc · thả tay để bay tiếp</p>
      <div className="wish-stage-sky">
        {bubbles.map((b) => {
          const held = heldKey === b.key;
          const dur = slowMotion ? b.duration * 2.2 : b.duration;
          return (
            <div
              key={b.key}
              role="button"
              tabIndex={0}
              className={`wish-bubble wish-bubble--float${held ? " wish-bubble--held" : ""}`}
              style={
                {
                  "--wish-x": `${b.x}%`,
                  "--wish-dur": `${dur}s`,
                  "--wish-delay": `${b.delay}s`,
                  "--wish-drift": `${b.drift}px`,
                } as React.CSSProperties
              }
              onPointerDown={(e) => hold(b.key, e.currentTarget, e)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setHeldKey(held ? null : b.key);
                }
                if (e.key === "Escape") release();
              }}
            >
              <span className="wish-bubble-emoji">{b.emoji}</span>
              <span className="wish-bubble-msg">{b.msg}</span>
            </div>
          );
        })}
      </div>
      {heldBubble && (
        <div className="wish-focus-layer" aria-hidden={false}>
          <FocusCard b={heldBubble} />
        </div>
      )}
    </div>
  );
}
