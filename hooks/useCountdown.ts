"use client";

import { useEffect, useState } from "react";

function compute(iso: string) {
  const total = Math.max(
    0,
    Math.floor((new Date(iso).getTime() - Date.now()) / 1000)
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    d: String(Math.floor(total / 86400)),
    h: pad(Math.floor((total % 86400) / 3600)),
    m: pad(Math.floor((total % 3600) / 60)),
    s: pad(total % 60),
  };
}

export function useCountdown(eventISO: string) {
  const [cd, setCd] = useState(() => compute(eventISO));
  useEffect(() => {
    setCd(compute(eventISO));
    const id = setInterval(() => setCd(compute(eventISO)), 1000);
    return () => clearInterval(id);
  }, [eventISO]);
  return cd;
}
