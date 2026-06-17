"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";
import type { SignatureEntry } from "@/lib/signature-store";
import { useConfetti } from "@/hooks/useConfetti";

function formatWhen(ts: string) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function signatureUrl(file: string) {
  return `/api/signatures/file/${encodeURIComponent(file)}`;
}

type Props = {
  initialSignatures: SignatureEntry[];
};

export function SignaturePageClient({ initialSignatures }: Props) {
  const padRef = useRef<SignaturePadHandle>(null);
  const { canvasRef, launch } = useConfetti();
  const [name, setName] = useState("");
  const [signatures, setSignatures] =
    useState<SignatureEntry[]>(initialSignatures);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Vui lòng nhập tên của bạn");
      return;
    }
    if (padRef.current?.isEmpty()) {
      setError("Hãy ký vào khung bên dưới nhé");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          imageDataUrl: padRef.current?.toDataURL(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gửi thất bại");
      const entry = data.entry as SignatureEntry;
      setSignatures((prev) => [entry, ...prev]);
      setName("");
      padRef.current?.clear();
      setDone(true);
      launch(55);
      setTimeout(() => setDone(false), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được chữ ký");
    } finally {
      setSubmitting(false);
    }
  }, [launch, name]);

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
          Sổ chữ ký
        </span>
      </header>

      <section
        style={{
          padding: "48px 24px 64px",
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
          Ký tên lưu niệm
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontWeight: 600,
            fontSize: "clamp(36px, 6vw, 48px)",
            color: "#4F3B47",
            margin: "12px 0 16px",
          }}
        >
          Chữ ký của bạn
        </h1>
        <p style={{ color: "#7A6470", fontSize: 15, maxWidth: 480, margin: "0 auto" }}>
          Dùng ngón tay hoặc chuột để ký. Chữ ký sẽ được lưu cùng tên bạn trên
          server.
        </p>
      </section>

      <section style={{ padding: "0 24px 64px", maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            background: "#FFFCFA",
            borderRadius: 24,
            padding: "32px 28px",
            border: "1px solid rgba(201,160,91,.3)",
            boxShadow: "0 20px 50px rgba(79,59,71,.1)",
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên hiển thị bên chữ ký"
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid rgba(201,160,91,.4)",
              background: "#FBF4EF",
              color: "#4F3B47",
              fontSize: 15,
              outline: "none",
              marginBottom: 22,
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
            Chữ ký
          </label>
          <div
            style={{
              border: "2px dashed rgba(201,160,91,.45)",
              borderRadius: 16,
              overflow: "hidden",
              background: "#FFFCFA",
              marginBottom: 14,
            }}
          >
            <SignaturePad ref={padRef} height={220} />
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <button
              type="button"
              className="btn-hover"
              onClick={() => padRef.current?.clear()}
              style={{
                flex: 1,
                minWidth: 120,
                padding: "12px 16px",
                borderRadius: 999,
                border: "1px solid rgba(201,160,91,.5)",
                background: "#FBF4EF",
                color: "#4F3B47",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Xóa & ký lại
            </button>
            <button
              type="button"
              className="btn-hover"
              disabled={submitting}
              onClick={() => void submit()}
              style={{
                flex: 2,
                minWidth: 160,
                padding: "12px 16px",
                borderRadius: 999,
                border: "none",
                background: "#4F3B47",
                color: "#FBF4EF",
                fontWeight: 700,
                cursor: submitting ? "wait" : "pointer",
                opacity: submitting ? 0.75 : 1,
              }}
            >
              {submitting ? "Đang lưu…" : "Gửi chữ ký ✍️"}
            </button>
          </div>
          {error && (
            <p style={{ color: "#B3261E", fontSize: 14, margin: "0 0 8px" }}>{error}</p>
          )}
          {done && (
            <p style={{ color: "#5C8A6E", fontSize: 14, margin: 0, fontWeight: 600 }}>
              Đã lưu chữ ký — cảm ơn bạn rất nhiều! 💛
            </p>
          )}
        </div>
      </section>

      <section
        style={{
          padding: "64px 24px 96px",
          background: "#4F3B47",
          color: "#FBF4EF",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              letterSpacing: ".32em",
              fontSize: 12,
              fontWeight: 600,
              color: "#E0B7C2",
              textTransform: "uppercase",
            }}
          >
            Bảng chữ ký
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 36,
              margin: "10px 0 0",
            }}
          >
            Cùng nhau viết nên kỷ niệm
          </h2>
        </div>
        {signatures.length === 0 ? (
          <p style={{ textAlign: "center", color: "#D9C3CD" }}>
            Chưa có chữ ký nào — hãy là người đầu tiên!
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 20,
              maxWidth: 1100,
              margin: "0 auto",
            }}
          >
            {signatures.map((s) => (
              <div
                key={s.file}
                style={{
                  background: "#FBF4EF",
                  color: "#4F3B47",
                  borderRadius: 16,
                  padding: 14,
                  boxShadow: "0 10px 26px rgba(0,0,0,.2)",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    height: 100,
                    background: "#FFFCFA",
                    borderRadius: 10,
                    border: "1px solid rgba(201,160,91,.25)",
                    marginBottom: 10,
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src={signatureUrl(s.file)}
                    alt={`Chữ ký của ${s.name}`}
                    fill
                    sizes="200px"
                    style={{ objectFit: "contain", padding: 8 }}
                    unoptimized
                  />
                </div>
                <div
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontStyle: "italic",
                    fontSize: 16,
                    color: "#5C4753",
                  }}
                >
                  {s.name}
                </div>
                <div style={{ fontSize: 11, color: "#B49AAC", marginTop: 4 }}>
                  {formatWhen(s.timestamp)}
                </div>
              </div>
            ))}
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
