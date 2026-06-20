"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageSlot } from "@/components/ImageSlot";
import { IMAGES, YEARBOOK_PAGE_COUNT } from "@/lib/config";

type LeafSide = {
  cover?: boolean;
  endcover?: boolean;
  /** Trang chữ (có ảnh nền — xen kẽ với trang ảnh thuần). */
  memoSpread?: boolean;
  textSpread?: boolean;
  text?: string;
  slot?: keyof typeof IMAGES.yearbook;
  cap?: string;
};

/** Mặt trái/phải mỗi tờ — xen kẽ chữ ↔ ảnh khi lật tuần tự. */
const LEAVES: { front: LeafSide; back: LeafSide }[] = [
  { front: { cover: true }, back: { slot: "yb1", cap: "Tân sinh viên · 2023" } },
  {
    front: { slot: "yb2", cap: "" },
    back: {
      textSpread: true,
      slot: "yb3",
      text: "Những khoảnh khắc\nkhông thể quên",
    },
  },
  {
    front: {
      memoSpread: true,
      slot: "yb5",
      text: "Bốn năm — một chặng\nđẹp nhất 💛",
    },
    back: { slot: "yb4", cap: "Một thời để nhớ" },
  },
  {
    front: { slot: "yb6", cap: "" },
    back: {
      endcover: true,
      slot: "yb2",
      text: "Cảm ơn vì đã\nđồng hành 💛",
    },
  },
];

const N = YEARBOOK_PAGE_COUNT;
const ANIMATING_Z = 1000 + N;

function leafIsFlipped(
  i: number,
  settledPage: number,
  animatingLeaf: number | null,
  flipForward: boolean,
  turned: boolean
) {
  if (animatingLeaf === i) {
    return flipForward ? turned : !turned;
  }
  return i < settledPage;
}

function leafZIndex(
  i: number,
  settledPage: number,
  animatingLeaf: number | null,
  flipped: boolean
) {
  if (animatingLeaf === i) return ANIMATING_Z;
  return flipped ? i : N - i;
}

