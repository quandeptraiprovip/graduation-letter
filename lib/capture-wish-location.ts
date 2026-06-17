export type WishLocation = {
  lat: number;
  lng: number;
  place: string;
};

function readPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("no-geolocation"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 14_000,
      maximumAge: 120_000,
    });
  });
}

async function reversePlace(lat: number, lng: number): Promise<string> {
  try {
    const url = new URL(
      "https://api.bigdatacloud.net/data/reverse-geocode-client"
    );
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("localityLanguage", "vi");
    const res = await fetch(url.toString());
    if (!res.ok) return "";
    const j = (await res.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    };
    const city = j.city || j.locality;
    const parts = [city, j.principalSubdivision, j.countryName].filter(Boolean);
    return parts.join(", ");
  } catch {
    return "";
  }
}

/** Xin quyền vị trí trình duyệt; trả null nếu từ chối hoặc lỗi. */
export async function captureWishLocation(): Promise<WishLocation | null> {
  try {
    const pos = await readPosition();
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const place = await reversePlace(lat, lng);
    return { lat, lng, place };
  } catch {
    return null;
  }
}
