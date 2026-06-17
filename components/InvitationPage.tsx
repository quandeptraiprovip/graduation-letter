"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageSlot } from "@/components/ImageSlot";
import { EVENT_ISO, IMAGES, SHOW_FRIEND_MAP } from "@/lib/config";
import type { GuestEntry } from "@/lib/guestbook-store";
import { useAmbientMusic } from "@/hooks/useAmbientMusic";
import { useConfetti } from "@/hooks/useConfetti";
import { useCountdown } from "@/hooks/useCountdown";

type DisplayGuest = {
  name: string;
  msg: string;
  emoji: string;
  when: string;
};

function formatWhen(ts: string) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDisplay(entries: GuestEntry[]): DisplayGuest[] {
  return entries.map((g) => ({
    name: g.name,
    msg: g.message,
    emoji: g.emoji,
    when: formatWhen(g.timestamp),
  }));
}

const ALBUM = [
  { key: "al1" as const, cap: "Ngày khai giảng" },
  { key: "al2" as const, cap: "Hội bạn thân" },
  { key: "al3" as const, cap: "Góc thư viện" },
  { key: "al4" as const, cap: "Mùa đồ án" },
  { key: "al5" as const, cap: "Ngày ra trường" },
];

const FRIENDS = [
  {
    name: "Minh",
    place: "Hà Nội",
    msg: "Tự hào về cậu! Chặng đường mới rực rỡ nhé.",
    emoji: "🌟",
  },
  {
    name: "Hương",
    place: "Đà Nẵng",
    msg: "Cố lên nha bạn hiền, tụi mình luôn bên cậu!",
    emoji: "🌸",
  },
  {
    name: "Lan",
    place: "TP.HCM",
    msg: "Chúc mừng nhé! Mong em luôn hạnh phúc và thành công.",
    emoji: "💖",
  },
  {
    name: "Quốc",
    place: "Singapore",
    msg: "Congrats from afar! Tự hào về Diễm lắm đó.",
    emoji: "🎉",
  },
];

const EMOJI_LIST = ["💖", "🎓", "🌷", "🎉", "🥰", "👏", "🌟", "🙌"];

type Props = {
  initialGuests: GuestEntry[];
};

