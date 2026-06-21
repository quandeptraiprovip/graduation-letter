/** Ngày giờ lễ tốt nghiệp (ISO local, không timezone Z). */
export const EVENT_ISO = "2026-06-28T16:00";

/** Tọa độ Trường ĐH Kinh tế — ĐH Đà Nẵng (71 Ngũ Hành Sơn). */
export const EVENT_GEO = { lat: 16.0472, lng: 108.2423 };

/** Chuỗi tìm kiếm Google Maps cho địa điểm lễ. */
export const EVENT_MAPS_QUERY =
  "Trường Đại học Kinh tế - Đại học Đà Nẵng, 71 Ngũ Hành Sơn, Đà Nẵng";

export const SHOW_FRIEND_MAP = true;

/** Đường dẫn ảnh trong `public/` — mỗi file chỉ dùng một lần trên trang. */
export const IMAGES = {
  portrait: "/images/DSC04586.JPG",
  album: {
    al1: "/images/DSC03763.JPG",
    al2: "/images/DSC03782.JPG",
    al3: "/images/DSC03911.JPG",
    al4: "/images/DSC05032.JPG",
    al5: "/images/DSC05125.JPG",
    al6: "/images/DSC04254.JPG",
  },
  yearbook: {
    yb1: "/images/DSC04595.JPG",
    yb2: "/images/DSC04654.JPG",
    yb3: "/images/DSC05040.JPG",
    yb4: "/images/DSC05047.JPG",
    yb5: "/images/DSC03963.JPG",
    yb6: "/images/DSC03972.JPG",
    yb7: "/images/DSC03969.JPG",
    yb8: "/images/DSC04260.JPG",
  },
} as const;

/** Số "tờ" lật trong cuốn kỷ yếu (0 … YEARBOOK_PAGE_COUNT). */
export const YEARBOOK_PAGE_COUNT = 5;
