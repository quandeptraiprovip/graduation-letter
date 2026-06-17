"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";

export type GlobeWishPoint = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  emoji: string;
  msg: string;
  place?: string;
};

type Props = {
  points: GlobeWishPoint[];
  /** Điểm lễ tốt nghiệp (mặc định TP.HCM). */
  eventLat?: number;
  eventLng?: number;
};

const EARTH =
  "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg";
const TOPOLOGY =
  "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png";

function escHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function WishGlobe({
  points,
  eventLat = 10.8231,
  eventLng = 106.6297,
}: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(420);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 420;
      setSize(Math.min(520, Math.max(280, Math.round(w))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableZoom = true;
    controls.minDistance = 180;
    controls.maxDistance = 420;
  }, [mounted, size]);

  const arcsData = useMemo(() => {
    return points.map((p) => ({
      startLat: p.lat,
      startLng: p.lng,
      endLat: eventLat,
      endLng: eventLng,
      color: ["rgba(243,198,206,0.55)", "rgba(201,160,91,0.35)"],
    }));
  }, [points, eventLat, eventLng]);

  const ringsData = useMemo(
    () =>
      points.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        maxR: 3,
        propagationSpeed: 2,
        repeatPeriod: 1200,
      })),
    [points]
  );

  if (!mounted) {
    return (
      <div className="wish-globe-wrap" ref={containerRef}>
        <div className="wish-globe-placeholder">Đang tải quả địa cầu…</div>
      </div>
    );
  }

  return (
    <div className="wish-globe-wrap" ref={containerRef}>
      <Globe
        ref={globeRef}
        width={size}
        height={size}
        globeImageUrl={EARTH}
        bumpImageUrl={TOPOLOGY}
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor="#E59FAC"
        atmosphereAltitude={0.18}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.02}
        pointRadius={0.45}
        pointColor={() => "#F3C6CE"}
        pointLabel={(d) => {
          const p = d as GlobeWishPoint;
          const where = p.place
            ? `<br/><i>${escHtml(p.place)}</i>`
            : "";
          return `<div class="wish-globe-label"><b>${escHtml(p.emoji)} ${escHtml(p.name)}</b>${where}<br/>${escHtml(p.msg)}</div>`;
        }}
        arcsData={arcsData}
        arcColor="color"
        arcAltitude={0.25}
        arcStroke={0.4}
        ringsData={ringsData}
        ringColor={() => (t: number) => `rgba(229,159,172,${1 - t})`}
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
      />
      <p className="wish-globe-caption">
        {points.length > 0
          ? `${points.length} lời chúc trên bản đồ · kéo xoay · cuộn phóng to`
          : "Bật vị trí khi gửi lời chúc để ghim lên địa cầu 🌍"}
      </p>
    </div>
  );
}
