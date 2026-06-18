"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";
import { FloatingWishes } from "@/components/FloatingWishes";
import type { GlobeWishPoint } from "@/components/WishGlobe";
import { captureWishLocation } from "@/lib/capture-wish-location";
import { EVENT_GEO } from "@/lib/config";
import type { GuestEntry } from "@/lib/guestbook-store";
import type { ContributionEntry } from "@/lib/contribution-display";
import { resolveContribImageSrc } from "@/lib/contribution-display";
import { useConfetti } from "@/hooks/useConfetti";

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

const EMOJI_LIST = ["💖", "🎓", "🌷", "🎉", "🥰", "👏", "🌟", "🙌"];
const TILTS = ["-2.4deg", "1.8deg", "-1.2deg", "2.6deg", "-3deg", "1.2deg"];

type DisplayGuest = {
  name: string;
  msg: string;
  emoji: string;
  when: string;
  lat?: number;
  lng?: number;
  place?: string;
  timestamp: string;
};

function formatGuestWhen(ts: string) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDisplay(entries: GuestEntry[]): DisplayGuest[] {
  return entries.map((g) => ({
    name: g.name,
    msg: g.message,
    emoji: g.emoji,
    when: formatGuestWhen(g.timestamp),
    timestamp: g.timestamp,
    ...(g.lat !== undefined && g.lng !== undefined
      ? { lat: g.lat, lng: g.lng }
      : {}),
    ...(g.place ? { place: g.place } : {}),
  }));
}

type Props = {
  initialGuests: GuestEntry[];
  initialContributions: ContributionEntry[];
};

