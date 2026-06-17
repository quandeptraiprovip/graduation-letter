"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";

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
  eventLat?: number;
  eventLng?: number;
};

const EARTH =
  "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg";
const TOPOLOGY =
  "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png";

const ALTITUDE_MIN = 0.045;
const ALTITUDE_MAX = 3.4;
const FOCUS_ALTITUDE = 0.22;

function configureGlobeControls(g: GlobeMethods) {
  const controls = g.controls();
  controls.enableZoom = true;
  controls.zoomSpeed = 1.85;
  controls.minDistance = 18;
  controls.maxDistance = 920;
  controls.enablePan = false;
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  };
  controls.autoRotate = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
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
  const [selected, setSelected] = useState<GlobeWishPoint | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const applyControls = useCallback(() => {
    const g = globeRef.current;
    if (g) configureGlobeControls(g);
  }, []);

  const focusOnPoint = useCallback((p: GlobeWishPoint) => {
    const g = globeRef.current;
    if (!g) return;
    const pov = g.pointOfView();
    const alt =
      typeof pov.altitude === "number" && Number.isFinite(pov.altitude)
        ? Math.min(pov.altitude, FOCUS_ALTITUDE)
        : FOCUS_ALTITUDE;
    g.pointOfView(
      { lat: p.lat, lng: p.lng, altitude: Math.max(alt, ALTITUDE_MIN) },
      700
    );
  }, []);

  const selectPoint = useCallback(
    (p: GlobeWishPoint) => {
      setSelected(p);
      focusOnPoint(p);
    },
    [focusOnPoint]
  );

  useEffect(() => {
    setMounted(true);
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 420;
      setSize(Math.min(560, Math.max(280, Math.round(w))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    applyControls();
  }, [applyControls, size, mounted]);

  useEffect(() => {
    if (!selected) return;
    if (!points.some((p) => p.id === selected.id)) setSelected(null);
  }, [points, selected]);

  const adjustAltitude = useCallback((factor: number) => {
    const g = globeRef.current;
    if (!g) return;
    const pov = g.pointOfView();
    const alt =
      typeof pov.altitude === "number" && Number.isFinite(pov.altitude)
        ? pov.altitude
        : 2;
    const next = Math.min(ALTITUDE_MAX, Math.max(ALTITUDE_MIN, alt * factor));
    g.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: next }, 160);
  }, []);

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
        maxR: p.id === selected?.id ? 4.5 : 3,
        propagationSpeed: 2,
        repeatPeriod: p.id === selected?.id ? 900 : 1200,
      })),
    [points, selected?.id]
  );

  const pointColor = useCallback(
    (d: object) => {
      const p = d as GlobeWishPoint;
      if (selected?.id === p.id) return "#E8C468";
      if (hoveredId === p.id) return "#FFDCE6";
      return "#F3C6CE";
    },
    [hoveredId, selected?.id]
  );

  const pointRadius = useCallback(
    (d: object) => {
      const p = d as GlobeWishPoint;
      if (selected?.id === p.id) return 0.95;
      if (hoveredId === p.id) return 0.72;
      return 0.58;
    },
    [hoveredId, selected?.id]
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
      <div className="wish-globe-canvas-host">
        <Globe
          ref={globeRef}
          onGlobeReady={applyControls}
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
          pointAltitude={0.025}
          pointRadius={pointRadius}
          pointColor={pointColor}
          pointsTransitionDuration={280}
          onPointClick={(d) => selectPoint(d as GlobeWishPoint)}
          onPointHover={(d) =>
            setHoveredId(d ? (d as GlobeWishPoint).id : null)
          }
          onGlobeClick={() => setSelected(null)}
          arcsData={arcsData}
          arcColor="color"
          arcAltitude={0.25}
          arcStroke={0.35}
          arcDashLength={1}
          arcDashGap={0}
          ringsData={ringsData}
          ringColor={() => (t: number) => `rgba(229,159,172,${1 - t})`}
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
        />
        {selected && (
          <div
            className="wish-globe-detail"
            role="dialog"
            aria-modal="true"
            aria-label={`Lời chúc của ${selected.name}`}
          >
            <button
              type="button"
              className="wish-globe-detail-close"
              aria-label="Đóng"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            <div className="wish-focus-emoji">{selected.emoji}</div>
            <p className="wish-focus-msg">{selected.msg}</p>
            <div className="wish-focus-meta">
              <span className="wish-focus-name">{selected.name}</span>
              {selected.place ? (
                <span className="wish-focus-place">📍 {selected.place}</span>
              ) : null}
            </div>
          </div>
        )}
        <div className="wish-globe-zoom" aria-label="Phóng to thu nhỏ địa cầu">
          <button
            type="button"
            className="wish-globe-zoom-btn"
            aria-label="Phóng to"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => adjustAltitude(0.68)}
          >
            +
          </button>
          <button
            type="button"
            className="wish-globe-zoom-btn"
            aria-label="Thu nhỏ"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => adjustAltitude(1.28)}
          >
            −
          </button>
        </div>
      </div>
      {points.length > 0 && (
        <div className="wish-globe-pick" role="listbox" aria-label="Chọn lời chúc">
          {points.map((p) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={selected?.id === p.id}
              className={`wish-globe-pick-btn${
                selected?.id === p.id ? " wish-globe-pick-btn--active" : ""
              }`}
              onClick={() => selectPoint(p)}
            >
              <span className="wish-globe-pick-emoji">{p.emoji}</span>
              <span className="wish-globe-pick-text">
                <span className="wish-globe-pick-name">{p.name}</span>
                {p.place ? (
                  <span className="wish-globe-pick-place">{p.place}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="wish-globe-caption">
        {points.length > 0
          ? `${points.length} lời chúc · chạm ghim hoặc tên bên dưới để đọc`
          : "Bật vị trí khi gửi lời chúc để ghim lên địa cầu 🌍"}
      </p>
    </div>
  );
}
