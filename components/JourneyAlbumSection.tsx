"use client";

import { ImageSlot } from "@/components/ImageSlot";
import { IMAGES } from "@/lib/config";

const ITEMS: {
  key: keyof typeof IMAGES.album;
  tilt: string;
  sizes: string;
}[] = [
  { key: "al1", tilt: "-2.8deg", sizes: "(max-width:768px) 86vw, 420px" },
  { key: "al2", tilt: "2.2deg", sizes: "(max-width:768px) 78vw, 260px" },
  { key: "al3", tilt: "-1.4deg", sizes: "(max-width:768px) 78vw, 240px" },
  { key: "al4", tilt: "3deg", sizes: "(max-width:768px) 86vw, 380px" },
  { key: "al5", tilt: "-2deg", sizes: "(max-width:768px) 78vw, 250px" },
  { key: "al6", tilt: "1.6deg", sizes: "(max-width:768px) 78vw, 280px" },
];

export function JourneyAlbumSection() {
  return (
    <section className="journey-album" aria-labelledby="journey-album-title">
      <div className="journey-album-ambient" aria-hidden>
        <span className="journey-album-orb journey-album-orb--a" />
        <span className="journey-album-orb journey-album-orb--b" />
      </div>

      <header className="journey-album-header">
        <div className="journey-album-ornament" aria-hidden>
          <span className="journey-album-ornament-line" />
          <span className="journey-album-ornament-gem">✦</span>
          <span className="journey-album-ornament-line" />
        </div>
        <p className="journey-album-eyebrow">Album hành trình</p>
        <h2 id="journey-album-title" className="journey-album-title">
          Bốn năm thanh xuân
        </h2>
        <p className="journey-album-lede">
          Những khoảnh khắc đáng nhớ trên hành trình học tập — lưu giữ như từng
          tấm ảnh cũ trong ngăn ký ức.
        </p>
        <div className="journey-album-years" aria-hidden>
          <span>2022</span>
          <span className="journey-album-years-line" />
          <span>2026</span>
        </div>
      </header>

      <div className="journey-album-stage">
        <p className="journey-album-swipe-hint" aria-hidden>
          Vuốt ngang để xem từng khoảnh khắc
        </p>
        <div className="journey-album-scroll">
          <div className="journey-album-grid">
          {ITEMS.map((item, index) => (
            <figure
              key={item.key}
              className={`journey-album-card journey-album-card--${index + 1} ${
                index % 2 === 1 ? "journey-album-card--offset" : ""
              }`}
              style={{ ["--tilt" as string]: item.tilt }}
            >
              <span className="journey-album-tape journey-album-tape--tl" aria-hidden />
              <span className="journey-album-tape journey-album-tape--br" aria-hidden />
              <div className="journey-album-frame">
                <ImageSlot
                  src={IMAGES.album[item.key] || undefined}
                  alt={`Kỷ niệm ${index + 1}`}
                  placeholder="Ảnh album"
                  sizes={item.sizes}
                  style={{ width: "100%", height: "100%", minHeight: 0 }}
                />
              </div>
              <figcaption className="journey-album-caption">
                <span className="journey-album-num">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </figcaption>
            </figure>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}