function YearbookFaceContent({ side }: { side: LeafSide }) {
  if (side.cover) {
    return (
      <div className="yearbook-cover yearbook-cover--front">
        <div className="yearbook-cover-label">KỶ YẾU</div>
        <div className="yearbook-cover-years">2023 — 2026</div>
        <div className="yearbook-cover-name">Kiều Diễm</div>
      </div>
    );
  }

  const prose =
    side.memoSpread || side.textSpread || (side.endcover && side.text);
  if (prose && side.slot) {
    return (
      <div className="yearbook-prose-page">
        <ImageSlot
          src={IMAGES.yearbook[side.slot] || undefined}
          alt=""
          placeholder="Ảnh kỷ yếu"
          sizes="(max-width: 600px) 50vw, 280px"
          className="yearbook-photo yearbook-photo--backdrop"
          fit="contain"
        />
        <div
          className={`yearbook-prose-page__card${
            side.endcover
              ? " yearbook-cover yearbook-cover--end yearbook-cover--overlay"
              : side.memoSpread
                ? " yearbook-memo yearbook-memo--overlay"
                : " yearbook-text-spread"
          }`}
        >
          {(side.text ?? "").split("\n").map((line, idx) => (
            <span key={idx}>
              {idx > 0 ? <br /> : null}
              {line}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (side.endcover) {
    return (
      <div className="yearbook-cover yearbook-cover--end">
        Cảm ơn vì đã
        <br />
        đồng hành 💛
      </div>
    );
  }

  if (side.slot) {
    return (
      <>
        <ImageSlot
          src={IMAGES.yearbook[side.slot] || undefined}
          alt={side.cap ?? ""}
          placeholder="Ảnh kỷ yếu"
          sizes="(max-width: 600px) 50vw, 280px"
          className="yearbook-photo"
          fit="contain"
        />
        {side.cap ? <div className="yearbook-caption">{side.cap}</div> : null}
      </>
    );
  }

  return null;
}

export function YearbookFlipbook() {
  const [settledPage, setSettledPage] = useState(0);
  const [animatingLeaf, setAnimatingLeaf] = useState<number | null>(null);
  const [flipForward, setFlipForward] = useState(true);
  /** Bật sau 2 rAF để trình duyệt vẽ khung trước khi transition transform. */
  const [turned, setTurned] = useState(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const isBusy = animatingLeaf !== null;

  const beginTurn = useCallback((leafIndex: number, forward: boolean) => {
    setFlipForward(forward);
    setTurned(false);
    setAnimatingLeaf(leafIndex);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setTurned(true));
    });
  }, []);

  const finishFlip = useCallback(() => {
    setSettledPage((p) => (flipForward ? Math.min(N, p + 1) : Math.max(0, p - 1)));
    setAnimatingLeaf(null);
    setTurned(false);
  }, [flipForward]);

  const goNext = useCallback(() => {
    if (isBusy || settledPage >= N) return;
    if (reducedMotion) {
      setSettledPage((p) => Math.min(N, p + 1));
      return;
    }
    beginTurn(settledPage, true);
  }, [beginTurn, isBusy, reducedMotion, settledPage]);

  const goPrev = useCallback(() => {
    if (isBusy || settledPage <= 0) return;
    if (reducedMotion) {
      setSettledPage((p) => Math.max(0, p - 1));
      return;
    }
    beginTurn(settledPage - 1, false);
  }, [beginTurn, isBusy, reducedMotion, settledPage]);

  const onLeafTransitionEnd = useCallback(
    (i: number, e: React.TransitionEvent) => {
      if (animatingLeaf !== i || e.propertyName !== "transform") return;
      finishFlip();
    },
    [animatingLeaf, finishFlip]
  );

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  return (
    <section className="yearbook-section" aria-label="Cuốn kỷ yếu">
      <div className="yearbook-header">
        <div className="yearbook-eyebrow">Cuốn kỷ yếu</div>
        <h2 className="yearbook-title">Lật từng trang ký ức</h2>
        <p className="yearbook-swipe-hint">Vuốt trái / phải trên cuốn sách để lật trang</p>
      </div>

      <div
        className="yearbook-stage"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="yearbook-spine" aria-hidden />
        {LEAVES.map((lf, i) => {
          const flipped = leafIsFlipped(
            i,
            settledPage,
            animatingLeaf,
            flipForward,
            turned
          );
          const animating = animatingLeaf === i;
          return (
            <div
              key={i}
              className={`yearbook-leaf${flipped ? " yearbook-leaf--flipped" : ""}${
                animating ? " yearbook-leaf--animating" : ""
              }`}
              style={{ zIndex: leafZIndex(i, settledPage, animatingLeaf, flipped) }}
              onTransitionEnd={(e) => {
                if (e.target !== e.currentTarget) return;
                onLeafTransitionEnd(i, e);
              }}
            >
              <div className="yearbook-face yearbook-face--front">
                <YearbookFaceContent side={lf.front} />
              </div>
              <div className="yearbook-face yearbook-face--back">
                <YearbookFaceContent side={lf.back} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="yearbook-controls">
        <button
          type="button"
          className="yearbook-btn yearbook-btn--ghost btn-hover"
          onClick={goPrev}
          disabled={settledPage <= 0 || isBusy}
        >
          <span className="yearbook-btn-label yearbook-btn-label--long">← Trang trước</span>
          <span className="yearbook-btn-label yearbook-btn-label--short">← Trước</span>
        </button>
        <span className="yearbook-page-label">
          {settledPage} / {N}
        </span>
        <button
          type="button"
          className="yearbook-btn yearbook-btn--primary btn-hover"
          onClick={goNext}
          disabled={settledPage >= N || isBusy}
        >
          <span className="yearbook-btn-label yearbook-btn-label--long">Trang sau →</span>
          <span className="yearbook-btn-label yearbook-btn-label--short">Sau →</span>
        </button>
      </div>
    </section>
  );
}
