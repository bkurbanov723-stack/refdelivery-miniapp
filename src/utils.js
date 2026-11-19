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
  `https://yandex.uz/maps/?rtext=${o.from_lat},${o.from_lng}~${o.to_lat},${o.to_lng}&rtt=auto`;

export const isActive = (status) => ["accepted", "on_the_way", "picked_up"].includes(status);
