export const SIZES = ["small", "medium", "large"];

export function sizeForWeight(kg) {
  if (!(kg > 0)) return null;
  if (kg <= 500) return "small";
  if (kg <= 1000) return "medium";
  if (kg <= 3500) return "large";
  return null;
}

export const money = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export function fmtDate(iso, lang) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(lang === "ru" ? "ru-RU" : "uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// <input type="datetime-local"> uchun qiymat
export function localInputValue(date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

// Telefon rasmini kichraytirib, JPEG ko'rinishga o'tkazish (tez yuklanishi uchun)
export function compressImage(file, max = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("BAD_FILE"));
    };
    img.src = url;
  });
}

export function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("NO_GEO"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

export const routeUrl = (o) =>
  `https://yandex.uz/maps/?rtext=${orderPoints(o).map((p) => `${p.lat},${p.lng}`).join("~")}&rtt=auto`;

export const isActive = (status) => ["accepted", "on_the_way", "picked_up"].includes(status);

// ---------------------------------------------------------------------
// Narxni ilovaning o'zida darhol hisoblash (server bilan aynan bir xil formula).
// Yakuniy narxni buyurtma yaratilganda server tasdiqlaydi.
// ---------------------------------------------------------------------
function haversineKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function routeDistanceKm(points) {
  let sum = 0;
  for (let i = 1; i < points.length; i++) sum += haversineKm(points[i - 1], points[i]);
  return Math.max(Math.round(sum * 1.3 * 10) / 10, 1);
}

export function detectKind(points, cities) {
  for (const c of cities || []) {
    const center = { lat: c.center_lat, lng: c.center_lng };
    if (points.every((p) => haversineKm(center, p) <= c.radius_km)) return { kind: "city", cityId: c.id };
  }
  return { kind: "intercity", cityId: null };
}

export function estimatePrice(refs, { points, body, tempMin, urgent }) {
  const { kind, cityId } = detectKind(points, refs.cities);
  const distanceKm = routeDistanceKm(points);
  const stops = Math.max(points.length - 2, 0);
  const t = (refs.tariffs || []).find((x) =>
    x.kind === kind && x.body_size === body && (kind === "city" ? x.city_id === cityId : x.city_id == null)
  );
  if (!t) return { kind, distanceKm, price: null };

  let sum;
  if (kind === "city") {
    sum = Number(t.base_price) + Number(t.price_per_km) * Math.max(distanceKm - Number(t.included_km), 0);
  } else {
    const tons = { small: 0.5, medium: 1, large: 3.5 }[body];
    sum = distanceKm * tons * Number(t.intercity_coef);
  }
  sum += Number(t.price_per_stop) * stops;
  if (tempMin <= -18) sum *= 1 + Number(t.frozen_surcharge_pct) / 100;
  if (urgent) sum *= 1 + Number(t.urgent_surcharge_pct) / 100;
  sum = Math.max(sum, Number(t.min_price));
  return {
    kind,
    distanceKm,
    stops,
    price: Math.round(sum / 1000) * 1000,
    included: kind === "city" ? Number(t.included_km) : 0,
    perStop: Number(t.price_per_stop),
  };
}

// Yandex Xaritada barcha nuqtalar bo'yicha yo'nalish
export function orderPoints(o) {
  return [
    { lat: o.from_lat, lng: o.from_lng },
    ...(o.stops || []),
    { lat: o.to_lat, lng: o.to_lng },
  ];
}
