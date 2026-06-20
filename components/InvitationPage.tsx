"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInviteGuest } from "@/hooks/useInviteGuest";
import { usePrefillInviteName } from "@/hooks/usePrefillInviteName";
import { hrefWithInviteSlug } from "@/lib/invite-path";
import { HeroInviteCopy } from "@/components/HeroInviteCopy";
import { ImageSlot } from "@/components/ImageSlot";
import { LuuButPromoSection } from "@/components/LuuButPromoSection";
import type { GlobeWishPoint } from "@/components/WishGlobe";
import { EVENT_GEO, EVENT_ISO, EVENT_MAPS_QUERY, IMAGES } from "@/lib/config";
import type { GuestEntry } from "@/lib/guestbook-store";
import { useConfetti } from "@/hooks/useConfetti";
import { useCountdown } from "@/hooks/useCountdown";

const WishGlobe = dynamic(
  () => import("@/components/WishGlobe").then((m) => m.WishGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="wish-globe-wrap">
        <div className="wish-globe-placeholder">Đang tải quả địa cầu…</div>
      </div>
    ),
  }
);

const ALBUM = [
  { key: "al1" as const, cap: "" },
  { key: "al2" as const, cap: "" },
  { key: "al3" as const, cap: "" },
  { key: "al4" as const, cap: "" },
  { key: "al5" as const, cap: "" },
];

