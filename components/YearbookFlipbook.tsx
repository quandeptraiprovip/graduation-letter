"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageSlot } from "@/components/ImageSlot";
import { IMAGES, YEARBOOK_PAGE_COUNT } from "@/lib/config";

type YearbookSlot = keyof typeof IMAGES.yearbook;

type LeafSide = {
  cover?: boolean;
  endcover?: boolean;
  memoSpread?: boolean;
  textSpread?: boolean;
  text?: string;
  slot?: YearbookSlot;
  cap?: string;
};

type LeftPage =
  | { kind: "spine" }
  | { kind: "text"; text: string; variant?: "memo" | "quote" | "end" }
  | { kind: "image"; slot: YearbookSlot; cap?: string };

/** Trang trái cố định — xen kẽ ảnh / chữ với trang phải đang lật. */
const LEFT_BY_SETTLED_PAGE: LeftPage[] = [
  { kind: "spine" },
  {
    kind: "text",
    text: "",
    variant: "quote",
  },
  { kind: "image", slot: "yb5" },
  { kind: "image", slot: "yb4", cap: "Một thời để nhớ" },
];

const LEAVES: { front: LeafSide; back: LeafSide }[] = [
  { front: { cover: true }, back: { slot: "yb1", cap: "" } },
  {
    front: { slot: "yb2", cap: "" },
    back: {
      textSpread: true,
      text: "Những khoảnh khắc\nkhông thể quên",
    },
  },
  {
    front: {
      memoSpread: true,
      text: "Bốn năm — một chặng\nđẹp nhất 💛",
    },
    back: { slot: "yb4", cap: "" },
  },
  {
    front: { slot: "yb7", cap: "" },
    back: { slot: "yb8", cap: "" },
  },
  {
    front: { slot: "yb6", cap: "" },
    back: {
      endcover: true,
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

function YearbookTextPage({
  text,
  variant = "memo",
}: {
  text: string;
  variant?: "memo" | "quote" | "end";
}) {
  const className =
    variant === "end"
      ? "yearbook-text-page yearbook-text-page--end"
      : variant === "quote"
        ? "yearbook-text-page yearbook-text-page--quote"
        : "yearbook-text-page yearbook-text-page--memo";

  return (
    <div className={className}>
      {text.split("\n").map((line, idx) => (
        <span key={idx}>
          {idx > 0 ? <br /> : null}
          {line}
        </span>
      ))}
    </div>
  );
}

function YearbookImagePage({
  slot,
  cap,
}: {
  slot: YearbookSlot;
  cap?: string;
}) {
  return (
    <>
      <ImageSlot
        src={IMAGES.yearbook[slot] || undefined}
        alt={cap ?? ""}
        placeholder="Ảnh kỷ yếu"
        sizes="(max-width: 600px) 50vw, 280px"
        className="yearbook-photo"
        fit="contain"
      />
      {cap ? <div className="yearbook-caption">{cap}</div> : null}
    </>
  );
}

function YearbookLeftPage({ settledPage }: { settledPage: number }) {
  const page = LEFT_BY_SETTLED_PAGE[settledPage] ?? { kind: "spine" as const };

  if (page.kind === "spine") {
    return <div className="yearbook-left-page yearbook-left-page--spine" aria-hidden />;
  }

  return (
    <div className="yearbook-left-page" aria-hidden={false}>
      {page.kind === "text" ? (
        <YearbookTextPage text={page.text} variant={page.variant} />
      ) : (
        <YearbookImagePage slot={page.slot} cap={page.cap} />
      )}
    </div>
  );
}

function YearbookFaceContent({ side }: { side: LeafSide }) {
  if (side.cover) {
    return (
      <div className="yearbook-cover yearbook-cover--front">
        <div className="yearbook-cover-label">KỶ YẾU</div>
        <div className="yearbook-cover-years">2022 — 2026</div>
        <div className="yearbook-cover-name">Kiều Diễm</div>
      </div>
    );
  }

  if (side.memoSpread && side.text) {
    return <YearbookTextPage text={side.text} variant="memo" />;
  }

  if ((side.textSpread || side.endcover) && side.text) {
    return (
      <YearbookTextPage
        text={side.text}
        variant={side.endcover ? "end" : "quote"}
      />
    );
  }

  if (side.endcover) {
    return (
      <YearbookTextPage text={"Cảm ơn vì đã\nđồng hành 💛"} variant="end" />
    );
  }

  if (side.slot) {
    return <YearbookImagePage slot={side.slot} cap={side.cap} />;
  }

  return null;
}

export function YearbookFlipbook() {
  const [settledPage, setSettledPage] = useState(0);
  const [animatingLeaf, setAnimatingLeaf] = useState<number | null>(null);
  const [flipForward, setFlipForward] = useState(true);
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
        <YearbookLeftPage settledPage={settledPage} />
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