export function GuestbookSignatureClient({
  initialGuests,
  initialContributions,
}: Props) {
  const { canvasRef, launch } = useConfetti();

  // ---------- Lưu bút (guestbook) ----------
  const [guests, setGuests] = useState<DisplayGuest[]>(() =>
    toDisplay(initialGuests)
  );
  const [gName, setGName] = useState("");
  const [gMsg, setGMsg] = useState("");
  const [gEmoji, setGEmoji] = useState("💖");
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [shareWishLocation, setShareWishLocation] = useState(true);
  const [locationHint, setLocationHint] = useState<string | null>(null);

  // ---------- Gửi ảnh & ký tên (contributions) ----------
  const fileRef = useRef<HTMLInputElement>(null);
  const padRef = useRef<SignaturePadHandle>(null);
  const [draftPhoto, setDraftPhoto] = useState("");
  const [items, setItems] = useState<ContributionEntry[]>(initialContributions);
  const [contribSubmitting, setContribSubmitting] = useState(false);
  const [contribError, setContribError] = useState<string | null>(null);
  const [contribDone, setContribDone] = useState(false);

  const globePoints = useMemo((): GlobeWishPoint[] => {
    return guests
      .filter(
        (g): g is DisplayGuest & { lat: number; lng: number } =>
          g.lat !== undefined && g.lng !== undefined
      )
      .map((g) => ({
        id: `${g.timestamp}-${g.name}`,
        lat: g.lat,
        lng: g.lng,
        name: g.name,
        emoji: g.emoji,
        msg: g.msg,
        place: g.place,
      }));
  }, [guests]);

  useEffect(() => {
    fetch("/api/guestbook", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.entries?.length) {
          setGuests(toDisplay(data.entries as GuestEntry[]));
        }
      })
      .catch(() => {});
    fetch("/api/contributions", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.entries)) {
          setItems(data.entries as ContributionEntry[]);
        }
      })
      .catch(() => {});
  }, []);

  const addGuest = useCallback(async () => {
    const name = gName.trim();
    const msg = gMsg.trim();
    if (!name || !msg) return;
    setGuestSubmitting(true);
    setGuestError(null);
    setLocationHint(null);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      let place: string | undefined;
      if (shareWishLocation) {
        const loc = await captureWishLocation();
        if (loc) {
          lat = loc.lat;
          lng = loc.lng;
          place = loc.place || undefined;
        } else {
          setLocationHint(
            "Không lấy được vị trí (bạn có thể từ chối quyền). Lời chúc vẫn được gửi."
          );
        }
      }
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message: msg, emoji: gEmoji, lat, lng, place }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gửi thất bại");
      const entry = data.entry as GuestEntry;
      setGuests((prev) => [
        {
          name: entry.name,
          msg: entry.message,
          emoji: entry.emoji,
          when: formatGuestWhen(entry.timestamp),
          timestamp: entry.timestamp,
          ...(entry.lat !== undefined && entry.lng !== undefined
            ? { lat: entry.lat, lng: entry.lng }
            : {}),
          ...(entry.place ? { place: entry.place } : {}),
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
  }, [gEmoji, gMsg, gName, launch, shareWishLocation]);

  // ---------- photo picker ----------
  const onPick = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const max = 1100;
        let w = img.width;
        let h = img.height;
        if (w > max || h > max) {
          const r = Math.min(max / w, max / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        cv.getContext("2d")?.drawImage(img, 0, 0, w, h);
        setDraftPhoto(cv.toDataURL("image/jpeg", 0.82));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const submitContribution = useCallback(async () => {
    const photoDataUrl = draftPhoto || undefined;
    const sigDataUrl =
      padRef.current && !padRef.current.isEmpty()
        ? padRef.current.toDataURL()
        : undefined;
    if (!photoDataUrl && !sigDataUrl) {
      setContribError("Hãy thêm một bức ảnh hoặc ký tên nhé.");
      return;
    }
    setContribSubmitting(true);
    setContribError(null);
    try {
      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoDataUrl, sigDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gửi thất bại");
      const entry = data.entry as ContributionEntry;
      setItems((prev) => [entry, ...prev]);
      setDraftPhoto("");
      padRef.current?.clear();
      setContribDone(true);
      launch(90);
      setTimeout(() => setContribDone(false), 4000);
    } catch (e) {
      setContribError(e instanceof Error ? e.message : "Không gửi được");
    } finally {
      setContribSubmitting(false);
    }
  }, [draftPhoto, launch]);

  const countLabel =
    items.length > 0
      ? `${items.length} dấu ấn yêu thương đã được gửi`
      : "Hãy là người đầu tiên để lại dấu ấn";

  return (
    <div className="invitation-root" style={{ minHeight: "100vh" }}>
      <header
        style={{
          padding: "28px 24px 0",
          maxWidth: 980,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Link
          href="/"
          style={{
            textDecoration: "none",
            color: "#6B5560",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          ← Về thiệp mời
        </Link>
        <span
          style={{
            letterSpacing: ".28em",
            fontSize: 11,
            color: "#C9A05B",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Lưu bút & Ký tên
        </span>
      </header>

      {/* Intro */}
      <section
        style={{
          padding: "48px 24px 56px",
          textAlign: "center",
          background:
            "radial-gradient(120% 90% at 50% 0%, #FCEFF2 0%, #F4ECF6 45%, #EDF3EE 100%)",
        }}
      >
        <div
          style={{
            letterSpacing: ".34em",
            fontSize: 12,
            fontWeight: 600,
            color: "#C9A05B",
            textTransform: "uppercase",
          }}
        >
          Lưu giữ khoảnh khắc
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontWeight: 600,
            fontSize: "clamp(34px, 6vw, 48px)",
            color: "#4F3B47",
            margin: "12px 0 16px",
          }}
        >
          Lưu bút & Ký tên
        </h1>
        <p style={{ color: "#7A6470", fontSize: 15, maxWidth: 520, margin: "0 auto" }}>
          Để lại một lời chúc thật dễ thương, gửi một bức ảnh và ký tên lưu niệm.
          Tất cả sẽ được Diễm gom thành kỷ niệm ngày tốt nghiệp.
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: 24,
          }}
        >
          <a
            href="#luu-but"
            className="btn-hover"
            style={{
              textDecoration: "none",
              background: "linear-gradient(135deg,#F3C6CE,#E59FAC)",
              color: "#4F3B47",
              fontWeight: 700,
              fontSize: 15,
              padding: "12px 24px",
              borderRadius: 999,
            }}
          >
            💌 Viết lưu bút
          </a>
          <a
            href="#gui-anh"
            className="btn-hover"
            style={{
              textDecoration: "none",
              background: "#FFFCFA",
              color: "#4F3B47",
              fontWeight: 700,
              fontSize: 15,
              padding: "12px 24px",
              borderRadius: 999,
              border: "1px solid rgba(201,160,91,.4)",
            }}
          >
            📷 Gửi ảnh & ký tên
          </a>
        </div>
      </section>

      {/* ===================== LƯU BÚT ===================== */}
      <section
        id="luu-but"
        style={{
          padding: "72px 24px",
          background: "#4F3B47",
          color: "#FBF4EF",
          scrollMarginTop: 24,
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
              fontSize: "clamp(30px, 5vw, 42px)",
              color: "#FBF4EF",
              margin: "10px 0 0",
            }}
          >
            Để lại lời chúc nhé
          </h2>
          <p
            style={{
              margin: "14px auto 0",
              maxWidth: 520,
              fontSize: 15,
              lineHeight: 1.55,
              color: "#D9C3CD",
            }}
          >
            Lời chúc từ khắp nơi — ghim trên quả địa cầu khi bạn cho phép vị trí.
          </p>
        </div>
        <div style={{ maxWidth: 980, margin: "0 auto 36px" }}>
          <WishGlobe
            points={globePoints}
            eventLat={EVENT_GEO.lat}
            eventLng={EVENT_GEO.lng}
          />
        </div>
        <div className="guest-grid" style={{ maxWidth: 980, margin: "0 auto" }}>
          <div
            className="guest-form-panel"
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
              style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}
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
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 14,
                cursor: "pointer",
                fontSize: 14,
                lineHeight: 1.45,
                color: "#E8D4DC",
              }}
            >
              <input
                type="checkbox"
                checked={shareWishLocation}
                onChange={(e) => setShareWishLocation(e.target.checked)}
                style={{ marginTop: 3, accentColor: "#E59FAC" }}
              />
              <span>
                Ghi nhận vị trí gần đúng để hiện trên địa cầu (trình duyệt sẽ hỏi
                quyền — không bắt buộc).
              </span>
            </label>
            {locationHint && (
              <p style={{ color: "#D9C3CD", fontSize: 13, margin: "0 0 12px" }}>
                {locationHint}
              </p>
            )}
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
          <div className="guest-wishes-panel">
            <p className="guest-wishes-panel-title">Lời chúc đang bay ✨</p>
            <p className="guest-wishes-panel-sub">
              Cuộn xuống trên điện thoại nếu bạn vừa gửi lời chúc — khung bay nằm
              ngay bên dưới form.
            </p>
            <FloatingWishes wishes={guests} />
          </div>
        </div>
      </section>

      {/* ===================== GỬI ẢNH & KÝ TÊN ===================== */}
      <section
        id="gui-anh"
        style={{
          padding: "72px 24px 40px",
          background: "linear-gradient(180deg,#FCEFF2 0%,#F4ECF6 60%,#FBF4EF 100%)",
          scrollMarginTop: 24,
        }}
      >
        <div style={{ textAlign: "center", margin: "0 auto 36px", maxWidth: 620 }}>
          <div
            style={{
              letterSpacing: ".34em",
              fontSize: 12,
              fontWeight: 600,
              color: "#C9A05B",
              textTransform: "uppercase",
            }}
          >
            Dấu ấn của bạn
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: "clamp(30px, 5vw, 44px)",
              color: "#4F3B47",
              margin: "12px 0 0",
            }}
          >
            Gửi ảnh & Ký tên
          </h2>
          <p
            style={{
              color: "#7A6470",
              fontSize: 15,
              maxWidth: 500,
              margin: "14px auto 0",
              lineHeight: 1.55,
            }}
          >
            Để lại một bức ảnh thân thương, một nét chữ ký — hoặc cả hai. 💛
          </p>
        </div>

        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            background: "#FFFCFA",
            border: "1px solid rgba(201,160,91,.28)",
            borderRadius: 26,
            boxShadow: "0 22px 54px rgba(79,59,71,.12)",
            padding: "clamp(24px, 5vw, 38px)",
          }}
        >
          <div className="contrib-grid">
            {/* photo */}
            <div>
              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 18,
                  color: "#4F3B47",
                  marginBottom: 12,
                }}
              >
                📷 Ảnh thân thương
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onPick}
                style={{ display: "none" }}
              />
              {!draftPhoto ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      fileRef.current?.click();
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 9,
                    cursor: "pointer",
                    border: "2px dashed rgba(201,160,91,.55)",
                    borderRadius: 18,
                    background: "#FBF4EF",
                    height: 190,
                  }}
                >
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      background: "linear-gradient(150deg,#F3C6CE,#D9CDEA)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                    }}
                  >
                    📷
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#4F3B47" }}>
                    Bấm để chọn ảnh
                  </div>
                  <div style={{ fontSize: 12, color: "#A98AA0" }}>tuỳ chọn</div>
                </div>
              ) : (
                <div
                  style={{
                    position: "relative",
                    borderRadius: 18,
                    overflow: "hidden",
                    height: 190,
                    border: "1px solid rgba(201,160,91,.3)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={draftPhoto}
                    alt="Ảnh xem trước"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setDraftPhoto("")}
                    aria-label="Xoá ảnh"
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 30,
                      height: 30,
                      border: "none",
                      borderRadius: "50%",
                      cursor: "pointer",
                      background: "rgba(79,59,71,.62)",
                      color: "#FBF4EF",
                      fontSize: 15,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* signature */}
            <div>
              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 18,
                  color: "#4F3B47",
                  marginBottom: 12,
                }}
              >
                ✍️ Chữ ký
              </div>
              <div
                style={{
                  position: "relative",
                  borderRadius: 18,
                  overflow: "hidden",
                  border: "1px solid rgba(201,160,91,.4)",
                  background: "#FFFDFB",
                  height: 190,
                }}
              >
                <SignaturePad ref={padRef} height={190} transparent />
                <div
                  style={{
                    position: "absolute",
                    left: 16,
                    right: 16,
                    bottom: 16,
                    borderBottom: "1px dashed rgba(201,160,91,.5)",
                    pointerEvents: "none",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 16,
                    top: 12,
                    fontSize: 12,
                    color: "#C4AEBA",
                    pointerEvents: "none",
                  }}
                >
                  ký vào đây · tuỳ chọn
                </div>
                <button
                  type="button"
                  onClick={() => padRef.current?.clear()}
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 10,
                    border: "1px solid rgba(201,160,91,.5)",
                    background: "rgba(255,252,250,.9)",
                    color: "#4F3B47",
                    fontWeight: 600,
                    fontSize: 12,
                    padding: "6px 12px",
                    borderRadius: 999,
                    cursor: "pointer",
                  }}
                >
                  Xoá nét
                </button>
              </div>
            </div>
          </div>

          {contribError && (
            <p style={{ color: "#B3261E", fontSize: 14, margin: "18px 0 0" }}>
              {contribError}
            </p>
          )}
          {contribDone && (
            <p
              style={{
                color: "#5C8A6E",
                fontSize: 14,
                margin: "18px 0 0",
                fontWeight: 600,
              }}
            >
              Đã thêm vào cuốn lưu bút — cảm ơn bạn rất nhiều! 💛
            </p>
          )}

          <button
            type="button"
            className="btn-hover"
            disabled={contribSubmitting}
            onClick={() => void submitContribution()}
            style={{
              width: "100%",
              marginTop: 24,
              border: "none",
              cursor: contribSubmitting ? "wait" : "pointer",
              background: "#4F3B47",
              color: "#FBF4EF",
              fontWeight: 700,
              fontSize: 16,
              padding: 17,
              borderRadius: 999,
              boxShadow: "0 14px 32px rgba(79,59,71,.26)",
              opacity: contribSubmitting ? 0.75 : 1,
            }}
          >
            {contribSubmitting ? "Đang gửi…" : "Gửi vào lưu bút 💌"}
          </button>
          <p
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "#B49AAC",
              margin: "14px 0 0",
            }}
          >
            Thêm một bức ảnh hoặc một nét chữ ký — hoặc cả hai.
          </p>
        </div>
      </section>

      {/* ===================== SHOWCASE ===================== */}
      <section style={{ padding: "20px 24px 96px" }}>
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
            Cuốn lưu bút chung
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 600,
              fontSize: "clamp(28px, 4.5vw, 40px)",
              color: "#4F3B47",
              margin: "10px 0 0",
            }}
          >
            Dấu ấn của mọi người
          </h2>
          <p style={{ color: "#7A6470", fontSize: 15, margin: "12px 0 0" }}>
            {countLabel}
          </p>
        </div>

        {items.length === 0 ? (
          <div
            style={{
              maxWidth: 520,
              margin: "0 auto",
              textAlign: "center",
              color: "#B49AAC",
              fontSize: 16,
              fontStyle: "italic",
              fontFamily: "'Playfair Display', serif",
              border: "1px dashed rgba(201,160,91,.4)",
              borderRadius: 20,
              padding: "48px 30px",
            }}
          >
            Cuốn lưu bút còn trống —
            <br />
            dấu ấn của bạn sẽ là trang đầu tiên ✨
          </div>
        ) : (
          <div
            style={{
              maxWidth: 1140,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
              gap: "40px 30px",
              padding: "14px 0",
            }}
          >
            {items.map((it, idx) => {
              const tilt = TILTS[idx % TILTS.length];
              const pinTilt =
                (idx % 2 ? 1 : -1) * (3 + (idx % 3) * 2) + "deg";
              const photoSrc = it.photoUrl
                ? resolveContribImageSrc(it.photoUrl)
                : null;
              const sigSrc = it.sigUrl
                ? resolveContribImageSrc(it.sigUrl)
                : null;
              return (
                <div
                  key={`${it.timestamp}-${idx}`}
                  className="polaroid-card"
                  style={{ position: "relative", transform: `rotate(${tilt})` }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: -13,
                      transform: `translateX(-50%) rotate(${pinTilt})`,
                      width: 78,
                      height: 24,
                      background:
                        "linear-gradient(180deg,rgba(243,198,206,.95),rgba(229,159,172,.85))",
                      borderRadius: 3,
                      boxShadow: "0 3px 8px rgba(79,59,71,.22)",
                      zIndex: 3,
                    }}
                  />
                  <div
                    style={{
                      background: "#FFFCFA",
                      padding: "14px 14px 0",
                      borderRadius: 3,
                      boxShadow: "0 16px 36px rgba(79,59,71,.18)",
                    }}
                  >
                    {photoSrc ? (
                      <div
                        style={{
                          position: "relative",
                          height: 300,
                          background: "#F3E9E2",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        <Image
                          src={photoSrc}
                          alt="Ảnh kỷ niệm"
                          fill
                          sizes="(max-width:768px) 90vw, 300px"
                          style={{ objectFit: "cover" }}
                          unoptimized
                        />
                        {sigSrc && (
                          <>
                            <div
                              style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                bottom: 0,
                                height: "46%",
                                background:
                                  "linear-gradient(transparent, rgba(79,59,71,.34))",
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                left: 14,
                                right: 14,
                                bottom: 12,
                                height: 90,
                              }}
                            >
                              <Image
                                src={sigSrc}
                                alt="Chữ ký"
                                fill
                                sizes="280px"
                                style={{
                                  objectFit: "contain",
                                  objectPosition: "left bottom",
                                  filter:
                                    "brightness(0) invert(1) drop-shadow(0 1px 2px rgba(0,0,0,.4))",
                                }}
                                unoptimized
                              />
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          position: "relative",
                          height: 300,
                          borderRadius: 2,
                          background:
                            "repeating-linear-gradient(#FFFDFB,#FFFDFB 38px,rgba(201,160,91,.16) 39px,#FFFDFB 40px)",
                          overflow: "hidden",
                        }}
                      >
                        {sigSrc && (
                          <Image
                            src={sigSrc}
                            alt="Chữ ký"
                            fill
                            sizes="280px"
                            style={{ objectFit: "contain", padding: "24px 28px" }}
                            unoptimized
                          />
                        )}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "16px 6px 18px",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#C9A05B",
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontStyle: "italic",
                          fontSize: 15,
                          color: "#9A7585",
                          letterSpacing: ".02em",
                        }}
                      >
                        {formatGuestWhen(it.timestamp)}
                      </span>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#C9A05B",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