export function InvitationPage({ initialGuests }: Props) {
  const cd = useCountdown(EVENT_ISO);
  const { canvasRef, launch } = useConfetti();
  const { toggle, label: musicLabel } = useAmbientMusic();

  const heroRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(0);
  const [activeFriend, setActiveFriend] = useState(2);
  const [guests, setGuests] = useState<DisplayGuest[]>(() =>
    toDisplay(initialGuests)
  );
  const [gName, setGName] = useState("");
  const [gMsg, setGMsg] = useState("");
  const [gEmoji, setGEmoji] = useState("💖");
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  const [rName, setRName] = useState("");
  const [rAttend, setRAttend] = useState<"" | "yes" | "no">("");
  const [rMsg, setRMsg] = useState("");
  const [rDone, setRDone] = useState(false);
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);

  const af = FRIENDS[activeFriend] ?? FRIENDS[2];

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
      leaf(0, { cover: true }, { slot: "yb1", cap: "Tân sinh viên · 2021" }),
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

  const addGuest = useCallback(async () => {
    const name = gName.trim();
    const msg = gMsg.trim();
    if (!name || !msg) return;
    setGuestSubmitting(true);
    setGuestError(null);
    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message: msg, emoji: gEmoji }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gửi thất bại");
      const entry = data.entry as GuestEntry;
      setGuests((prev) => [
        {
          name: entry.name,
          msg: entry.message,
          emoji: entry.emoji,
          when: formatWhen(entry.timestamp),
        },
        ...prev,
      ]);
      setGName("");
      setGMsg("");
      setGEmoji("💖");
      launch(45);
    } catch (e) {
      setGuestError(e instanceof Error ? e.message : "Không gửi được lời chúc");
    } finally {
      setGuestSubmitting(false);
    }
  }, [gEmoji, gMsg, gName, launch]);

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
          <div
            style={{
              letterSpacing: ".36em",
              fontSize: 12,
              fontWeight: 600,
              color: "#C9A05B",
              textTransform: "uppercase",
            }}
          >
            Trân trọng kính mời
          </div>
          <div style={{ position: "relative", margin: "26px 0 22px" }}>
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
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: "clamp(42px, 8vw, 62px)",
              lineHeight: 1.04,
              margin: 0,
              color: "#4F3B47",
            }}
          >
            Nguyễn Thị
            <br />
            Kiều Diễm
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              margin: "22px 0 6px",
              fontSize: 15,
              fontWeight: 500,
              color: "#5C4753",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <span>Đại học Bách Khoa TP.HCM</span>
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#C9A05B",
              }}
            />
            <span>Khoa Học Máy Tính</span>
          </div>
          <div style={{ letterSpacing: ".28em", fontSize: 13, color: "#A98AA0" }}>
            NIÊN KHÓA 2021 — 2025
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
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            color: "#B49AAC",
            fontSize: 11,
            letterSpacing: ".22em",
            zIndex: 2,
            animation: "bob 2.4s ease-in-out infinite",
          }}
        >
          <span>KÉO XUỐNG</span>
          <span style={{ fontSize: 18, lineHeight: 1 }}>↓</span>
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
                fontSize: 42,
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
                    9:00 sáng
                  </div>
                  <div style={{ fontSize: 15, color: "#6B5560" }}>
                    Chủ Nhật, ngày 20 tháng 07, 2026
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
                    Hội trường A
                  </div>
                  <div style={{ fontSize: 15, color: "#6B5560" }}>
                    ĐH Bách Khoa — 268 Lý Thường Kiệt,
                    <br />
                    Phường 14, Quận 10, TP.HCM
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a
                  className="btn-hover"
                  href="https://www.google.com/maps/dir/?api=1&destination=268%20L%C3%BD%20Th%C6%B0%E1%BB%9Dng%20Ki%E1%BB%87t%2C%20Qu%E1%BA%ADn%2010%2C%20TP.HCM"
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
                  href="https://maps.google.com/?q=268%20L%C3%BD%20Th%C6%B0%E1%BB%9Dng%20Ki%E1%BB%87t%2C%20Qu%E1%BA%ADn%2010%2C%20TP.HCM"
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
                src="https://maps.google.com/maps?q=268%20L%C3%BD%20Th%C6%B0%E1%BB%9Dng%20Ki%E1%BB%87t%2C%20Qu%E1%BA%ADn%2010%2C%20TP.HCM&z=15&output=embed"
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
              fontSize: 42,
              color: "#4F3B47",
              margin: "10px 0 0",
            }}
          >
            Bốn năm thanh xuân
          </h2>
          <p style={{ color: "#7A6470", fontSize: 15, margin: "14px 0 0" }}>
            Ảnh sẽ được cập nhật trong thư mục <code>public/images</code>.
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
              fontSize: 42,
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
                      2021 — 2025
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

      {SHOW_FRIEND_MAP && (
        <section
          style={{
            padding: "84px 24px",
            background: "linear-gradient(180deg,#EDF3EE,#FBF4EF)",
          }}
        >
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
              Bản đồ bạn bè
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 600,
                fontSize: 42,
                color: "#4F3B47",
                margin: "10px 0 0",
              }}
            >
              Lời chúc từ khắp nơi
            </h2>
          </div>
          <div className="friend-grid" style={{ maxWidth: 880, margin: "0 auto" }}>
            <div
              style={{
                position: "relative",
                height: 440,
                borderRadius: 24,
                background:
                  "radial-gradient(80% 60% at 55% 40%, rgba(203,231,216,.5), rgba(217,205,234,.35))",
                border: "1px solid rgba(201,160,91,.25)",
                boxShadow: "0 16px 40px rgba(79,59,71,.1)",
                overflow: "hidden",
              }}
            >
              {(
                [
                  [0, "13%", "50%", "Hà Nội", "#E59FAC", 16],
                  [1, "46%", "62%", "Đà Nẵng", "#C9A05B", 16],
                  [2, "79%", "40%", "TP.HCM", "#B9A5D6", 18],
                  [3, "90%", "80%", "Hải ngoại", "#7FB7E0", 14],
                ] as const
              ).map(([idx, top, left, label, color, size]) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveFriend(idx)}
                  style={{
                    position: "absolute",
                    top,
                    left,
                    transform: "translateX(-50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 5,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: size,
                      height: size,
                      borderRadius: "50%",
                      background: color,
                      border: "3px solid #FFFCFA",
                      boxShadow: "0 4px 12px rgba(79,59,71,.25)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#4F3B47",
                      background: "#FFFCFAcc",
                      padding: "3px 9px",
                      borderRadius: 999,
                    }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
            <div
              style={{
                background: "#FFFCFA",
                borderRadius: 22,
                padding: "36px 32px",
                boxShadow: "0 16px 40px rgba(79,59,71,.1)",
                border: "1px solid rgba(201,160,91,.25)",
              }}
            >
              <div style={{ fontSize: 40, lineHeight: 1 }}>{af.emoji}</div>
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: "italic",
                  fontSize: 24,
                  lineHeight: 1.45,
                  color: "#4F3B47",
                  margin: "16px 0 20px",
                }}
              >
                “{af.msg}”
              </p>
              <div style={{ fontWeight: 600, fontSize: 16, color: "#5C4753" }}>
                {af.name}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#A98AA0",
                  letterSpacing: ".1em",
                  marginTop: 2,
                }}
              >
                {af.place}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* GUESTBOOK */}
      <section
        style={{
          padding: "84px 24px",
          background: "#4F3B47",
          color: "#FBF4EF",
        }}
      >
        <div style={{ textAlign: "center", margin: "0 auto 46px", maxWidth: 620 }}>
          <div
            style={{
              letterSpacing: ".32em",
              fontSize: 12,
              fontWeight: 600,
              color: "#E0B7C2",
              textTransform: "uppercase",
            }}
          >
            Sổ lưu bút
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 600,
              fontSize: 42,
              color: "#FBF4EF",
              margin: "10px 0 0",
            }}
          >
            Để lại lời chúc nhé
          </h2>
        </div>
        <div className="guest-grid" style={{ maxWidth: 980, margin: "0 auto" }}>
          <div
            style={{
              background: "rgba(251,244,239,.06)",
              border: "1px solid rgba(201,160,91,.35)",
              borderRadius: 22,
              padding: "28px 26px",
              backdropFilter: "blur(4px)",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: 12,
                letterSpacing: ".16em",
                color: "#D9C3CD",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Tên của bạn
            </label>
            <input
              value={gName}
              onChange={(e) => setGName(e.target.value)}
              placeholder="VD: Chị Lan"
              style={{
                width: "100%",
                padding: "13px 15px",
                borderRadius: 12,
                border: "1px solid rgba(201,160,91,.4)",
                background: "rgba(251,244,239,.08)",
                color: "#FBF4EF",
                fontSize: 15,
                outline: "none",
                marginBottom: 18,
              }}
            />
            <label
              style={{
                display: "block",
                fontSize: 12,
                letterSpacing: ".16em",
                color: "#D9C3CD",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Chọn biểu tượng
            </label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 18,
              }}
            >
              {EMOJI_LIST.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setGEmoji(em)}
                  style={{
                    width: 42,
                    height: 42,
                    fontSize: 20,
                    borderRadius: 12,
                    cursor: "pointer",
                    background:
                      em === gEmoji ? "#FBEAEE" : "rgba(251,244,239,.08)",
                    border:
                      em === gEmoji
                        ? "2px solid #E59FAC"
                        : "2px solid transparent",
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                letterSpacing: ".16em",
                color: "#D9C3CD",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Lời chúc
            </label>
            <textarea
              value={gMsg}
              onChange={(e) => setGMsg(e.target.value)}
              placeholder="Viết điều gì đó thật dễ thương…"
              rows={3}
              style={{
                width: "100%",
                padding: "13px 15px",
                borderRadius: 12,
                border: "1px solid rgba(201,160,91,.4)",
                background: "rgba(251,244,239,.08)",
                color: "#FBF4EF",
                fontSize: 15,
                outline: "none",
                resize: "vertical",
                marginBottom: 18,
              }}
            />
            {guestError && (
              <p style={{ color: "#F3C6CE", fontSize: 13, margin: "0 0 12px" }}>
                {guestError}
              </p>
            )}
            <button
              type="button"
              className="btn-hover"
              disabled={guestSubmitting}
              onClick={() => void addGuest()}
              style={{
                width: "100%",
                border: "none",
                cursor: guestSubmitting ? "wait" : "pointer",
                background: "linear-gradient(135deg,#F3C6CE,#E59FAC)",
                color: "#4F3B47",
                fontWeight: 700,
                fontSize: 15,
                padding: 14,
                borderRadius: 999,
                opacity: guestSubmitting ? 0.7 : 1,
              }}
            >
              {guestSubmitting ? "Đang gửi…" : "Gửi lời chúc 💌"}
            </button>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              maxHeight: 520,
              overflowY: "auto",
              paddingRight: 6,
            }}
          >
            {guests.map((g, i) => (
              <div
                key={`${g.when}-${i}`}
                style={{
                  background: "#FBF4EF",
                  color: "#4F3B47",
                  borderRadius: 18,
                  padding: "20px 22px",
                  boxShadow: "0 10px 26px rgba(0,0,0,.18)",
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ fontSize: 28, lineHeight: 1 }}>{g.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 16, lineHeight: 1.5 }}>
                      {g.msg}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontStyle: "italic",
                          fontSize: 15,
                          color: "#8A5E6E",
                        }}
                      >
                        — {g.name}
                      </span>
                      <span style={{ fontSize: 12, color: "#B49AAC" }}>
                        · {g.when}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
              fontSize: 42,
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
                onChange={(e) => setRName(e.target.value)}
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
                    ["yes", "Có, em sẽ đến 🎉"],
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
      <button
        type="button"
        className="btn-hover"
        onClick={toggle}
        style={{
          position: "fixed",
          bottom: 22,
          right: 22,
          zIndex: 70,
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          border: "1px solid rgba(201,160,91,.5)",
          background: "#FFFCFAee",
          color: "#4F3B47",
          fontWeight: 600,
          fontSize: 13,
          padding: "11px 16px",
          borderRadius: 999,
          boxShadow: "0 10px 26px rgba(79,59,71,.2)",
          backdropFilter: "blur(6px)",
        }}
      >
        {musicLabel}
      </button>
    </div>
  );
}
