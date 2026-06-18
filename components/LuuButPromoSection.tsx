import Link from "next/link";

export function LuuButPromoSection() {
  return (
    <section
      id="luu-but-promo"
      style={{
        padding: "84px 24px",
        background: "linear-gradient(180deg,#FCEFF2 0%,#EDF3EE 55%,#FBF4EF 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -60,
          width: 280,
          height: 280,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(217,205,234,.55), transparent 70%)",
          filter: "blur(6px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{ maxWidth: 920, margin: "0 auto", position: "relative", zIndex: 1 }}
      >
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              letterSpacing: ".32em",
              fontSize: 12,
              fontWeight: 600,
              color: "#C9A05B",
              textTransform: "uppercase",
            }}
          >
            Lưu giữ khoảnh khắc
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 600,
              fontSize: "clamp(32px, 5vw, 42px)",
              color: "#4F3B47",
              margin: "10px 0 0",
            }}
          >
            Lưu bút &amp; ký tên
          </h2>
          <p
            style={{
              color: "#7A6470",
              fontSize: 15,
              margin: "14px auto 0",
              maxWidth: 540,
              lineHeight: 1.55,
            }}
          >
            Một trang riêng để bạn để lại lời chúc và ký tên lưu niệm. Diễm sẽ gom
            tất cả thành kỷ niệm ngày tốt nghiệp.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 28,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              background: "#FFFCFA",
              border: "1px solid rgba(201,160,91,.28)",
              borderRadius: 22,
              padding: "32px 28px",
              boxShadow: "0 16px 40px rgba(79,59,71,.1)",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>💌</div>
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 22,
                color: "#4F3B47",
                margin: "0 0 10px",
              }}
            >
              Hai điều dễ thương
            </h3>
            <ol
              style={{
                margin: 0,
                paddingLeft: 20,
                color: "#6B5560",
                fontSize: 15,
                lineHeight: 1.65,
              }}
            >
              <li>Viết một lời chúc — ghim lên quả địa cầu</li>
              <li>Ký tên lưu niệm bằng tay</li>
              <li>Bấm gửi — xong!</li>
            </ol>
          </div>

          <div
            style={{
              background: "rgba(79,59,71,.92)",
              color: "#FBF4EF",
              borderRadius: 22,
              padding: "36px 32px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              gap: 20,
              boxShadow: "0 20px 50px rgba(79,59,71,.22)",
              border: "1px solid rgba(201,160,91,.35)",
            }}
          >
            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
                fontSize: 22,
                lineHeight: 1.45,
                margin: 0,
                color: "#F3D7A8",
              }}
            >
              “Để lại đôi dòng và chữ ký để Diễm nhớ mãi ngày có bạn bên cạnh.”
            </p>
            <Link
              href="/luu-but"
              className="btn-hover-lg"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                background: "linear-gradient(135deg,#F3C6CE,#E59FAC)",
                color: "#4F3B47",
                fontWeight: 700,
                fontSize: 16,
                padding: "16px 28px",
                borderRadius: 999,
                boxShadow: "0 12px 28px rgba(0,0,0,.2)",
                transition: "transform .2s",
              }}
            >
              Lưu bút &amp; ký tên →
            </Link>
            <span style={{ fontSize: 12, color: "#D9C3CD", letterSpacing: ".08em" }}>
              Miễn phí · không cần tài khoản
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
