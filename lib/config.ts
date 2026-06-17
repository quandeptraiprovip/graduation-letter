/** Ngày giờ lễ tốt nghiệp (ISO local, không timezone Z). */
export const EVENT_ISO = "2026-07-20T09:00";

/** Tọa độ địa điểm lễ (đường cung trên địa cầu hướng về đây). */
export const EVENT_GEO = { lat: 10.8231, lng: 106.6297 };

export const SHOW_FRIEND_MAP = true;

/** Đường dẫn ảnh trong `public/` — để trống sẽ hiện khung placeholder. */
export const IMAGES = {
  portrait: "" as string,
  album: {
    al1: "",
    al2: "",
    al3: "",
    al4: "",
    al5: "",
  },
  yearbook: {
    yb1: "",
    yb2: "",
    yb3: "",
    yb4: "",
    yb5: "",
    yb6: "",
  },
} as const;