export function InvitationPage() {
  const pathname = usePathname();
  const { displayName, slug, isPersonalized } = useInviteGuest();
  const cd = useCountdown(EVENT_ISO);
  const { canvasRef, launch } = useConfetti();

  const heroRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(0);
  const [globePoints, setGlobePoints] = useState<GlobeWishPoint[]>([]);
  const [rName, setRName] = useState("");
  const { onNameChange: onRNameChange } = usePrefillInviteName(
    displayName,
    slug,
    setRName
  );
  const [rAttend, setRAttend] = useState<"" | "yes" | "no">("");
  const [rMsg, setRMsg] = useState("");
  const [rDone, setRDone] = useState(false);
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/guestbook", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const entries = (data?.entries ?? []) as GuestEntry[];
        setGlobePoints(
          entries
            .filter(
              (g): g is GuestEntry & { lat: number; lng: number } =>
                g.lat !== undefined && g.lng !== undefined
            )
            .map((g) => ({
              id: `${g.timestamp}-${g.name}`,
              lat: g.lat,
              lng: g.lng,
              name: g.name,
              emoji: g.emoji,
              msg: g.message,
              place: g.place,
            }))
        );
      })
      .catch(() => {});
  }, []);

  const leaves = useMemo(() => {
    const N = 4;
    const leaf = (
      i: number,
      front: { cover?: boolean; slot?: keyof typeof IMAGES.yearbook; cap?: string },
      back: {
        endcover?: boolean;
        slot?: keyof typeof IMAGES.yearbook;
        cap?: string;
      }
    ) => ({
      front,
      back,
      tf: i < page ? "rotateY(-179deg)" : "rotateY(0deg)",
      z: i < page ? i : N - i,
    });
    return [
      leaf(0, { cover: true }, { slot: "yb1", cap: "Tân sinh viên · 2023" }),
      leaf(
        1,
        { slot: "yb2", cap: "Những người bạn thân" },
        { slot: "yb3", cap: "Đêm trắng đồ án" }
      ),
      leaf(
        2,
        { slot: "yb4", cap: "Ngày bảo vệ" },
        { slot: "yb5", cap: "Khoảnh khắc tốt nghiệp" }
      ),
      leaf(3, { slot: "yb6", cap: "Một thời để nhớ" }, { endcover: true }),
    ];
  }, [page]);

  useEffect(() => {
    const hero = heroRef.current;
    const cap = capRef.current;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeBack = (t: number) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };
    if (hero) {
      hero.style.opacity = "0";
      hero.style.transform = "translateY(18px)";
    }
    if (cap) cap.style.transform = "translateY(-115vh) rotate(-32deg)";
    const start = performance.now();
    const step = (now: number) => {
      const t1 = Math.min(1, (now - start) / 800);
      const t2 = Math.min(1, (now - start) / 1100);
      if (hero) {
        hero.style.opacity = String(easeOut(t1));
        hero.style.transform = `translateY(${18 * (1 - easeOut(t1))}px)`;
      }
      if (cap) {
        const b = easeBack(t2);
        cap.style.transform = `translateY(${-115 * (1 - b)}vh) rotate(${-32 * (1 - t2)}deg)`;
      }
      if (t1 < 1 || t2 < 1) requestAnimationFrame(step);
      else {
        if (hero) hero.style.transform = "none";
        if (cap) cap.style.transform = "none";
      }
    };
    requestAnimationFrame(step);
    const t = setTimeout(() => launch(150), 450);
    return () => clearTimeout(t);
  }, [launch]);

  const submitRSVP = useCallback(async () => {
    const name = rName.trim();
    if (!name || !rAttend) return;
    setRsvpSubmitting(true);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, attend: rAttend, message: rMsg }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setRDone(true);
      if (rAttend === "yes") launch(90);
    } catch (e) {
      console.error(e);
    } finally {
      setRsvpSubmitting(false);
    }
  }, [launch, rAttend, rMsg, rName]);

  const yes = rAttend === "yes";
  const rsvpIcon = yes ? "🎉" : "💛";
  const rsvpTitle = yes ? "Hẹn gặp bạn nhé!" : "Cảm ơn bạn rất nhiều!";
  const rsvpSub = yes
    ? "Diễm rất vui khi có bạn cùng chia sẻ ngày đặc biệt này."
    : "Dù không đến được, lời chúc của bạn vẫn rất ý nghĩa với Diễm.";

  return (
    <div className="invitation-root">
      {/* HERO */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "64px 24px 90px",
          overflow: "hidden",
          background:
            "radial-gradient(120% 90% at 50% 0%, #FCEFF2 0%, #F4ECF6 45%, #EDF3EE 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -60,
            left: -80,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(243,198,206,.7), rgba(243,198,206,0) 70%)",
            filter: "blur(8px)",
            animation: "floatA 11s ease-in-out infinite",
            zIndex: 0,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -70,
            right: -70,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(217,205,234,.7), rgba(217,205,234,0) 70%)",
            filter: "blur(8px)",
            animation: "floatB 13s ease-in-out infinite",
            zIndex: 0,
          }}
        />
        <div
          ref={heroRef}
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div ref={capRef} style={{ width: 88, height: 62, marginBottom: 18 }}>
            <svg viewBox="0 0 100 70" width="88" height="62" aria-hidden>
              <polygon points="50,8 96,28 50,48 4,28" fill="#4F3B47" />
              <path
                d="M22 37 V51 Q50 65 78 51 V37 L50 49 Z"
                fill="#5C4753"
              />
              <circle cx="50" cy="28" r="4.5" fill="#C9A05B" />
              <path
                d="M50 28 L85 31 L85 49"
                fill="none"
                stroke="#C9A05B"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle cx="85" cy="52" r="5" fill="#C9A05B" />
            </svg>
          </div>
          <HeroInviteCopy displayName={isPersonalized ? displayName : null} />
          <div className="invite-hero-portrait-wrap">
            <div
              style={{
                position: "absolute",
                inset: -12,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#F3C6CE,#D9CDEA,#CBE7D8)",
                filter: "blur(2px)",
              }}
            />
            <ImageSlot
              src={IMAGES.portrait || undefined}
              alt="Chân dung"
              shape="circle"
              placeholder="Ảnh chân dung"
              style={{
                position: "relative",
                width: 186,
                height: 186,
                border: "4px solid #FFFCFA",
                boxShadow: "0 18px 40px rgba(79,59,71,.22)",
              }}
            />
          </div>
          <h1 className="invite-hero-graduate">
            Nguyễn Thị
            <span className="invite-hero-graduate-sub">Kiều Diễm</span>
          </h1>
          <div
            style={{
              margin: "22px 0 6px",
              fontSize: 15,
              fontWeight: 500,
              color: "#5C4753",
              lineHeight: 1.65,
              maxWidth: 520,
            }}
          >
            <div>Trường Đại học Kinh tế - Đại học Đà Nẵng</div>
            <div>Ngành Digital Marketing</div>
          </div>
          <div style={{ letterSpacing: ".28em", fontSize: 13, color: "#A98AA0" }}>
            NIÊN KHÓA 2023 — 2026
          </div>
          <p
            style={{
              maxWidth: 440,
              margin: "30px 0 0",
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic",
              fontSize: 21,
              lineHeight: 1.55,
              color: "#6B5560",
            }}
          >
            “Cảm ơn — vì tất cả những yêu thương đã cùng em đi đến ngày hôm
            nay.”
          </p>
          <button
            type="button"
            className="btn-hover-lg"
            onClick={() => launch(160)}
            style={{
              marginTop: 34,
              border: "none",
              cursor: "pointer",
              background: "#4F3B47",
              color: "#FBF4EF",
              fontWeight: 600,
              fontSize: 14,
              padding: "14px 28px",
              borderRadius: 999,
              boxShadow: "0 12px 30px rgba(79,59,71,.28)",
              transition: "transform .25s",
            }}
          >
            🎓 Tung mũ chúc mừng
          </button>
        </div>
        <div className="scroll-hint-anchor">
          <div className="scroll-hint-bob">
            <span className="scroll-hint-bob__label">KÉO XUỐNG</span>
            <span style={{ fontSize: 18, lineHeight: 1 }}>↓</span>
          </div>
        </div>
      </section>

      {/* COUNTDOWN */}
      <section
        style={{
          position: "relative",
          padding: "78px 24px",
          background: "#4F3B47",
          color: "#FBF4EF",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontFamily: "'Be Vietnam Pro'",
            letterSpacing: ".34em",
            fontSize: 12,
            fontWeight: 600,
            color: "#E0B7C2",
            textTransform: "uppercase",
          }}
        >
          Đếm ngược đến ngày trọng đại
        </div>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 34,
            margin: "14px 0 38px",
            color: "#FBF4EF",
          }}
        >
          Còn một chút nữa thôi…
        </h2>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {(
            [
              ["NGÀY", cd.d],
              ["GIỜ", cd.h],
              ["PHÚT", cd.m],
              ["GIÂY", cd.s],
            ] as const
          ).map(([label, val]) => (
            <div
              key={label}
              style={{
                minWidth: 108,
                padding: "22px 14px",
                background: "rgba(251,244,239,.07)",
                border: "1px solid rgba(201,160,91,.4)",
                borderRadius: 18,
                backdropFilter: "blur(4px)",
              }}
            >
              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  fontSize: 48,
                  lineHeight: 1,
                  color: "#F3D7A8",
                }}
              >
                {val}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  letterSpacing: ".2em",
                  color: "#D9C3CD",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* EVENT */}
      <section style={{ padding: "84px 24px", background: "#FBF4EF" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ textAlign: "center", margin: "0 auto 46px", maxWidth: 620 }}>
            <div
              style={{
                letterSpacing: ".32em",
                fontSize: 12,
                fontWeight: 600,
                color: "#C9A05B",
                textTransform: "uppercase",
              }}
            >
              Thông tin buổi lễ
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 600,
                fontSize: "clamp(28px, 5.2vw, 42px)",
                color: "#4F3B47",
                margin: "10px 0 0",
              }}
            >
              Lễ Tốt Nghiệp
            </h2>
          </div>
          <div className="event-grid">
            <div
              style={{
                background: "#FFFCFA",
                border: "1px solid rgba(201,160,91,.25)",
                borderRadius: 22,
                padding: "38px 34px",
                boxShadow: "0 16px 40px rgba(79,59,71,.08)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 30,
              }}
            >
              <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                <div
                  style={{
                    flex: "none",
                    width: 54,
                    height: 54,
                    borderRadius: 16,
                    background: "linear-gradient(150deg,#F3C6CE,#E59FAC)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                  }}
                >
                  📅
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: ".18em",
                      color: "#A98AA0",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Thời gian
                  </div>
                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 24,
                      color: "#4F3B47",
                    }}
                  >
                    16:00
                  </div>
                  <div style={{ fontSize: 15, color: "#6B5560" }}>
                    Chủ Nhật, ngày 28 tháng 06, 2026
                  </div>
                </div>
              </div>
              <div style={{ height: 1, background: "rgba(201,160,91,.22)" }} />
              <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                <div
                  style={{
                    flex: "none",
                    width: 54,
                    height: 54,
                    borderRadius: 16,
                    background: "linear-gradient(150deg,#D9CDEA,#B9A5D6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                  }}
                >
                  📍
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: ".18em",
                      color: "#A98AA0",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Địa điểm
                  </div>
                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 24,
                      color: "#4F3B47",
                    }}
                  >
                    Sảnh A
                  </div>
                  <div style={{ fontSize: 15, color: "#6B5560" }}>
                    Trường Đại học Kinh tế - Đại học Đà Nẵng
                    <br />
                    71 Ngũ Hành Sơn, Đà Nẵng
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a
                  className="btn-hover"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(EVENT_MAPS_QUERY)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    minWidth: 150,
                    textAlign: "center",
                    textDecoration: "none",
                    background: "#4F3B47",
                    color: "#FBF4EF",
                    fontWeight: 600,
                    fontSize: 14,
                    padding: "14px 18px",
                    borderRadius: 999,
                  }}
                >
                  🧭 Chỉ đường
                </a>
                <a
                  className="btn-hover"
                  href={`https://maps.google.com/?q=${encodeURIComponent(EVENT_MAPS_QUERY)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    minWidth: 150,
                    textAlign: "center",
                    textDecoration: "none",
                    background: "#FBEAEE",
                    color: "#4F3B47",
                    fontWeight: 600,
                    fontSize: 14,
                    padding: "14px 18px",
                    borderRadius: 999,
                    border: "1px solid rgba(229,159,172,.5)",
                  }}
                >
                  📱 Mở trên điện thoại
                </a>
              </div>
            </div>
            <div
              style={{
                borderRadius: 22,
                overflow: "hidden",
                boxShadow: "0 16px 40px rgba(79,59,71,.12)",
                border: "1px solid rgba(201,160,91,.25)",
                minHeight: 380,
              }}
            >
              <iframe
                title="Bản đồ địa điểm"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(EVENT_MAPS_QUERY)}&z=15&output=embed`}
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: 380,
                  border: 0,
                  display: "block",
                }}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ALBUM */}
      <section
        style={{
          padding: "84px 24px",
          background: "linear-gradient(180deg,#F4ECF6,#FBF4EF)",
          overflow: "hidden",
        }}
      >
        <div style={{ textAlign: "center", margin: "0 auto 50px", maxWidth: 620 }}>
          <div
            style={{
              letterSpacing: ".32em",
              fontSize: 12,
              fontWeight: 600,
              color: "#C9A05B",
              textTransform: "uppercase",
            }}
          >
            Album hành trình
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 600,
              fontSize: "clamp(28px, 5.2vw, 42px)",
              color: "#4F3B47",
              margin: "10px 0 0",
            }}
          >
            Bốn năm thanh xuân
          </h2>
          <p style={{ color: "#7A6470", fontSize: 15, margin: "14px 0 0" }}>
            Những khoảnh khắc đáng nhớ trên hành trình học tập.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 26,
            justifyContent: "center",
            flexWrap: "wrap",
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          {ALBUM.map((a) => (
            <div
              key={a.key}
              style={{
                flex: "none",
                width: 206,
                background: "#FFFCFA",
                padding: "13px 13px 0",
                borderRadius: 5,
                boxShadow: "0 14px 30px rgba(79,59,71,.16)",
              }}
            >
              <ImageSlot
                src={IMAGES.album[a.key] || undefined}
                alt={a.cap}
                placeholder="Ảnh album"
                style={{ width: "100%", height: 200 }}
              />
              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: "italic",
                  fontSize: 17,
                  color: "#5C4753",
                  textAlign: "center",
                  padding: "15px 4px 20px",
                }}
              >
                {a.cap}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* YEARBOOK */}
      <section
        style={{
          padding: "84px 24px 96px",
          background: "#FBF4EF",
          textAlign: "center",
        }}
      >
        <div style={{ textAlign: "center", margin: "0 auto 44px", maxWidth: 620 }}>
          <div
            style={{
              letterSpacing: ".32em",
              fontSize: 12,
              fontWeight: 600,
              color: "#C9A05B",
              textTransform: "uppercase",
            }}
          >
            Cuốn kỷ yếu
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 600,
              fontSize: "clamp(28px, 5.2vw, 42px)",
              color: "#4F3B47",
              margin: "10px 0 0",
            }}
          >
            Lật từng trang ký ức
          </h2>
        </div>
        <div
          style={{
            position: "relative",
            width: 560,
            maxWidth: "100%",
            height: 380,
            perspective: 2400,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "50%",
              height: 380,
              borderRadius: "6px 0 0 6px",
              background: "#F1E4DC",
              boxShadow: "inset -22px 0 34px rgba(79,59,71,.14)",
              border: "1px solid rgba(201,160,91,.3)",
            }}
          />
          {leaves.map((lf, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                width: "50%",
                height: 380,
                transformOrigin: "left center",
                transformStyle: "preserve-3d",
                transition: "transform .95s cubic-bezier(.645,.045,.355,1)",
                transform: lf.tf,
                zIndex: lf.z,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backfaceVisibility: "hidden",
                  borderRadius: "0 6px 6px 0",
                  overflow: "hidden",
                  background: "#FFFCFA",
                  border: "1px solid rgba(201,160,91,.32)",
                  boxShadow: "6px 6px 22px rgba(79,59,71,.16)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {lf.front.cover ? (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 14,
                      background: "linear-gradient(160deg,#F3C6CE,#D9CDEA)",
                      padding: 24,
                    }}
                  >
                    <div style={{ letterSpacing: ".34em", fontSize: 11, color: "#5C4753" }}>
                      KỶ YẾU
                    </div>
                    <div
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontStyle: "italic",
                        fontWeight: 600,
                        fontSize: 30,
                        color: "#4F3B47",
                      }}
                    >
                      2023 — 2026
                    </div>
                    <div
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 20,
                        color: "#6B5560",
                      }}
                    >
                      Kiều Diễm
                    </div>
                  </div>
                ) : lf.front.slot ? (
                  <>
                    <ImageSlot
                      src={IMAGES.yearbook[lf.front.slot] || undefined}
                      alt={lf.front.cap ?? ""}
                      placeholder="Ảnh kỷ yếu"
                      style={{ width: "100%", flex: 1, minHeight: 280 }}
                    />
                    <div
                      style={{
                        padding: "11px 14px",
                        fontFamily: "'Playfair Display', serif",
                        fontStyle: "italic",
                        fontSize: 15,
                        color: "#5C4753",
                        borderTop: "1px solid rgba(201,160,91,.3)",
                      }}
                    >
                      {lf.front.cap}
                    </div>
                  </>
                ) : null}
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  borderRadius: "6px 0 0 6px",
                  overflow: "hidden",
                  background: "#FFFCFA",
                  border: "1px solid rgba(201,160,91,.32)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {lf.back.endcover ? (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(160deg,#CBE7D8,#D9CDEA)",
                      padding: 24,
                      textAlign: "center",
                      fontFamily: "'Playfair Display', serif",
                      fontStyle: "italic",
                      fontSize: 24,
                      color: "#4F3B47",
                    }}
                  >
                    Cảm ơn vì đã
                    <br />
                    đồng hành 💛
                  </div>
                ) : lf.back.slot ? (
                  <>
                    <ImageSlot
                      src={IMAGES.yearbook[lf.back.slot] || undefined}
                      alt={lf.back.cap ?? ""}
                      placeholder="Ảnh kỷ yếu"
                      style={{ width: "100%", flex: 1, minHeight: 280 }}
                    />
                    <div
                      style={{
                        padding: "11px 14px",
                        fontFamily: "'Playfair Display', serif",
                        fontStyle: "italic",
                        fontSize: 15,
                        color: "#5C4753",
                        borderTop: "1px solid rgba(201,160,91,.3)",
                      }}
                    >
                      {lf.back.cap}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            marginTop: 34,
          }}
        >
          <button
            type="button"
            className="btn-hover"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            style={{
              border: "1px solid rgba(201,160,91,.5)",
              background: "#FFFCFA",
              color: "#4F3B47",
              fontWeight: 600,
              fontSize: 14,
              padding: "11px 22px",
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            ← Trang trước
          </button>
          <span style={{ fontSize: 13, color: "#A98AA0", minWidth: 78 }}>
            {page} / 4
          </span>
          <button
            type="button"
            className="btn-hover"
            onClick={() => setPage((p) => Math.min(4, p + 1))}
            style={{
              border: "none",
              background: "#4F3B47",
              color: "#FBF4EF",
              fontWeight: 600,
              fontSize: 14,
              padding: "11px 22px",
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            Trang sau →
          </button>
        </div>
      </section>

      {/* WISH GLOBE — lời chúc từ khắp nơi */}
      <section
        style={{
          padding: "84px 24px",
          background: "linear-gradient(180deg,#EDF3EE,#FBF4EF)",
        }}
      >
        <div style={{ textAlign: "center", margin: "0 auto 40px", maxWidth: 640 }}>
          <div
            style={{
              letterSpacing: ".32em",
              fontSize: 12,
              fontWeight: 600,
              color: "#C9A05B",
              textTransform: "uppercase",
            }}
          >
            Bản đồ lời chúc
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 600,
              fontSize: "clamp(30px, 5vw, 42px)",
              color: "#4F3B47",
              margin: "10px 0 0",
            }}
          >
            Lời chúc từ khắp nơi
          </h2>
          <p
            style={{
              color: "#7A6470",
              fontSize: 15,
              margin: "14px auto 0",
              maxWidth: 520,
              lineHeight: 1.55,
            }}
          >
            Mỗi lời chúc kèm vị trí sẽ hiện thành một điểm sáng trên quả địa cầu.
            Xoay và phóng to để xem nhé!
          </p>
        </div>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <WishGlobe
            points={globePoints}
            eventLat={EVENT_GEO.lat}
            eventLng={EVENT_GEO.lng}
          />
        </div>
        <div style={{ textAlign: "center", marginTop: 30 }}>
          <Link
            href={hrefWithInviteSlug(pathname, "luu-but")}
            className="btn-hover-lg"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              background: "linear-gradient(135deg,#F3C6CE,#E59FAC)",
              color: "#4F3B47",
              fontWeight: 700,
              fontSize: 15,
              padding: "14px 26px",
              borderRadius: 999,
              boxShadow: "0 12px 28px rgba(79,59,71,.18)",
              transition: "transform .2s",
            }}
          >
            Để lại lời chúc của bạn →
          </Link>
        </div>
      </section>

      <LuuButPromoSection />

      {/* RSVP */}
      <section
        style={{
          padding: "88px 24px 96px",
          background: "linear-gradient(180deg,#FCEFF2,#F4ECF6)",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              letterSpacing: ".32em",
              fontSize: 12,
              fontWeight: 600,
              color: "#C9A05B",
              textTransform: "uppercase",
            }}
          >
            Xác nhận tham dự
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 600,
              fontSize: "clamp(28px, 5.2vw, 42px)",
              color: "#4F3B47",
              margin: "10px 0 8px",
            }}
          >
            Bạn sẽ đến chứ?
          </h2>
          <p style={{ color: "#7A6470", fontSize: 15, margin: "0 0 34px" }}>
            Diễm rất mong được gặp bạn trong ngày đặc biệt này.
          </p>
          {rDone ? (
            <div
              style={{
                background: "#FFFCFA",
                borderRadius: 24,
                padding: "48px 36px",
                boxShadow: "0 20px 50px rgba(79,59,71,.12)",
                border: "1px solid rgba(201,160,91,.3)",
              }}
            >
              <div style={{ fontSize: 52, lineHeight: 1 }}>{rsvpIcon}</div>
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: "italic",
                  fontSize: 28,
                  color: "#4F3B47",
                  margin: "18px 0 10px",
                }}
              >
                {rsvpTitle}
              </h3>
              <p style={{ color: "#6B5560", fontSize: 15, margin: 0 }}>{rsvpSub}</p>
            </div>
          ) : (
            <div
              style={{
                background: "#FFFCFA",
                borderRadius: 24,
                padding: "34px 32px",
                boxShadow: "0 20px 50px rgba(79,59,71,.1)",
                border: "1px solid rgba(201,160,91,.25)",
                textAlign: "left",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  letterSpacing: ".16em",
                  color: "#A98AA0",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Họ và tên
              </label>
              <input
                value={rName}
                onChange={(e) => onRNameChange(e.target.value)}
                placeholder="Tên của bạn"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(201,160,91,.4)",
                  background: "#FBF4EF",
                  color: "#4F3B47",
                  fontSize: 15,
                  outline: "none",
                  marginBottom: 20,
                }}
              />
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  letterSpacing: ".16em",
                  color: "#A98AA0",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Bạn sẽ tham dự?
              </label>
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                {(
                  [
                    ["yes", "Có, tôi sẽ đến 🎉"],
                    ["no", "Tiếc quá, không đến được"],
                  ] as const
                ).map(([key, label]) => {
                  const on = rAttend === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className="btn-hover"
                      onClick={() => setRAttend(key)}
                      style={{
                        flex: 1,
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: 14,
                        padding: "14px 12px",
                        borderRadius: 14,
                        background:
                          on
                            ? key === "yes"
                              ? "#E59FAC"
                              : "#D9CDEA"
                            : "#FBF4EF",
                        color: on ? "#FFFCFA" : "#6B5560",
                        border: on
                          ? "1px solid transparent"
                          : "1px solid rgba(201,160,91,.4)",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  letterSpacing: ".16em",
                  color: "#A98AA0",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Lời nhắn (tuỳ chọn)
              </label>
              <textarea
                value={rMsg}
                onChange={(e) => setRMsg(e.target.value)}
                placeholder="Gửi lời chúc mừng tới Diễm…"
                rows={3}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(201,160,91,.4)",
                  background: "#FBF4EF",
                  color: "#4F3B47",
                  fontSize: 15,
                  outline: "none",
                  resize: "vertical",
                  marginBottom: 22,
                }}
              />
              <button
                type="button"
                className="btn-hover"
                disabled={rsvpSubmitting}
                onClick={() => void submitRSVP()}
                style={{
                  width: "100%",
                  border: "none",
                  cursor: rsvpSubmitting ? "wait" : "pointer",
                  background: "#4F3B47",
                  color: "#FBF4EF",
                  fontWeight: 700,
                  fontSize: 16,
                  padding: 16,
                  borderRadius: 999,
                }}
              >
                {rsvpSubmitting ? "Đang gửi…" : "Gửi xác nhận"}
              </button>
              <p
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  color: "#B49AAC",
                  margin: "14px 0 0",
                }}
              >
                RSVP được lưu vào <code>data/rsvp.csv</code> trên server.
              </p>
            </div>
          )}
        </div>
        <div style={{ textAlign: "center", marginTop: 64 }}>
          <div style={{ width: 56, height: 40, margin: "0 auto 14px" }}>
            <svg viewBox="0 0 100 70" width="56" height="40" aria-hidden>
              <polygon points="50,8 96,28 50,48 4,28" fill="#C9A05B" />
              <path d="M22 37 V51 Q50 65 78 51 V37 L50 49 Z" fill="#D9B884" />
              <circle cx="50" cy="28" r="4.5" fill="#4F3B47" />
            </svg>
          </div>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic",
              fontSize: 20,
              color: "#6B5560",
              margin: 0,
            }}
          >
            Với tất cả lòng biết ơn — Kiều Diễm
          </p>
        </div>
      </section>

      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 60,
        }}
      />
    </div>
  );
}
