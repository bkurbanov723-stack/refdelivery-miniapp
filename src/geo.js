// Manzil qidirish va xaritadagi nuqtadan manzil olish (OpenStreetMap Nominatim, bepul)
const NOMINATIM = "https://nominatim.openstreetmap.org";

function shortName(displayName) {
  return String(displayName || "").split(",").slice(0, 3).join(",").trim();
}

export async function searchPlaces(query, lang) {
  const url = `${NOMINATIM}/search?format=json&countrycodes=uz&limit=6&accept-language=${lang}` +
    `&q=${encodeURIComponent(query)}`;
  const r = await fetch(url);
  const list = await r.json();
  return list.map((x) => ({ lat: Number(x.lat), lng: Number(x.lon), address: shortName(x.display_name) }));
}

export async function reverseGeocode(lat, lng, lang) {
  try {
    const r = await fetch(`${NOMINATIM}/reverse?format=json&zoom=18&accept-language=${lang}&lat=${lat}&lon=${lng}`);
    const j = await r.json();
    const a = j.address || {};
    const street = a.road ? a.road + (a.house_number ? " " + a.house_number : "") : null;
    const parts = [street, a.suburb || a.neighbourhood || a.quarter, a.city || a.town || a.village || a.county]
      .filter(Boolean);
    return parts.length ? parts.join(", ") : shortName(j.display_name) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}
